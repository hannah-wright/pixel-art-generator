import Link from "next/link";
import { SiteFooter } from "./SiteFooter";
import { Faq, FaqItem } from "./Faq";

/**
 * Shared template for keyword-targeted long-tail landing pages
 * (Discord, Twitch, 8-bit, etc.). Each page passes its own copy; the
 * CTA funnels to the avatar generator. Indexable (no noindex) since the
 * whole point is to rank for buyer-intent searches.
 */
export function LandingPage({
  badge,
  h1,
  intro,
  bullets,
  faq,
}: {
  badge: string;
  h1: string;
  intro: string;
  bullets: string[];
  faq: FaqItem[];
}) {
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

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="inline-block mb-6 px-4 py-1 bg-cyan border-[3px] border-ink text-sm font-bold uppercase tracking-wider">
            ▸ {badge}
          </div>
          <h1 className="font-pixel text-5xl md:text-7xl leading-none mb-6">
            {h1}
          </h1>
          <p className="text-lg md:text-xl mb-8 text-muted max-w-2xl mx-auto">
            {intro}
          </p>
          <Link href="/avatar" className="btn-chunky btn-blue text-lg">
            Make yours free →
          </Link>

          <div className="mt-12 flex flex-col items-center">
            <div className="border-[3px] border-ink rounded shadow-[6px_6px_0_0_#0a0a0a] overflow-hidden w-full max-w-[280px] bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sample-avatar.png"
                alt="Example 90s pixel art avatar made from a photo"
                width={768}
                height={768}
                className="block w-full h-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          </div>

          <ul className="mt-10 inline-flex flex-col gap-2 text-left text-sm">
            {bullets.map((b) => (
              <li key={b}>▸ {b}</li>
            ))}
          </ul>
        </section>

        <Faq items={faq} />

        <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
          <Link href="/avatar" className="btn-chunky btn-blue text-lg">
            Try the pixel avatar maker free →
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
