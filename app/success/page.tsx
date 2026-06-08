import Link from "next/link";
import Stripe from "stripe";
import sharp from "sharp";
import {
  getSignedDownloadUrl,
  downloadPng,
  objectExists,
  uploadPng,
} from "@/lib/r2";
import { flattenWithBackground } from "@/lib/watermark";
import { renderBandsBuffer, renderStudioBuffer } from "@/lib/backgrounds";

interface PageProps {
  searchParams: Promise<{ session_id?: string; dev?: string }>;
}

interface DownloadItem {
  token: string;
  downloadUrl: string;
  displayUrl: string;
}

interface DownloadInfo {
  items: DownloadItem[];
  error: string | null;
}

/**
 * For one token, mint a signed R2 URL. For avatar mode with a non-
 * transparent bgColor, composite the stored transparent PNG onto the
 * chosen scene/color first and cache the result.
 */
async function resolveTokenToUrls(
  token: string,
  mode: string,
  bgColor: string
): Promise<DownloadItem | null> {
  const transparentKey = `previews/${token}.png`;
  const safeColor = bgColor.replace(/[^a-z0-9]/gi, "_");
  const finalKey = `final/${token}-${safeColor}.png`;

  const needsComposite =
    mode === "avatar" && bgColor && bgColor !== "transparent";
  let deliverableKey = transparentKey;

  if (needsComposite) {
    deliverableKey = finalKey;
    const already = await objectExists(finalKey);
    if (!already) {
      const transparent = await downloadPng(transparentKey);
      if (!transparent) return null;

      let composited: Buffer;
      if (bgColor === "beach" || bgColor === "studio") {
        const meta = await sharp(transparent).metadata();
        const w = meta.width ?? 768;
        const h = meta.height ?? 768;
        const sceneBuffer =
          bgColor === "beach"
            ? await renderBandsBuffer(w, h)
            : await renderStudioBuffer(w, h);
        composited = await sharp(sceneBuffer)
          .composite([{ input: transparent, blend: "over" }])
          .png()
          .toBuffer();
      } else {
        composited = await flattenWithBackground(transparent, bgColor);
      }

      await uploadPng(finalKey, composited);
    }
  }

  const downloadUrl = await getSignedDownloadUrl(
    deliverableKey,
    3600,
    "pixel-art.png"
  );
  const displayUrl = await getSignedDownloadUrl(deliverableKey, 3600);
  if (!downloadUrl || !displayUrl) return null;

  return { token, downloadUrl, displayUrl };
}

async function getDownloadInfo(
  sessionId: string | undefined
): Promise<DownloadInfo> {
  if (!sessionId) return { items: [], error: null };
  if (!process.env.STRIPE_SECRET_KEY) return { items: [], error: null };

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return {
        items: [],
        error: "Payment is still processing. Refresh in a few seconds.",
      };
    }

    const mode = session.metadata?.mode ?? "";
    const sharedBg = session.metadata?.bgColor ?? "transparent";
    const count = parseInt(session.metadata?.count ?? "0", 10);

    // Read token_N + bg_N pairs from metadata. Each image has its
    // own background color. Falls back to bg_N -> sharedBg -> legacy
    // single `token` field for historic sessions.
    const pairs: { token: string; bgColor: string }[] = [];
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const t = session.metadata?.[`token_${i}`];
        if (!t) continue;
        const bg = session.metadata?.[`bg_${i}`] ?? sharedBg;
        pairs.push({ token: t, bgColor: bg });
      }
    } else if (session.metadata?.token) {
      pairs.push({ token: session.metadata.token, bgColor: sharedBg });
    }

    if (pairs.length === 0) {
      return {
        items: [],
        error: "No download tokens found on this purchase.",
      };
    }

    const resolved = await Promise.all(
      pairs.map((p) => resolveTokenToUrls(p.token, mode, p.bgColor))
    );
    const items = resolved.filter((x): x is DownloadItem => x !== null);

    if (items.length === 0) {
      return {
        items: [],
        error: "Could not find your generated images. Contact support.",
      };
    }

    return { items, error: null };
  } catch (err) {
    console.error("[success] error retrieving session:", err);
    return {
      items: [],
      error: "Could not retrieve your downloads. Try refreshing.",
    };
  }
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { items, error } = await getDownloadInfo(params.session_id);

  const count = items.length;
  const isPlural = count > 1;

  return (
    <div className="flex flex-col flex-1">
      <header className="w-full border-b-[3px] border-ink">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-pixel text-2xl md:text-3xl tracking-wide"
          >
            Pixel Art Avatar
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 text-center">
        <div className="font-pixel text-5xl md:text-6xl mb-3">▸ paid!</div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {isPlural ? `Your ${count} pixel art masterpieces are ready` : "Your pixel art is ready"}
        </h1>
        <p className="text-muted mb-8">
          {isPlural
            ? "Download each one below. Links work for the next hour."
            : "Tap below to download. Link works for the next hour."}
        </p>

        {error && (
          <div className="card-chunky bg-cream text-left mb-6">
            <p className="text-blue font-bold mb-1">⚠ {error}</p>
            <p className="text-sm text-muted">
              If this keeps happening, contact support with your Stripe
              receipt and we&apos;ll get you your files.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-8 mb-8">
            {items.map((item, i) => (
              <div key={item.token} className="text-center">
                {isPlural && (
                  <p className="text-xs font-bold uppercase tracking-wide mb-2 text-muted">
                    {i + 1} of {count}
                  </p>
                )}
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.displayUrl}
                    alt={`Pixel art ${i + 1}`}
                    className="card-chunky w-full max-w-md mx-auto"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <a
                  href={item.downloadUrl}
                  download={
                    isPlural ? `pixel-art-${i + 1}.png` : "pixel-art.png"
                  }
                  className="btn-chunky btn-blue text-lg inline-block"
                >
                  Download {isPlural ? `#${i + 1}` : ""} →
                </a>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <p className="text-sm text-muted mb-8">
            Stripe will email your payment receipt separately. The
            download links above work for the next hour.
          </p>
        )}

        {items.length === 0 && !error && (
          <div className="card-chunky bg-cream text-left mb-8">
            <p className="font-bold mb-2">No download links?</p>
            <p className="text-sm text-muted">
              If you completed payment, refresh the page. If it still
              doesn&apos;t show, check the URL has a <code>session_id</code>{" "}
              parameter from Stripe.
            </p>
          </div>
        )}

        <Link href="/" className="btn-chunky btn-ghost">
          Make another →
        </Link>
      </main>
    </div>
  );
}
