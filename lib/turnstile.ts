/**
 * Cloudflare Turnstile verification.
 * In dev (no secret configured), always passes.
 */
export async function verifyTurnstile(token: string | null, ip?: string) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return { success: true, dev: true };
  }
  if (!token) {
    return { success: false, error: "missing-token" };
  }

  const formData = new URLSearchParams();
  formData.append("secret", process.env.TURNSTILE_SECRET_KEY);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );
  const data = await res.json();
  return { success: !!data.success, raw: data };
}
