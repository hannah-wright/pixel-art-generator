/**
 * POST /api/checkout
 * Creates a Stripe Checkout session for one or more pixel art PNGs.
 * Returns: { url } to redirect the user to Stripe.
 *
 * Expects: { items, mode } where `items` is an array of
 * { token, bgColor } pairs. Each item is one PNG; each can have
 * its own background color. The server applies the bundle price
 * ($5 per image) and forwards all (token, bgColor)
 * pairs to Stripe metadata so the webhook + /success page can
 * composite + deliver each one independently.
 *
 * Backwards-compat: also accepts the old { tokens, mode, bgColor }
 * shape where every token shares the same bgColor.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { bundlePrice, MAX_BUNDLE_SIZE } from "@/lib/pricing";

interface CheckoutItem {
  token: string;
  bgColor: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    // Dev mode: pretend it worked.
    return NextResponse.json({ url: "/success?dev=1", dev: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const body = await req.json();
    const { items: itemsRaw, tokens: tokensRaw, token: legacyToken, mode, bgColor } =
      body ?? {};

    // Normalise input. Prefer the new {items} array; fall back to
    // {tokens, bgColor} and finally {token, bgColor} for any
    // in-flight clients.
    let items: CheckoutItem[] = [];
    if (Array.isArray(itemsRaw)) {
      items = itemsRaw
        .filter(
          (x): x is { token: unknown; bgColor: unknown } =>
            typeof x === "object" && x !== null
        )
        .map((x) => ({
          token: typeof x.token === "string" ? x.token : "",
          bgColor:
            typeof x.bgColor === "string" && x.bgColor.length > 0
              ? x.bgColor
              : "transparent",
        }))
        .filter((x) => x.token.length > 0);
    } else if (Array.isArray(tokensRaw)) {
      const sharedBg =
        typeof bgColor === "string" && bgColor.length > 0
          ? bgColor
          : "transparent";
      items = tokensRaw
        .filter((t): t is string => typeof t === "string" && t.length > 0)
        .map((token) => ({ token, bgColor: sharedBg }));
    } else if (typeof legacyToken === "string" && legacyToken.length > 0) {
      items = [
        {
          token: legacyToken,
          bgColor:
            typeof bgColor === "string" && bgColor.length > 0
              ? bgColor
              : "transparent",
        },
      ];
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Missing preview tokens. Generate a preview first." },
        { status: 400 }
      );
    }
    if (items.length > MAX_BUNDLE_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BUNDLE_SIZE} images per purchase.` },
        { status: 400 }
      );
    }

    // De-duplicate by token so the user isn't charged twice for the
    // same image (keep the first occurrence's bgColor).
    const seen = new Set<string>();
    items = items.filter((x) => {
      if (seen.has(x.token)) return false;
      seen.add(x.token);
      return true;
    });

    const price = bundlePrice(items.length);
    const origin =
      req.headers.get("origin") || "https://pixelartavatar.com";

    // Stripe metadata: 50 keys max, 500 chars per value. Storing
    // each item as token_N + bg_N gives 2 keys per item plus 2
    // shared (count, mode) = max ~42 keys for 20 items, comfortably
    // under both limits.
    const metadata: Record<string, string> = {
      count: String(items.length),
      mode: String(mode ?? ""),
    };
    items.forEach((item, i) => {
      metadata[`token_${i}`] = item.token;
      metadata[`bg_${i}`] = item.bgColor;
    });

    const itemNoun =
      mode === "avatar" ? "avatar/profile picture image" : "pixel art image";
    const productName =
      items.length === 1
        ? "Pixel Art Avatar download"
        : `Pixel Art Avatar bundle (${items.length} ${itemNoun}s)`;
    const productDescription =
      items.length === 1
        ? `1 clean ${itemNoun}, watermark-free`
        : `${items.length} clean ${itemNoun}s, watermark-free`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: price.totalCents,
            product_data: {
              name: productName,
              description: productDescription,
            },
          },
          quantity: 1,
        },
      ],
      metadata,
      customer_creation: "if_required",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json(
      { error: "Couldn't start checkout." },
      { status: 500 }
    );
  }
}
