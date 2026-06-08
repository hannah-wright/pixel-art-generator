/**
 * Replicate client for retro-diffusion/rd-fast.
 *
 * Falls back to returning the source image with a placeholder filter
 * if REPLICATE_API_TOKEN isn't set, so the UI is runnable in dev.
 */
import Replicate from "replicate";

const MODEL = "retro-diffusion/rd-fast";
const BG_REMOVE_MODEL = "851-labs/background-remover";

// rd-fast caps dimensions at 384 and prefers multiples of 8.
export const MAX_DIM = 384;
const STEP = 8;
const MIN_DIM = 64;

/**
 * Compute the output dimensions for generation.
 * - avatar mode: always square (384x384)
 * - photo mode: preserves input aspect ratio, long edge = 384,
 *   rounded to the nearest multiple of 8.
 */
export function computeOutputDimensions(
  inputWidth: number,
  inputHeight: number,
  mode: "avatar" | "photo"
): { width: number; height: number } {
  if (mode === "avatar") return { width: MAX_DIM, height: MAX_DIM };

  const w = Math.max(1, inputWidth);
  const h = Math.max(1, inputHeight);

  let outW: number;
  let outH: number;
  if (w >= h) {
    outW = MAX_DIM;
    outH = Math.round((MAX_DIM * h) / w / STEP) * STEP;
  } else {
    outH = MAX_DIM;
    outW = Math.round((MAX_DIM * w) / h / STEP) * STEP;
  }

  // Safety clamp
  outW = Math.max(MIN_DIM, Math.min(outW, MAX_DIM));
  outH = Math.max(MIN_DIM, Math.min(outH, MAX_DIM));
  return { width: outW, height: outH };
}

/**
 * Valid `style` values for retro-diffusion/rd-fast.
 * See: https://replicate.com/retro-diffusion/rd-fast
 */
export type RdFastStyle =
  | "default"
  | "simple"
  | "detailed"
  | "retro"
  | "game_asset"
  | "portrait"
  | "texture"
  | "ui"
  | "item_sheet"
  | "character_turnaround"
  | "1_bit"
  | "low_res"
  | "mc_item"
  | "mc_texture"
  | "no_style";

export interface GenerateInput {
  imageBase64: string; // data URL or base64 string
  prompt: string;
  style?: RdFastStyle;
  width?: number;
  height?: number;
  strength?: number;
  // Have rd-fast return the output with a transparent background so we
  // can composite any color the user picks afterward. Best results for
  // portrait / avatar generation where there's a clear subject.
  removeBg?: boolean;
  // Generate this many candidate images in one call so the caller can
  // score them and keep the best (filters out bad-seed outputs like
  // grayscale or botched bg removal). Defaults to 1.
  numImages?: number;
}

let client: Replicate | null = null;
if (process.env.REPLICATE_API_TOKEN) {
  client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
}

/**
 * Isolate the subject from the input photo by removing the background
 * with BRIA's RMBG model (hosted on Replicate as 851-labs/background-remover).
 * Returns a transparent-bg PNG buffer of just the subject.
 *
 * Why we do this BEFORE rd-fast: rd-fast's `remove_bg` param strips the
 * background from its OUTPUT, but the model still SEES the original
 * busy input and gets influenced by trees, other people, cluttered
 * rooms, etc. Pre-isolating gives the generator a clean subject to
 * work with and produces noticeably cleaner avatars.
 *
 * Cost: ~$0.002 per call. Dev fallback returns the input unchanged.
 */
export async function isolateSubject(
  imageDataUrl: string
): Promise<{ buffer: Buffer; dev?: boolean }> {
  if (!client) {
    // Dev fallback: decode the data URL back to bytes and return as-is.
    const base64 = imageDataUrl.split(",")[1] ?? "";
    return { buffer: Buffer.from(base64, "base64"), dev: true };
  }

  const output = await client.run(
    BG_REMOVE_MODEL as `${string}/${string}`,
    { input: { image: imageDataUrl } }
  );

  const url = extractFirstUrl(output);
  if (!url) {
    console.error(
      "[isolateSubject] unexpected output shape:",
      typeof output,
      JSON.stringify(output, replicateDebugReplacer).slice(0, 500)
    );
    throw new Error("Background removal failed");
  }

  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer };
}

/**
 * Second-pass background removal on an already-generated PNG buffer
 * (the chunky pixel art output). The chunky 8-color art has cleaner
 * subject/background color separation than the source photo, so BRIA
 * often catches leftover background that survived the first pass and
 * rd-fast's own remove_bg. Returns a transparent-bg PNG buffer.
 *
 * Returns null (not throws) on failure so callers can fall back to
 * the un-cleaned output.
 */
export async function removeBackgroundFromBuffer(
  pngBuffer: Buffer
): Promise<Buffer | null> {
  if (!client) return null;
  try {
    const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    const output = await client.run(
      BG_REMOVE_MODEL as `${string}/${string}`,
      { input: { image: dataUrl } }
    );
    const url = extractFirstUrl(output);
    if (!url) return null;
    const res = await fetch(url);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.warn(
      "[removeBackgroundFromBuffer] failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function generatePixelArt(
  input: GenerateInput
): Promise<{ urls: string[]; dev?: boolean }> {
  if (!client) {
    // Dev fallback: return the source image so the UI flow is testable
    // before API keys are wired up.
    return { urls: [input.imageBase64], dev: true };
  }

  // Defensive clamp: rd-fast caps dimensions at 384.
  const width = Math.min(input.width ?? MAX_DIM, MAX_DIM);
  const height = Math.min(input.height ?? MAX_DIM, MAX_DIM);

  // The Replicate schema names the param `style`; the underlying RD API also
  // accepts `prompt_style`. Sending both is safe; the unused one is ignored.
  const styleValue = input.style ?? "retro";
  const numImages = Math.max(1, Math.min(input.numImages ?? 1, 4));

  const output = await client.run(MODEL as `${string}/${string}`, {
    input: {
      prompt: input.prompt,
      input_image: input.imageBase64,
      style: styleValue,
      prompt_style: `rd_fast__${styleValue}`,
      width,
      height,
      num_images: numImages,
      strength: input.strength ?? 0.85,
      remove_bg: !!input.removeBg,
    },
  });

  const urls = extractAllUrls(output);
  if (urls.length === 0) {
    console.error(
      "[replicate] unexpected output shape:",
      typeof output,
      Array.isArray(output) ? "array" : "",
      JSON.stringify(output, replicateDebugReplacer).slice(0, 500)
    );
    throw new Error("Unexpected output format from Replicate");
  }
  return { urls };
}

/**
 * The Replicate Node SDK returns one of several shapes depending on the
 * model and SDK version:
 *  - a string URL
 *  - an array of string URLs
 *  - a FileOutput object (has a `.url` URL property or method)
 *  - an array of FileOutput objects
 * This walker pulls the first URL out of any of them.
 */
/**
 * Like extractFirstUrl but pulls EVERY url out of the output, for
 * num_images > 1 batches. Handles arrays of strings, arrays of
 * FileOutput objects, or a single value.
 */
function extractAllUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (value instanceof URL) return [value.toString()];

  if (Array.isArray(value)) {
    const urls: string[] = [];
    for (const item of value) {
      const u = extractFirstUrl(item);
      if (u) urls.push(u);
    }
    return urls;
  }

  // Single object (FileOutput etc.) - reuse the single extractor
  const single = extractFirstUrl(value);
  return single ? [single] : [];
}

function extractFirstUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof URL) return value.toString();

  if (Array.isArray(value)) {
    for (const item of value) {
      const u = extractFirstUrl(item);
      if (u) return u;
    }
    return null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // FileOutput from newer Replicate SDK: `url` may be a function or a URL/string
    if (typeof obj.url === "function") {
      try {
        const result = (obj.url as () => unknown)();
        return extractFirstUrl(result);
      } catch {
        // fall through
      }
    }
    if (obj.url) return extractFirstUrl(obj.url);

    // Some shapes wrap output under `.output`
    if (obj.output) return extractFirstUrl(obj.output);
  }

  return null;
}

// Replace ReadableStream / large blobs with a placeholder in debug logs
function replicateDebugReplacer(_key: string, val: unknown) {
  if (typeof val === "string" && val.length > 200) {
    return val.slice(0, 200) + "...";
  }
  if (val && typeof val === "object" && "constructor" in val) {
    const name = (val as { constructor?: { name?: string } }).constructor?.name;
    if (name === "ReadableStream" || name === "Blob") return `[${name}]`;
  }
  return val;
}
