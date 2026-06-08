import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";

const HOME_FAQ = [
  {
    q: "How do I turn a photo into a pixel art avatar?",
    a: "Upload any photo or selfie and Pixel Art Avatar turns it into a chunky 90s pixel art avatar in under two minutes. You get a free watermarked preview, and you can download the clean, watermark-free PNG for $5.",
  },
  {
    q: "Is there a free pixel avatar maker?",
    a: "Yes. Generating and previewing your pixel avatar is free. You only pay $5 if you want to download the clean version without the watermark.",
  },
  {
    q: "What is the best pixel avatar maker for profile pictures?",
    a: "Pixel Art Avatar is built specifically for profile pictures. It frames your face, renders a front-facing chunky 90s pixel avatar, and exports a square PNG sized for profile pics.",
  },
  {
    q: "Can I use my pixel avatar on Discord, Twitch, or X (Twitter)?",
    a: "Yes. The download is a square PNG that works as a profile picture on Discord, Twitch, X/Twitter, Slack, and anywhere else you need an avatar.",
  },
  {
    q: "Can I turn any image into pixel art, not just a face?",
    a: "Yes. The avatar tool is tuned for faces, and the photo-to-pixel-art tool turns any image, like landscapes, food, or scenery, into chunky 90s pixel art.",
  },
  {
    q: "How much does it cost?",
    a: "The preview is free. Downloading a clean, watermark-free image is $5 per image.",
  },
];

const WEB_APP_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Pixel Art Avatar",
  url: "https://pixelartavatar.com",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description:
    "Turn a photo into a chunky 90s pixel art avatar. A pixel avatar maker and photo-to-pixel-art tool. Free preview, $5 to download a clean PNG.",
  image: "https://pixelartavatar.com/sample-avatar.png",
  offers: {
    "@type": "Offer",
    price: "5.00",
    priceCurrency: "USD",
  },
};

export default function Home() {
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
            <Link href="/photo-to-pixel-art" className="hover:text-blue transition-colors">
              Image to Pixel Art
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-block mb-6 px-4 py-1 bg-cyan border-[3px] border-ink text-sm font-bold uppercase tracking-wider">
            ▸ Photo to pixel art &amp; pixel avatar maker
          </div>
          <h1 className="font-pixel text-6xl md:text-8xl leading-none mb-6">
            Turn your photo
            <br />
            into 90s pixel art.
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-muted max-w-2xl mx-auto">
            See how it looks - free.{" "}
            <span className="text-ink font-bold">$5 if you want to keep it.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/avatar" className="btn-chunky btn-blue text-lg">
              Make an avatar →
            </Link>
            <Link href="/photo-to-pixel-art" className="btn-chunky btn-ghost text-lg">
              Pixelify a scenic photo →
            </Link>
          </div>

          {/* Sample result so visitors see exactly what they'll get */}
          <div className="mt-16 flex flex-col items-center">
            <div className="font-pixel text-2xl md:text-3xl mb-3 flex items-center gap-2">
              <span aria-hidden="true">↓</span>
              <span>here&apos;s an example</span>
              <span aria-hidden="true">↓</span>
            </div>
            <div className="border-[3px] border-ink rounded shadow-[6px_6px_0_0_#0a0a0a] overflow-hidden w-full max-w-[300px] bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sample-avatar.png"
                alt="Example chunky 90s pixel art avatar generated from a photo"
                width={768}
                height={768}
                className="block w-full h-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <p className="text-sm text-muted mt-3">
              An actual avatar, made from a selfie in about two minutes.
            </p>
          </div>
        </section>

        {/* Two-up section choice */}
        <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8">
          <Link
            href="/avatar"
            className="card-chunky group hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#0a0a0a] transition-all"
          >
            <div className="font-pixel text-3xl mb-2 flex items-center gap-3">
              {/* Pixel-art person silhouette icon */}
              <svg
                viewBox="0 0 12 12"
                shapeRendering="crispEdges"
                className="w-8 h-8 flex-shrink-0"
                aria-hidden="true"
              >
                <g fill="currentColor">
                  <rect x="4" y="1" width="4" height="4" />
                  <rect x="2" y="6" width="8" height="6" />
                </g>
              </svg>
              <span>AVATAR</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">
              Pixel art avatar maker
            </h2>
            <p className="text-muted mb-4">
              Drop a headshot. Get a chunky 90s pixel avatar. Perfect for X /
              Twitter, Discord, and Slack.
            </p>
            <ul className="text-sm space-y-1 mb-6">
              <li>▸ Big visible pixels, 16-color palette</li>
              <li>▸ Retro video game character look</li>
              <li>▸ Ready in about a minute</li>
            </ul>
            <span className="font-bold text-blue group-hover:underline">
              Start free →
            </span>
          </Link>

          <Link
            href="/photo-to-pixel-art"
            className="card-chunky group hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#0a0a0a] transition-all"
          >
            <div className="font-pixel text-3xl mb-2 flex items-center gap-3">
              {/* Pixel-art mountain landscape icon */}
              <svg
                viewBox="0 0 12 12"
                shapeRendering="crispEdges"
                className="w-8 h-8 flex-shrink-0"
                aria-hidden="true"
              >
                <g fill="currentColor">
                  {/* Mountain peak */}
                  <rect x="5" y="2" width="2" height="1" />
                  <rect x="4" y="3" width="4" height="1" />
                  <rect x="3" y="4" width="6" height="1" />
                  <rect x="2" y="5" width="8" height="1" />
                  <rect x="1" y="6" width="10" height="1" />
                  <rect x="0" y="7" width="12" height="1" />
                  {/* Ground band */}
                  <rect x="0" y="9" width="12" height="3" />
                </g>
              </svg>
              <span>PHOTO TO PIXEL ART</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">Turn any image to pixel art</h2>
            <p className="text-muted mb-4">
              Landscapes, food, scenery, and more. Turn any scenic photo
              into chunky retro pixel art.
            </p>
            <ul className="text-sm space-y-1 mb-6">
              <li>▸ Big visible pixels, 16-color palette</li>
              <li>▸ Original aspect ratio preserved</li>
              <li>▸ Background color picker</li>
            </ul>
            <span className="font-bold text-blue group-hover:underline">
              Start free →
            </span>
          </Link>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="font-pixel text-4xl text-center mb-12">
            ▸ How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Drop a photo",
                desc: "Drag-and-drop or tap to upload. Any phone selfie works.",
              },
              {
                step: "02",
                title: "Generate a preview",
                desc: "One click. Watermarked preview in about a minute. Free.",
              },
              {
                step: "03",
                title: "Pay $5, download",
                desc: "Like it? Get the clean, watermark-free PNG instantly.",
              },
            ].map((s) => (
              <div key={s.step} className="card-chunky">
                <div className="font-pixel text-blue text-3xl mb-2">
                  {s.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-muted text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Popular uses: internal links to the long-tail landing pages
            (crawl paths + keyword-rich anchor text). */}
        <section className="max-w-4xl mx-auto px-6 pb-2 text-center">
          <p className="text-sm text-muted">
            Popular uses:{" "}
            <Link
              href="/pixel-avatar-for-discord"
              className="font-bold hover:text-blue underline underline-offset-2"
            >
              pixel avatar for Discord
            </Link>
            ,{" "}
            <Link
              href="/twitch-pixel-avatar-maker"
              className="font-bold hover:text-blue underline underline-offset-2"
            >
              Twitch pixel avatar maker
            </Link>
            ,{" "}
            <Link
              href="/8-bit-profile-picture-maker"
              className="font-bold hover:text-blue underline underline-offset-2"
            >
              8-bit profile picture maker
            </Link>
            .
          </p>
        </section>

        <Faq items={HOME_FAQ} />

        <JsonLd data={WEB_APP_LD} />

        {/* Footer */}
        <SiteFooter />
      </main>
    </div>
  );
}
