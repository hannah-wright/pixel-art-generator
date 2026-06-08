import type { MetadataRoute } from "next";

/**
 * Only the public, indexable pages belong here. The utility pages
 * (terms, privacy, contact) are intentionally excluded because they
 * are noindex,nofollow, and /success is a transactional page reached
 * only via Stripe redirect.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://pixelartavatar.com";
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/avatar`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/photo-to-pixel-art`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Long-tail landing pages.
    {
      url: `${base}/pixel-avatar-for-discord`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/twitch-pixel-avatar-maker`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/8-bit-profile-picture-maker`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
