/**
 * Resend transactional email.
 * Falls back to console-logging if RESEND_API_KEY isn't configured,
 * so local dev still surfaces the message.
 */
import { Resend } from "resend";

let client: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  client = new Resend(process.env.RESEND_API_KEY);
}

// Resend's onboarding@resend.dev works without domain verification.
// Switch to your verified address (e.g. hello@pixelartavatar.com) once
// the domain is verified in Resend.
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// Where contact-form submissions are delivered.
const CONTACT_TO = process.env.CONTACT_TO_EMAIL || "hello@pixelartavatar.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Deliver a contact-form message to the site's inbox. Reply-To is set
 * to the sender so a reply goes straight back to them. Falls back to
 * console logging when RESEND_API_KEY isn't configured (local dev).
 */
export async function sendContactEmail(opts: {
  name: string;
  email: string;
  message: string;
}) {
  const subject = `Contact form: ${opts.name}`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #0a0a0a;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">New contact message</h1>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escapeHtml(opts.name)}</p>
      <p style="margin: 0 0 16px;"><strong>Email:</strong> ${escapeHtml(opts.email)}</p>
      <div style="white-space: pre-wrap; line-height: 1.5; border-top: 1px solid #e5e5e5; padding-top: 16px;">${escapeHtml(opts.message)}</div>
    </div>
  `;
  const text = `New contact message\n\nName: ${opts.name}\nEmail: ${opts.email}\n\n${opts.message}`;

  if (!client) {
    console.log("[email] (no RESEND_API_KEY) contact message from", opts.email);
    console.log("[email] message:", opts.message);
    return { dev: true };
  }

  return client.emails.send({
    from: `Pixel Art Avatar <${FROM}>`,
    to: CONTACT_TO,
    replyTo: opts.email,
    subject,
    html,
    text,
  });
}

export async function sendDownloadEmail(opts: {
  to: string;
  downloadUrl: string;
  expiresMinutes: number;
}) {
  const subject = "Your pixel art is ready 🕹";
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px; color: #0a0a0a;">
      <h1 style="font-size: 28px; margin: 0 0 12px;">Your pixel art is ready</h1>
      <p style="font-size: 16px; line-height: 1.5; margin: 0 0 24px;">
        Thanks for your purchase. Your clean, watermark-free PNG is one click away.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${opts.downloadUrl}"
           style="display: inline-block; padding: 14px 28px; background: #ff006e; color: #ffffff; font-weight: 700; text-decoration: none; border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 0 #0a0a0a; border-radius: 4px;">
          Download your pixel art →
        </a>
      </p>
      <p style="font-size: 14px; color: #6b6b6b; line-height: 1.5;">
        This link works for the next ${opts.expiresMinutes} minutes for security.
        After that the file is permanently deleted.
      </p>
      <p style="font-size: 14px; color: #6b6b6b; margin-top: 32px;">
        Pixel Art Avatar
      </p>
    </div>
  `;
  const text = `Your pixel art is ready.\n\nDownload: ${opts.downloadUrl}\n\nThis link works for ${opts.expiresMinutes} minutes.\n\nPixel Art Avatar`;

  if (!client) {
    console.log("[email] (no RESEND_API_KEY) would send to", opts.to);
    console.log("[email] download url:", opts.downloadUrl);
    return { dev: true };
  }

  const res = await client.emails.send({
    from: `Pixel Art Avatar <${FROM}>`,
    to: opts.to,
    subject,
    html,
    text,
  });
  return res;
}
