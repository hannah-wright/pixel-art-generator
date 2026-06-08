/**
 * Flat per-image pricing: $5 per PNG, no bundle tier. Simple to
 * communicate. The bundlePrice helper still computes savedCents so a
 * bundle discount can be reintroduced later by raising
 * PRICE_FIRST_CENTS without touching call sites.
 *
 * Examples:
 *   1 -> $5
 *   2 -> $10
 *   3 -> $15
 *   5 -> $25
 */

export const PRICE_FIRST_CENTS = 500;
export const PRICE_ADDITIONAL_CENTS = 500;
export const SUBSCRIPTION_MONTHLY_CENTS = 1499;

// Cap purchases at a reasonable number to keep Stripe metadata under
// its 500-char-per-key limit and to avoid abuse vectors. 20 is more
// than any real user would buy.
export const MAX_BUNDLE_SIZE = 20;

export interface BundlePrice {
  count: number;
  totalCents: number;
  savedCents: number;
}

export function bundlePrice(count: number): BundlePrice {
  const safeCount = Math.max(0, Math.min(count, MAX_BUNDLE_SIZE));
  if (safeCount === 0) {
    return { count: 0, totalCents: 0, savedCents: 0 };
  }
  const totalCents =
    PRICE_FIRST_CENTS + (safeCount - 1) * PRICE_ADDITIONAL_CENTS;
  const fullPriceCents = safeCount * PRICE_FIRST_CENTS;
  return {
    count: safeCount,
    totalCents,
    savedCents: fullPriceCents - totalCents,
  };
}

export function formatUSD(cents: number): string {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}
