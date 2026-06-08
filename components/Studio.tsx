"use client";

import { useState } from "react";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { UploadZone } from "./UploadZone";
import {
  BackgroundColorPicker,
  BACKGROUND_OPTIONS,
  bgValueToCss,
} from "./BackgroundColorPicker";
import { bundlePrice, formatUSD, MAX_BUNDLE_SIZE } from "@/lib/pricing";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface StudioProps {
  title: string;
  subtitle: string;
  mode: "avatar" | "photo";
  /** Optional callout below the subtitle (e.g. pointing photo users
   *  at the avatar tool for headshots). */
  redirectNote?: React.ReactNode;
}

type Stage = "upload" | "ready" | "generating" | "preview";

export function Studio({
  title,
  subtitle,
  mode,
  redirectNote,
}: StudioProps) {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  // Each generation has its OWN background color, keyed by token.
  // The picker writes to the currently active token's slot. New
  // generations default to 'studio'. This means user can pick beach
  // for one avatar and blue for another, and both choices carry
  // through to the downloaded files.
  const [bgColorByToken, setBgColorByToken] = useState<
    Record<string, string>
  >({});
  const DEFAULT_BG = BACKGROUND_OPTIONS[0].value;
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultToken, setResultToken] = useState<string | null>(null);
  // Every successful generation gets appended here so the user can
  // flip back to a previous attempt without spending another AI call.
  // R2 already stores each one under its unique token, so any item
  // here is also valid for download / Stripe metadata.
  const [history, setHistory] = useState<
    { token: string; previewUrl: string }[]
  >([]);
  // Tokens the user has chosen to BUY. The Download button bundles
  // these into one Stripe checkout. Most recent generation auto-fills
  // this as a 1-item "cart" by default; clicking other thumbnails
  // adds them, clicking the × badge removes.
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(
    new Set()
  );
  // previewsUsed is parsed from the response but not shown while the
  // rate limit is loose (re-add display when limit is restored).
  const [, setPreviewsUsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Bumping this key forces the Turnstile widget to re-render and mint
  // a fresh token. Each token is single-use, so we reset after every
  // generation.
  const [turnstileKey, setTurnstileKey] = useState(0);

  // Helper: what bg color is currently selected for the active image?
  const currentBgColor =
    (resultToken && bgColorByToken[resultToken]) || DEFAULT_BG;

  // Helper: set the bg color for the currently active image.
  const setCurrentBgColor = (color: string) => {
    if (!resultToken) return;
    setBgColorByToken((prev) => ({ ...prev, [resultToken]: color }));
  };

  // Helper: look up the bg color for any token (used to render
  // thumbnails on their own bg).
  const bgForToken = (token: string) => bgColorByToken[token] || DEFAULT_BG;

  const handleFile = (f: File) => {
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    setStage("ready");
  };

  const handleGenerate = async (isRegenerate = false) => {
    if (!file) return;
    // The first generation must pass the bot check. Regenerate rides on
    // the server-set "verified" cookie from that first pass, so it
    // doesn't need its own token.
    if (!isRegenerate && TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please wait a moment for the bot check to complete, then try again.");
      return;
    }
    setError(null);
    setStage("generating");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("mode", mode);
      if (turnstileToken) formData.append("turnstile", turnstileToken);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      // Whether the request succeeded or failed, the Turnstile token has
      // now been consumed. Force a fresh one for next time.
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);

      if (res.status === 429) {
        setError(
          "You've used your free previews for today. Pay $5 to download what you've got, or come back tomorrow."
        );
        setStage("preview");
        return;
      }

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        if (data.error) throw new Error(data.error);
        // No JSON error body means our route handler never returned
        // (it always sends { error }). That points to a platform-level
        // failure - usually a Vercel function timeout (504) on a slow
        // cold start. Surface the status so the failure is diagnosable
        // instead of collapsing every cause into one generic message.
        throw new Error(
          res.status === 504 || res.status === 502
            ? "The generator timed out. Please try again (the next run is usually faster)."
            : `Generation failed (status ${res.status}). Try again.`
        );
      }

      const data = await res.json();
      setResultUrl(data.previewUrl);
      setResultToken(data.token ?? null);
      setPreviewsUsed(data.previewsUsed ?? 0);
      if (data.token && data.previewUrl) {
        setHistory((h) => [
          ...h,
          { token: data.token, previewUrl: data.previewUrl },
        ]);
        // Don't auto-add to the cart. Previews are free; the user
        // explicitly adds an image only if they like it and want the
        // clean download. Keeps the experience welcoming, not pushy.
        // Seed this token's bg to the default so it renders correctly
        // and the user can recolor THIS image without affecting others.
        setBgColorByToken((prev) =>
          prev[data.token] ? prev : { ...prev, [data.token]: DEFAULT_BG }
        );
      }
      setStage("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("ready");
    }
  };

  const handlePay = async () => {
    const tokens = Array.from(selectedTokens);
    if (tokens.length === 0) {
      setError("Pick at least one image to download.");
      return;
    }
    if (tokens.length > MAX_BUNDLE_SIZE) {
      setError(`Maximum ${MAX_BUNDLE_SIZE} images per purchase.`);
      return;
    }
    // Bundle each token with its own selected background color so
    // the /success page can composite each one independently.
    const items = tokens.map((token) => ({
      token,
      bgColor: bgForToken(token),
    }));
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          mode,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Couldn't start checkout. Try again.");
      }
    } catch {
      setError("Couldn't start checkout. Try again.");
    }
  };

  const reset = () => {
    setStage("upload");
    setFile(null);
    setFilePreview(null);
    setResultUrl(null);
    setResultToken(null);
    setHistory([]);
    setSelectedTokens(new Set());
    setBgColorByToken({});
    setError(null);
  };

  /**
   * Click an image: show it in the big preview WITHOUT touching the
   * cart. Lets the user browse versions safely.
   */
  const viewHistoryItem = (entry: {
    token: string;
    previewUrl: string;
  }) => {
    setResultUrl(entry.previewUrl);
    setResultToken(entry.token);
    setError(null);
  };

  /**
   * Click the bottom +/✓ button: toggle ONLY the cart state for
   * that item. Doesn't change which one is in the big preview.
   * This is the only path to add/remove from cart, so accidental
   * clicks on the image itself can't mess up the cart.
   */
  const toggleCart = (token: string) => {
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(token)) {
        next.delete(token);
      } else if (next.size < MAX_BUNDLE_SIZE) {
        next.add(token);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="w-full border-b-[3px] border-ink">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-pixel text-2xl md:text-3xl tracking-wide"
          >
            Pixel Art Avatar
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link href="/avatar" className="hover:text-blue transition-colors">
              Pixel Avatar Maker
            </Link>
            <Link
              href="/photo-to-pixel-art"
              className="hover:text-blue transition-colors"
            >
              Image to Pixel Art
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-pixel text-5xl md:text-6xl mb-2">{title}</h1>
          <p className="text-lg text-muted">{subtitle}</p>
          {redirectNote && (
            <div className="mt-3 inline-block bg-cyan border-[2px] border-ink px-3 py-2 text-sm">
              {redirectNote}
            </div>
          )}
        </div>

        {/* Stage: upload */}
        {stage === "upload" && (
          <div>
            <UploadZone onFileSelected={handleFile} />
            <p className="mt-4 text-sm text-muted text-center">
              See how it looks - free. $5 if you want to keep it.
            </p>
          </div>
        )}

        {/* Stage: ready to generate */}
        {stage === "ready" && filePreview && (
          <div className="space-y-6">
            <div className="card-chunky">
              <div className="flex gap-4 items-start">
                <img
                  src={filePreview}
                  alt="Your photo"
                  className="w-24 h-24 object-cover border-[3px] border-ink"
                />
                <div className="flex-1">
                  <p className="font-bold mb-1">Your photo is ready</p>
                  <button
                    onClick={reset}
                    className="text-sm underline text-muted hover:text-ink"
                  >
                    ↺ Use a different photo
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-ink font-bold text-sm border-[3px] border-ink bg-cream rounded px-3 py-2">
                ⚠ {error}
              </p>
            )}

            {TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  key={turnstileKey}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(t) => setTurnstileToken(t)}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                  options={{ theme: "light", size: "flexible" }}
                />
              </div>
            )}

            <button
              onClick={() => handleGenerate(false)}
              disabled={!!TURNSTILE_SITE_KEY && !turnstileToken}
              className="btn-chunky btn-blue w-full text-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Generate free preview →
            </button>
          </div>
        )}

        {/* Stage: generating */}
        {stage === "generating" && (
          <div className="card-chunky text-center py-12">
            <div className="font-pixel text-4xl mb-6">▸ pixelifying...</div>
            <div className="loading-bar h-4 w-full max-w-md mx-auto border-[3px] border-ink" />
            <p className="mt-4 text-muted">
              Please wait (usually takes ~2 minutes). Your avatar will be
              ready soon!🌟
            </p>
          </div>
        )}

        {/* Stage: preview */}
        {stage === "preview" && (
          <div className="space-y-6">
            {resultUrl && (
              <div
                className="card-chunky w-full max-w-md mx-auto overflow-hidden"
                style={{
                  background: bgValueToCss(currentBgColor),
                  padding: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultUrl}
                  alt="Your pixel art preview"
                  className="block w-full"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
            )}

            {/* Friendly add-to-cart prompt for the image currently in
                view. Previews are free and never auto-added, so this is
                the inviting nudge to buy the clean (un-watermarked) PNG.
                Also the only add path when there's just one generation
                (the thumbnail strip below only appears for 2+). */}
            {resultUrl && resultToken && (
              <div className="w-full max-w-md mx-auto text-center">
                {selectedTokens.has(resultToken) ? (
                  <button
                    onClick={() => toggleCart(resultToken)}
                    className="btn-chunky btn-cyan w-full"
                    title="This one is in your cart. Click to remove it."
                  >
                    ✓ In your cart · tap to remove
                  </button>
                ) : (
                  <>
                    <p className="text-sm text-muted mb-2">
                      Like this one and want to download it (no watermark)?
                      Yours for{" "}
                      <strong className="text-ink">
                        {formatUSD(
                          bundlePrice(selectedTokens.size + 1).totalCents -
                            bundlePrice(selectedTokens.size).totalCents
                        )}
                      </strong>
                      .
                    </p>
                    <button
                      onClick={() => toggleCart(resultToken)}
                      className="btn-chunky btn-cyan w-full"
                    >
                      + Add to cart
                    </button>
                  </>
                )}
              </div>
            )}

            {history.length > 1 && (
              <div className="w-full max-w-md mx-auto">
                <p className="text-sm mb-1">
                  <span className="font-bold">Your generations</span>
                </p>
                <p className="text-xs text-muted mb-3">
                  Click an image to view it. To buy it, click the
                  &quot;Add to cart&quot; button under that image.
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1">
                  {history.map((entry, i) => {
                    const isSelected = selectedTokens.has(entry.token);
                    const isActive = entry.token === resultToken;
                    return (
                      <div
                        key={entry.token}
                        className={`relative flex-shrink-0 w-32 border-[3px] overflow-hidden transition-all ${
                          isSelected
                            ? "border-cyan shadow-[3px_3px_0_0_#0a0a0a]"
                            : "border-ink"
                        }`}
                      >
                        {/* Image area - tap to view in big preview.
                            Does NOT change cart state. */}
                        <button
                          onClick={() => viewHistoryItem(entry)}
                          aria-label={`View generation ${i + 1}`}
                          title="Click to view this version"
                          className="block w-full relative"
                        >
                          <div
                            className="w-full h-24"
                            style={{
                              background: bgValueToCss(
                                bgForToken(entry.token)
                              ),
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={entry.previewUrl}
                              alt=""
                              className="block w-full h-full"
                              style={{ imageRendering: "pixelated" }}
                            />
                          </div>
                          {isActive && (
                            <div className="absolute top-0 inset-x-0 bg-ink text-paper text-[10px] font-bold uppercase tracking-wide text-center py-0.5">
                              ▸ Viewing
                            </div>
                          )}
                        </button>

                        {/* Cart toggle - this is the ONLY thing that
                            changes cart state. Much bigger and more
                            explicit so a non-technical user can't
                            miss what it does. */}
                        <button
                          onClick={() => toggleCart(entry.token)}
                          aria-label={
                            isSelected
                              ? `Remove generation ${i + 1} from cart`
                              : `Add generation ${i + 1} to cart`
                          }
                          aria-pressed={isSelected}
                          title={
                            isSelected
                              ? "This one is in your cart. Click to remove it."
                              : "Click to add this one to your cart."
                          }
                          className={`block w-full border-t-[2px] border-ink py-2.5 px-1 text-[11px] font-bold uppercase tracking-wide transition-colors leading-tight bg-cyan text-ink hover:bg-cyan/90`}
                        >
                          {isSelected ? (
                            <span className="flex flex-col items-center gap-0.5">
                              <span>✓ In cart</span>
                              <span className="text-[9px] font-normal opacity-90 normal-case">
                                tap to remove
                              </span>
                            </span>
                          ) : (
                            <span>+ Add to cart</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <BackgroundColorPicker
              selected={currentBgColor}
              onSelect={setCurrentBgColor}
            />

            {error && (
              <p className="text-ink font-bold text-sm border-[3px] border-ink bg-cream rounded px-3 py-2">
                ⚠ {error}
              </p>
            )}

            <div className="card-chunky bg-cream">
              {(() => {
                const cartCount = selectedTokens.size;
                const price = bundlePrice(cartCount);
                const buttonLabel =
                  cartCount === 0
                    ? "Add image(s) to cart to download →"
                    : cartCount === 1
                    ? `Checkout · ${formatUSD(price.totalCents)} →`
                    : `Checkout · ${formatUSD(price.totalCents)} for ${cartCount} →`;
                return (
                  <>
                    <p className="font-bold text-lg mb-1 flex items-center gap-2">
                      {/* Tiny cart icon for unmistakable cart context */}
                      <svg
                        viewBox="0 0 12 12"
                        shapeRendering="crispEdges"
                        className="w-5 h-5 flex-shrink-0"
                        aria-hidden="true"
                      >
                        <g fill="currentColor">
                          <rect x="0" y="2" width="1" height="1" />
                          <rect x="1" y="3" width="1" height="1" />
                          <rect x="2" y="3" width="8" height="4" />
                          <rect x="3" y="9" width="2" height="2" />
                          <rect x="8" y="9" width="2" height="2" />
                        </g>
                      </svg>
                      Your cart
                      {cartCount > 0 && (
                        <span className="text-muted font-normal text-sm">
                          ({cartCount} {cartCount === 1 ? "item" : "items"})
                        </span>
                      )}
                    </p>
                    <div className="mb-4">
                      <p className="text-sm text-muted">
                        {cartCount === 0 ? (
                          <>
                            Nothing in your cart yet. Found one you love? Add
                            it above to download the clean PNG (no watermark).
                          </>
                        ) : cartCount === 1 ? (
                          <>
                            <strong className="text-ink">
                              {formatUSD(price.totalCents)} total
                            </strong>{" "}
                            for the version shown above (clean PNG, no watermark).
                          </>
                        ) : (
                          <>
                            <strong className="text-ink">
                              {formatUSD(price.totalCents)} total
                            </strong>{" "}
                            for {cartCount} clean PNGs (no watermark)
                            {price.savedCents > 0 && (
                              <>
                                ,{" "}
                                <span className="bg-cyan text-ink font-bold px-1 rounded-sm">
                                  save {formatUSD(price.savedCents)}
                                </span>{" "}
                                vs buying separately
                              </>
                            )}
                            .
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        $5 per image. Tap any thumbnail above to add it to
                        your cart.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handlePay}
                        className={
                          cartCount === 0
                            ? "flex-1 text-lg font-bold inline-flex items-center justify-center px-6 py-3 rounded border-[3px] border-ink bg-[#d9d9d9] text-muted cursor-not-allowed"
                            : "btn-chunky btn-blue flex-1 text-lg"
                        }
                        disabled={cartCount === 0}
                      >
                        {buttonLabel}
                      </button>
                      <button
                        onClick={() => handleGenerate(true)}
                        className="btn-chunky btn-ghost flex-1"
                        title="Generate a new version of the same photo (uses one free preview)"
                      >
                        ↻ Regenerate
                      </button>
                    </div>
                    <p className="text-xs text-muted mt-2 text-center sm:text-right">
                      Heads up: each regenerate uses one free preview.
                    </p>
                  </>
                );
              })()}
              <div className="mt-3">
                <button
                  onClick={reset}
                  className="text-sm underline text-muted hover:text-ink"
                >
                  ↺ Use a different photo
                </button>
              </div>
              {/* No bot check here. Regenerate is covered by the
                  short-lived "verified" cookie the server set when the
                  first generation passed Turnstile. */}
              {/* Preview counter hidden while we iterate; re-enable when
                  the launch rate limit is restored. */}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
