/**
 * POST /api/contact
 * Accepts: JSON { name, email, message, turnstile, website }
 * Sends the message to the site inbox via Resend.
 *
 * Anti-abuse layers:
 *  1. Honeypot field (`website`) - bots fill hidden inputs.
 *  2. Cloudflare Turnstile bot check.
 *  3. Disposable / throwaway email rejection.
 *  4. IP rate limit (Upstash).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkContactLimit } from "@/lib/rateLimit";
import { isValidEmailFormat, isDisposableEmail } from "@/lib/disposableEmail";
import { sendContactEmail } from "@/lib/email";

export const runtime = "nodejs";

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();
    const honeypot = String(body.website ?? "").trim();
    const turnstileToken = body.turnstile ? String(body.turnstile) : null;

    // 1. Honeypot. A real user never fills this hidden field. Pretend
    //    success so bots don't learn they were caught.
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    // 2. Field validation.
    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 }
      );
    }
    if (!email || email.length > 200 || !isValidEmailFormat(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Please use a non-disposable email address so we can reply.",
        },
        { status: 400 }
      );
    }
    if (!message || message.length > 5000) {
      return NextResponse.json(
        { error: "Please enter a message (up to 5000 characters)." },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);

    // 3. Bot check.
    const verified = await verifyTurnstile(turnstileToken, ip);
    if (!verified.success) {
      return NextResponse.json(
        { error: "Bot check failed. Please try again." },
        { status: 403 }
      );
    }

    // 4. Rate limit.
    const rl = await checkContactLimit(ip);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        { status: 429 }
      );
    }

    await sendContactEmail({ name, email, message });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] error:", err);
    return NextResponse.json(
      { error: "Couldn't send your message. Please try again." },
      { status: 500 }
    );
  }
}
