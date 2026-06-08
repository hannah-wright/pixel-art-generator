import Link from "next/link";

/**
 * Shared site footer. Legal links carry rel="nofollow" and the pages
 * themselves are noindex,nofollow (see the (legal) route group layout),
 * so they stay reachable for users without being indexed by search.
 */
export function SiteFooter() {
  return (
    <footer className="border-t-[3px] border-ink mt-16">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm">
        <div className="font-pixel text-lg">PIXELARTAVATAR.COM © 2026</div>
        <div className="flex gap-4 text-muted">
          <Link href="/terms" rel="nofollow" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" rel="nofollow" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/contact" rel="nofollow" className="hover:text-ink">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
