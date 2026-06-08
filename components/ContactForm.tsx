"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const inputClass =
  "w-full border-[3px] border-ink rounded bg-paper px-3 py-2 text-ink focus:outline-none focus:shadow-[2px_2px_0_0_#0a0a0a]";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot: hidden from real users; bots tend to fill every field.
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Bumping this key re-renders Turnstile to mint a fresh single-use
  // token after each submit.
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please wait a moment for the bot check to finish, then try again.");
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          website,
          turnstile: turnstileToken,
        }),
      });
      // Token is single-use; reset for any retry.
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't send your message. Please try again.");
        setStatus("idle");
        return;
      }
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
      setError("Couldn't send your message. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "sent") {
    return (
      <div className="card-chunky text-center space-y-2">
        <p className="font-bold text-lg">✓ Thanks, your message is on its way.</p>
        <p className="text-muted text-sm">
          We&apos;ll reply to the email you provided.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-chunky space-y-4">
      {/* Honeypot. Hidden from users; off-screen + aria-hidden + no tab. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div>
        <label htmlFor="contact-name" className="block font-bold text-sm mb-1">
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block font-bold text-sm mb-1">
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block font-bold text-sm mb-1"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          required
          maxLength={5000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputClass} resize-y`}
        />
      </div>

      {error && (
        <p className="text-ink font-bold text-sm border-[3px] border-ink bg-cream rounded px-3 py-2">
          ⚠ {error}
        </p>
      )}

      {TURNSTILE_SITE_KEY && (
        <div className="flex justify-center">
          <Turnstile
            key={turnstileKey}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={(t) => setTurnstileToken(t)}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
            options={{ theme: "light", size: "flexible" }}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={
          status === "sending" || (!!TURNSTILE_SITE_KEY && !turnstileToken)
        }
        className="btn-chunky btn-blue w-full text-lg disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "Sending..." : "Send message →"}
      </button>
    </form>
  );
}
