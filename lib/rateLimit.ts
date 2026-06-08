/**
 * IP-based rate limiting for free previews.
 * Falls back to a no-op if Upstash credentials aren't configured yet.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Free watermarked previews allowed per IP per 24h. Caps cost and
// abuse exposure for non-buyers (each avatar preview runs several AI
// calls). The owner cookie bypasses this for testing.
const FREE_PREVIEWS_PER_DAY = 5;

// Contact-form messages allowed per IP per hour. Low, since real users
// rarely send more than one. Stops spam floods even if the bot check
// is somehow passed.
const CONTACT_MESSAGES_PER_HOUR = 5;

let limiter: Ratelimit | null = null;
let contactLimiter: Ratelimit | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(FREE_PREVIEWS_PER_DAY, "24 h"),
    prefix: "pixelstudio:preview",
  });
  contactLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(CONTACT_MESSAGES_PER_HOUR, "1 h"),
    prefix: "pixelstudio:contact",
  });
}

export async function checkPreviewLimit(identifier: string) {
  if (!limiter) {
    // Dev mode without Upstash configured: always allow.
    return { success: true, remaining: FREE_PREVIEWS_PER_DAY, limit: FREE_PREVIEWS_PER_DAY };
  }
  return limiter.limit(identifier);
}

export async function checkContactLimit(identifier: string) {
  if (!contactLimiter) {
    // Dev mode without Upstash configured: always allow.
    return {
      success: true,
      remaining: CONTACT_MESSAGES_PER_HOUR,
      limit: CONTACT_MESSAGES_PER_HOUR,
    };
  }
  return contactLimiter.limit(identifier);
}

export { FREE_PREVIEWS_PER_DAY, CONTACT_MESSAGES_PER_HOUR };
