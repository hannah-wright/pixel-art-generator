/**
 * Short-lived "this browser passed the bot check" cookie.
 *
 * Turnstile tokens are single-use, so we can't reuse one across a
 * generation and its follow-up regenerations. Instead, once a browser
 * passes Turnstile we set this tamper-proof cookie. Subsequent
 * generations (e.g. the Regenerate button) are accepted on the cookie
 * alone, so the user only solves the bot check once.
 *
 * This keeps the endpoint protected: a bot must still pass Turnstile
 * once to obtain the cookie, and the IP rate limit remains the hard cap
 * on total generations. The cookie is HMAC-signed with the Turnstile
 * secret (server-only) so it can't be forged client-side.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const VERIFIED_COOKIE = "pps_verified";

// How long one Turnstile solve keeps the browser verified. The IP rate
// limit caps total generations regardless; this only controls when the
// bot check reappears.
export const VERIFIED_TTL_SECONDS = 2 * 60 * 60; // 2 hours

/** Mint a signed cookie value: "<expiryMs>.<hmacHex>". */
export function signVerified(secret: string): string {
  const exp = Date.now() + VERIFIED_TTL_SECONDS * 1000;
  const sig = createHmac("sha256", secret).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

/** True if the cookie is well-formed, correctly signed, and unexpired. */
export function isVerified(
  value: string | undefined,
  secret: string
): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot < 1) return false;
  const expStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = createHmac("sha256", secret).update(expStr).digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
