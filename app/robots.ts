import type { MetadataRoute } from "next";

/**
 * We deliberately do NOT disallow /terms, /privacy, or /contact here.
 * Those pages rely on noindex,nofollow meta tags to stay out of search,
 * and a robots.txt Disallow would block crawlers from ever reading
 * those tags, which can leave URL-only entries in results. We only
 * block the API and the transactional success page.
 */
export default function robots(): MetadataRoute.Robots {
  const base = "https://pixelartavatar.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/success"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
