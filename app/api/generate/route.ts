/**
 * POST /api/generate
 * Accepts: multipart/form-data with `image`, `style`, `mode`
 * Returns: { previewUrl, previewsUsed } or 429 if rate limited.
 *
 * Layered defenses:
 *  1. Upload validation (size, mime)
 *  2. Turnstile token check (when configured)
 *  3. IP-based rate limit (Upstash)
 *  4. Calls Replicate to generate
 *  5. Watermarks the output server-side
 *  6. Returns a data URL (or R2 URL when wired up)
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  generatePixelArt,
  isolateSubject,
  removeBackgroundFromBuffer,
  RdFastStyle,
} from "@/lib/replicate";
import { scoreCandidate } from "@/lib/imageScore";
import {
  analyzeFace,
  attributesToPromptFragment,
} from "@/lib/faceAnalysis";
import {
  findSubjectBbox,
  cropSquareAroundBbox,
  binarizeAlpha,
  gateAlphaToMask,
} from "@/lib/smartCrop";
import {
  watermarkPng,
  upscalePixelArt,
  quantizePalette,
} from "@/lib/watermark";
import { checkPreviewLimit, FREE_PREVIEWS_PER_DAY } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  VERIFIED_COOKIE,
  VERIFIED_TTL_SECONDS,
  signVerified,
  isVerified,
} from "@/lib/verifiedCookie";
import { uploadPng } from "@/lib/r2";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/**
 * One default config per mode. Generation happens at a small resolution
 * (where rd-fast produces visibly chunky pixels), then we upscale 6x
 * with nearest-neighbor for delivery so the pixel grid stays crisp.
 */
interface ModeConfig {
  style: RdFastStyle;
  prompt: string;
  // Generation size on the long edge. Smaller = chunkier pixels.
  genLongEdge: number;
  // Final delivered size on the long edge after nearest-neighbor upscale.
  deliverLongEdge: number;
  // Number of colors to quantize down to. More colors = more
  // dimensional shading (hair highlights, skin tones). Fewer colors
  // = flatter, simpler look.
  paletteColors: number;
  // img2img denoise strength. LOWER = stays faithful to the input
  // photo (pose, baldness, colors preserved). HIGHER = model
  // reimagines more freely (more stylized but more inconsistent).
  // Independent of chunkiness, which comes from genLongEdge +
  // paletteColors.
  strength: number;
}

const AVATAR_CONFIG: ModeConfig = {
  // `portrait` is rd-fast's preset specifically tuned for character
  // portraits.
  style: "portrait",
  // CryptoPunk / SNES NPC style: very blocky generic-looking video
  // game characters, NOT realistic portraits. Prompt kept short and
  // focused after a stretch of over-engineering taught us that piling
  // on per-attribute "MUST preserve exactly" directives was making
  // the model worse, not better (cross-attention budget gets diluted
  // and the model stops obeying any single rule).
  //
  // What we keep here:
  //   - CryptoPunk anchor at the front (style direction)
  //   - Vibrant color enforcement (against grayscale drift)
  //   - Standardized eye look (dark pupil + cream sclera)
  //   - Head-and-shoulders composition (against cut-off chin)
  //   - Identity essentials come from the face-analysis fragment
  //     that gets spliced in below (gender, hair-or-bald, beard,
  //     glasses, skin tone)
  //
  // What we DON'T put here anymore:
  //   - Face shape, eye color, age, expression details (no room
  //     for these to render at 64px and they fight the chunky look)
  //   - Long lists of "MUST preserve" with caps emphasis everywhere
  //   - Long lists of NO directives for failure modes we haven't
  //     actually seen recur
  prompt:
    "single isolated chunky blocky pixel art character avatar, exactly one stylized retro video game NPC alone (no other characters, no scenery, no signs, no furniture, no objects in frame), like a CryptoPunk NFT portrait, very simple low-resolution character portrait, NOT a realistic portrait, NOT a detailed illustration, NOT a scene with the character in it, flat solid color blocks only with vibrant warm colors (skin must be a realistic human skin tone - peach, tan, brown, or similar - NEVER blue, green, purple, or any unnatural tint - plus distinct hair color, distinct clothing color), strong dark outline around silhouette and features, simple geometric facial features (small dark pupil dots on small subtle cream sclera, simple line for mouth, basic nose suggestion, small subtle ears that sit flat against the head), head facing directly forward toward the camera with both eyes equally visible and a mirror-symmetric face (strict front view, NOT turned to the side, NOT a three-quarter angle, NOT a profile view), head and shoulders portrait composition (show entire face from top of head to chin plus visible shoulders), preserve the source person's identity essentials exactly as described below, adult character minimum age 21 visually, subtle closed-mouth smile, very blocky big visible pixels, fully transparent background behind the character (just empty alpha, no scene at all, no walls, no signs, no wooden objects, no furniture, no plants, no other characters or people), NO realistic shading, NO subtle gradients, NO fine details, NO photo-realistic rendering, NO indie-game illustration style, NO grayscale or monochrome output (use full color), NO adding hair (of any color including gray) on a bald or shaved or buzzed head, NO side view, NO profile view, NO three-quarter angle, NO head turned to the left or right, NO asymmetric face (both eyes must be equally visible at the same height), NO removing glasses if source has them, NO changing the beard color (red beards must stay orange-red), NO open-mouth grin, NO teeth showing, NO wrong gender rendering, NO bulging or exaggerated ears that stick out from the head, NO picture frame, NO painting frame, NO mat board or border rectangle around the character (the character is the entire output, not a portrait inside a frame), NO blue or green or purple skin tones, NO added scenery or backdrop, NO signs or wooden boards, NO additional objects in the frame",
  // 64 native + 12x upscale to 768. Much chunkier than 96. At this
  // size facial features are ~3-5 pixels each, which forces the
  // model into the simple geometric NPC look rather than trying
  // to be a realistic portrait. Matches the CryptoPunk reference.
  genLongEdge: 64,
  deliverLongEdge: 768,
  // 8 colors: tight NES-style palette. Forces fully flat color
  // blocks (no room for subtle shading or gradients). 10 was
  // allowing too much "stylized portrait" variability between
  // runs; 8 keeps every output anchored in chunky NPC territory.
  paletteColors: 8,
  // 0.8: middle ground. Higher strength (0.85) gave the chunky blocky
  // NPC look but let the model reimagine proportions too freely, so it
  // narrowed/idealized the face and build away from the real person.
  // Lower strength (0.7) kept proportions faithful but traced too much
  // realistic detail and lost the blocky look. 0.8 keeps most of the
  // chunkiness (which comes mainly from genLongEdge + paletteColors,
  // not strength) while staying truer to the source person's actual
  // proportions. Best-of-N scoring still catches bad-seed drift.
  strength: 0.8,
};

const PHOTO_CONFIG: ModeConfig = {
  style: "low_res",
  prompt:
    "pixel art scene, preserve original colors, flat color regions, bold outlines, no shading gradients, chunky low-resolution pixels",
  genLongEdge: 96,
  deliverLongEdge: 768,
  // Photos (landscapes, food, scenery) read fine with a tighter
  // palette since they don't need facial-feature shading.
  paletteColors: 12,
  // Photos benefit from more stylization since there's no specific
  // person to keep faithful to, so keep strength higher.
  strength: 0.85,
};

/**
 * Compute aspect-preserving generation size with a max long edge.
 * Rounded to multiples of 8 (rd-fast prefers it) and clamped >= 64.
 */
function computeGenSize(
  inputW: number,
  inputH: number,
  longEdge: number,
  mode: "avatar" | "photo"
): { width: number; height: number } {
  if (mode === "avatar") return { width: longEdge, height: longEdge };
  const w = Math.max(1, inputW);
  const h = Math.max(1, inputH);
  let outW: number;
  let outH: number;
  if (w >= h) {
    outW = longEdge;
    outH = Math.round((longEdge * h) / w / 8) * 8;
  } else {
    outH = longEdge;
    outW = Math.round((longEdge * w) / h / 8) * 8;
  }
  outW = Math.max(64, Math.min(outW, longEdge));
  outH = Math.max(64, Math.min(outH, longEdge));
  return { width: outW, height: outH };
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const mode = String(formData.get("mode") || "");
    const turnstileToken = String(formData.get("turnstile") || "") || null;

    // 1. Upload validation
    if (!image) {
      return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
    }
    if (!ALLOWED.includes(image.type)) {
      return NextResponse.json(
        { error: "Please use a JPG, PNG, or WebP image." },
        { status: 400 }
      );
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image too large. Max 8 MB." },
        { status: 400 }
      );
    }

    // 2. Bot check. A browser that already passed Turnstile recently
    //    carries a signed "verified" cookie (set on success below), so
    //    follow-up generations like Regenerate don't have to solve it
    //    again. First-time generations still must pass Turnstile. The IP
    //    rate limit below caps total generations either way.
    const ip = getClientIp(req);
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    const alreadyVerified =
      !!turnstileSecret &&
      isVerified(req.cookies.get(VERIFIED_COOKIE)?.value, turnstileSecret);
    if (!alreadyVerified) {
      const verified = await verifyTurnstile(turnstileToken, ip);
      if (!verified.success) {
        return NextResponse.json(
          { error: "Bot check failed." },
          { status: 403 }
        );
      }
    }

    // 3. Rate limit by IP (skipped for the owner via signed cookie)
    const ownerCookie = req.cookies.get("pps_owner")?.value?.trim();
    const ownerBypass = process.env.OWNER_BYPASS_TOKEN?.trim();
    const isOwner =
      !!ownerCookie && !!ownerBypass && ownerCookie === ownerBypass;

    let previewsUsed = 0;
    if (!isOwner) {
      const rl = await checkPreviewLimit(ip);
      if (!rl.success) {
        return NextResponse.json(
          {
            error: "Out of free previews for today.",
            limit: FREE_PREVIEWS_PER_DAY,
          },
          { status: 429 }
        );
      }
      previewsUsed = FREE_PREVIEWS_PER_DAY - rl.remaining;
    }

    // 4. Pick the single default config for this mode
    const config = mode === "avatar" ? AVATAR_CONFIG : PHOTO_CONFIG;

    // 5. Convert upload to bytes. For avatar mode, center-crop to a
    //    square before sending to the model. Otherwise rd-fast will
    //    resize a landscape (or portrait) photo into its square output
    //    frame and the subject ends up horizontally / vertically
    //    compressed. Center-crop keeps the subject's real proportions.
    let bytes = Buffer.from(await image.arrayBuffer());

    // Identity attributes (gender, hair, distinctive features) get
    // spliced into the rd-fast prompt below for avatar mode.
    let faceFragment = "";

    // The known-good transparent subject mask from the first-pass
    // isolation. Reused after generation to mechanically clean the
    // background instead of trusting a photo-trained remover on
    // chunky pixel art. Null if isolation failed (fallback path).
    let subjectMaskPng: Buffer | null = null;

    if (mode === "avatar") {
      // 5a. Subject-aware crop. Isolate the subject FIRST, find the
      //     bbox of non-transparent pixels (where the actual person
      //     is), then crop the original photo to a square centered
      //     on the subject with ~20% padding.
      //
      // This fixes the failure mode where someone uploads a wide
      // shot (full body, museum photo, group shot) and a blind
      // center-crop keeps the background and chops off the subject.
      // With smart crop, the model sees the subject filling the
      // frame regardless of source composition.
      //
      const preDataUrl = `data:${image.type};base64,${bytes.toString("base64")}`;

      // Kick off face analysis in PARALLEL with subject isolation.
      // LLaVA is the slowest, most variable upstream call, so
      // overlapping it with isolation keeps it off the critical path
      // and is the main lever for finishing under the 60s function
      // limit. We analyze the original (uncropped) photo so it doesn't
      // have to wait for isolation + crop first. Tradeoff: on very
      // zoomed-out shots the face is small here, but likeness is mostly
      // carried by the subject-aware crop fed to rd-fast, not by these
      // supplementary attributes.
      const faceAttrsPromise = analyzeFace(preDataUrl).catch((err) => {
        console.warn(
          "[generate] face analysis failed:",
          err instanceof Error ? err.message : err
        );
        return null;
      });

      const isolateResult = await isolateSubject(preDataUrl).catch(
        (err) => {
          console.warn(
            "[generate] subject isolation failed:",
            err instanceof Error ? err.message : err
          );
          return null;
        }
      );

      if (isolateResult && !isolateResult.dev) {
        // Binarize the alpha mask immediately. BRIA sometimes leaves
        // textured backgrounds at low-but-nonzero alpha (uncertain
        // pixels), which then leak through the compositing step and
        // get pixel-arted by rd-fast as brick walls / textures. Hard
        // binarization eliminates the in-between zone: every pixel
        // is either fully kept or fully dropped.
        const cleanedIsolated = await binarizeAlpha(isolateResult.buffer).catch(
          () => isolateResult.buffer
        );

        const bbox = await findSubjectBbox(cleanedIsolated);
        if (bbox) {
          try {
            // Crop the cleaned isolated transparent PNG to a
            // subject-centered square, so the rd-fast input and the
            // reuse mask share the same framing.
            const croppedIsolated = await cropSquareAroundBbox(
              cleanedIsolated,
              bbox
            );
            // Keep this cropped transparent subject as the mask for
            // post-generation background gating. Its framing matches
            // what rd-fast sees, so it aligns with the output.
            subjectMaskPng = croppedIsolated;
            // The deliverable to rd-fast is the cropped isolated
            // subject composited onto neutral grey (rd-fast img2img
            // works on RGB).
            const flat = await sharp(croppedIsolated)
              // Warm pale cream (vs cool grey) so the dominant
              // surrounding color hint to rd-fast isn't desaturated.
              // Grey backgrounds pushed outputs toward monochrome.
              .flatten({ background: { r: 240, g: 232, b: 215 } })
              .jpeg({ quality: 92 })
              .toBuffer();
            bytes = Buffer.from(flat);
          } catch (err) {
            console.warn(
              "[generate] subject-aware crop failed, falling back:",
              err instanceof Error ? err.message : err
            );
          }
        }
      }

      // Fallback path: if isolation or bbox detection failed, do a
      // blind center-crop to square so rd-fast still gets a square
      // input. Better than nothing.
      const fbMeta = await sharp(bytes).metadata();
      const fbW = fbMeta.width ?? 0;
      const fbH = fbMeta.height ?? 0;
      if (fbW > 0 && fbH > 0 && fbW !== fbH) {
        const side = Math.min(fbW, fbH);
        const left = Math.floor((fbW - side) / 2);
        const top = Math.floor((fbH - side) / 2);
        const cropped = await sharp(bytes)
          .extract({ left, top, width: side, height: side })
          .toBuffer();
        bytes = Buffer.from(cropped);
      }

      // Resolve the face analysis that's been running in parallel
      // since the top of this block, and splice its attributes into
      // the prompt below.
      const faceAttrs = await faceAttrsPromise;
      if (faceAttrs) {
        faceFragment = attributesToPromptFragment(faceAttrs);
        if (faceFragment) {
          console.log(
            "[generate] face attributes:",
            faceFragment.slice(0, 200)
          );
        }
      }
    }

    const mimeForReplicate = mode === "avatar" ? "image/jpeg" : image.type;
    const dataUrl = `data:${mimeForReplicate};base64,${bytes.toString("base64")}`;

    // 6. Compute small generation dimensions. Smaller = chunkier pixels
    //    once upscaled with nearest-neighbor for delivery.
    const meta = await sharp(bytes).metadata();
    const { width, height } = computeGenSize(
      meta.width ?? config.genLongEdge,
      meta.height ?? config.genLongEdge,
      config.genLongEdge,
      mode === "avatar" ? "avatar" : "photo"
    );

    // 7. Build the final prompt. For avatar mode we splice the
    //    face-analysis attributes in as preservation context so
    //    the model knows what distinctive features to keep
    //    (glasses, beard, baldness, gender, hair color). Phrased
    //    so the chunky CryptoPunk style stays primary: features
    //    are included IN the blocky character, not used to push
    //    toward realism.
    const finalPrompt = faceFragment
      ? `${config.prompt}, include these source-person identity markers IN the chunky blocky 8-bit NPC character (do NOT use these as an excuse to render more detail or more realism, just make sure the blocky character has these features): ${faceFragment}, output stays very chunky blocky CryptoPunk/SNES NPC style throughout`
      : config.prompt;

    // 8. Generate. For avatar mode we request 3 candidates and keep
    //    the best-scoring one (filters out bad-seed grayscale /
    //    side-facing / botched-bg outputs). More candidates = better
    //    odds the orientation-aware scorer has a clean front-facing
    //    option to pick. Single rd-fast call regardless of count, so
    //    latency barely changes. Photo mode just does 1.
    const numImages = mode === "avatar" ? 3 : 1;
    const { urls: rawUrls, dev } = await generatePixelArt({
      imageBase64: dataUrl,
      prompt: finalPrompt,
      style: config.style,
      width,
      height,
      strength: config.strength,
      removeBg: mode === "avatar",
      numImages,
    });

    // 8b. Download every candidate, mechanically clean each one's
    //     background against the known-good subject mask, then score
    //     and keep the best. Mask-gating is deterministic and far
    //     more reliable than re-running a photo-trained bg remover on
    //     chunky pixel art (which kept leaving background chunks).
    //     Scoring is now orientation-aware, so a side-facing
    //     candidate loses to a symmetric front-facing one.
    let smallClean: Buffer;
    if (dev) {
      smallClean = bytes;
    } else {
      const candidates = await Promise.all(
        rawUrls.map(async (u) => {
          const res = await fetch(u);
          return Buffer.from(await res.arrayBuffer());
        })
      );

      // Gate each candidate's alpha to the subject mask when we have
      // one (avatar mode with successful isolation). Falls back to
      // the raw candidate if gating throws.
      const cleaned = subjectMaskPng
        ? await Promise.all(
            candidates.map((c) =>
              gateAlphaToMask(c, subjectMaskPng!).catch(() => c)
            )
          )
        : candidates;

      if (cleaned.length === 1) {
        smallClean = cleaned[0];
      } else {
        const scored = await Promise.all(
          cleaned.map(async (buf) => ({
            buf,
            score: await scoreCandidate(buf).catch(() => 0),
          }))
        );
        scored.sort((a, b) => b.score - a.score);
        smallClean = scored[0].buf;
        console.log(
          "[generate] candidate scores:",
          scored.map((s) => s.score.toFixed(3)).join(", ")
        );
      }

      // Fallback only: if isolation failed we have no mask, so fall
      // back to a best-effort BRIA second pass on the chosen output.
      if (mode === "avatar" && !subjectMaskPng) {
        const briaCleaned = await removeBackgroundFromBuffer(smallClean);
        if (briaCleaned) smallClean = briaCleaned;
      }
    }

    // 9. Quantize the palette so the output reads as flat-colored
    //    pixel art instead of a fuzzy gradient image. Done BEFORE
    //    upscale so each color region becomes one solid block once
    //    enlarged.
    const quantized = await quantizePalette(smallClean, config.paletteColors);

    // 10. Upscale with nearest-neighbor so the pixel grid stays crisp.
    //     The deliverable PNG (R2 storage AND the watermarked preview)
    //     is the upscaled version.
    const cleanBuffer = await upscalePixelArt(quantized, config.deliverLongEdge);

    // 11. Stash the deliverable in R2 under a unique token. The token
    //     rides through Stripe Checkout metadata so the webhook can mint
    //     a signed download URL after payment.
    const token = randomUUID();
    const r2Key = `previews/${token}.png`;
    const r2Ok = await uploadPng(r2Key, cleanBuffer);

    // 12. Watermark for the in-browser preview only.
    const watermarked = await watermarkPng(cleanBuffer);
    const previewUrl = `data:image/png;base64,${watermarked.toString("base64")}`;

    const response = NextResponse.json({
      previewUrl,
      token: r2Ok ? token : null,
      previewsUsed: previewsUsed + 1,
      dev: !!dev,
    });
    // Mark this browser verified so Regenerate (and any generation in
    // the next couple of hours) skips the bot check. Only when Turnstile
    // is actually configured.
    if (turnstileSecret) {
      response.cookies.set(VERIFIED_COOKIE, signVerified(turnstileSecret), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: VERIFIED_TTL_SECONDS,
      });
    }
    return response;
  } catch (err) {
    // A short trace ID so support can find the exact log entry in
    // Vercel when a user reports a failure.
    const traceId = randomUUID().slice(0, 8);

    // Always log the raw error with the trace ID so it can be looked up.
    console.error(`[generate] error trace=${traceId}:`, err);
    if (err instanceof Error && err.stack) {
      console.error(`[generate] stack trace=${traceId}:`, err.stack);
    }

    const raw = err instanceof Error ? err.message : String(err);
    const lower = raw.toLowerCase();

    // Translate common upstream failures into user-safe copy so we
    // never leak Replicate URLs / status messages to the UI.
    let userMessage =
      "Something went wrong on our end. Please try regenerating in a moment.";
    let status = 500;

    if (
      lower.includes("429") ||
      lower.includes("too many requests") ||
      lower.includes("rate limit") ||
      lower.includes("throttled")
    ) {
      userMessage =
        "Lots of people are generating right now. Please wait a moment and try again.";
      status = 429;
    } else if (
      lower.includes("timeout") ||
      lower.includes("etimedout") ||
      lower.includes("network") ||
      lower.includes("econnreset") ||
      lower.includes("aborted")
    ) {
      userMessage =
        "The generator is taking too long. Please try again.";
      status = 504;
    } else if (
      lower.includes("401") ||
      lower.includes("403") ||
      lower.includes("unauthorized")
    ) {
      userMessage =
        "The generator is temporarily unavailable. Please try again in a minute.";
      status = 502;
    } else if (
      lower.includes("payment required") ||
      lower.includes("insufficient") ||
      lower.includes("billing") ||
      lower.includes("credit")
    ) {
      userMessage =
        "The generator is temporarily unavailable. Please try again later.";
      status = 502;
    } else if (
      lower.includes("500") ||
      lower.includes("502") ||
      lower.includes("503") ||
      lower.includes("504") ||
      lower.includes("internal server") ||
      lower.includes("bad gateway") ||
      lower.includes("service unavailable")
    ) {
      userMessage =
        "The generator is having a hiccup. Please try again in a moment.";
      status = 502;
    } else if (
      lower.includes("nsfw") ||
      lower.includes("content policy") ||
      lower.includes("inappropriate")
    ) {
      userMessage =
        "We couldn't process that image. Please try a different photo.";
      status = 400;
    } else if (
      lower.includes("input") &&
      (lower.includes("invalid") || lower.includes("validation"))
    ) {
      userMessage =
        "There was an issue with your photo. Please try a different one.";
      status = 400;
    }

    return NextResponse.json(
      { error: userMessage, traceId },
      { status }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
