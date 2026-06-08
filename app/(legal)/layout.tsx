import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Chrome + metadata for the utility pages (terms, privacy, contact).
 * Setting robots here makes every page in the (legal) group
 * noindex,nofollow so they stay out of search results while remaining
 * reachable for users (and for payment-provider requirements).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1">
      <header className="w-full border-b-[3px] border-ink">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="font-pixel text-2xl md:text-3xl tracking-wide"
          >
            Pixel Art Avatar
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
