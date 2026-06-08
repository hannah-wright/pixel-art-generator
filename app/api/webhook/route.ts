/**
 * POST /api/webhook
 *
 * Stripe webhook endpoint. Fires when a Checkout session completes.
 *
 * Currently this just verifies the signature and acknowledges the
 * event. The actual download is delivered on the /success page,
 * which looks up the session directly via the Stripe API. Stripe
 * sends the payment receipt automatically, so no additional email
 * from us is needed.
 *
 * Keeping the webhook in place because:
 *  - Stripe is already configured to send events here
 *  - It's the standard hook point for adding future logic
 *    (refunds, disputes, abuse signals, etc.)
 *
 * Setup:
 *  Stripe Dashboard -> Developers -> Webhooks -> Add endpoint
 *    URL:    https://pixelartavatar.com/api/webhook
 *    Events: checkout.session.completed
 *  Copy the signing secret into Vercel as STRIPE_WEBHOOK_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !whSecret) {
    console.error("[webhook] Stripe env vars missing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(secret);
    event = stripe.webhooks.constructEvent(rawBody, signature, whSecret);
  } catch (err) {
    console.error(
      "[webhook] signature verification failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log(
      "[webhook] payment complete:",
      session.id,
      "token:",
      session.metadata?.token
    );
  }

  return NextResponse.json({ received: true });
}
