/**
 * GET /api/owner?token=<OWNER_BYPASS_TOKEN>
 *
 * One-shot endpoint to mark a browser as the site owner.
 * If the query token matches the env var, sets a long-lived
 * httpOnly cookie that the generate route checks to skip rate
 * limiting.
 *
 * Setup:
 *   1. Set OWNER_BYPASS_TOKEN in Vercel to any random string.
 *   2. Visit https://pixelartavatar.com/api/owner?token=<that value>
 *      once in each browser you'll be testing from.
 *   3. From now on, that browser bypasses the daily preview limit.
 *
 * The cookie is httpOnly, secure, and SameSite=Lax. Rotating
 * OWNER_BYPASS_TOKEN in Vercel revokes all existing bypasses.
 */
import { NextRequest, NextResponse } from "next/server";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function GET(req: NextRequest) {
  const rawExpected = process.env.OWNER_BYPASS_TOKEN;
  const rawProvided = req.nextUrl.searchParams.get("token");

  // Trim defensively: easy mistake to add a trailing newline in Vercel.
  const expected = rawExpected?.trim();
  const provided = rawProvided?.trim();

  if (!expected) {
    return NextResponse.json(
      {
        error: "OWNER_BYPASS_TOKEN not set on this deployment",
        hint: "Set it in Vercel → Settings → Environment Variables, then redeploy.",
      },
      { status: 503 }
    );
  }
  if (!provided) {
    return NextResponse.json(
      { error: "Missing ?token= query parameter in URL" },
      { status: 400 }
    );
  }
  if (provided !== expected) {
    return NextResponse.json(
      {
        error: "Token mismatch",
        debug: {
          providedLength: provided.length,
          expectedLength: expected.length,
          providedFirstChar: provided[0] ?? null,
          providedLastChar: provided[provided.length - 1] ?? null,
          expectedFirstChar: expected[0] ?? null,
          expectedLastChar: expected[expected.length - 1] ?? null,
        },
      },
      { status: 403 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    message: "This browser now bypasses the preview rate limit.",
  });
  res.cookies.set("pps_owner", expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
  return res;
}
