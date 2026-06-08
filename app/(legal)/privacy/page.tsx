import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Pixel Art Avatar",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-pixel text-5xl">Privacy Policy</h1>
        <p className="text-sm text-muted">Last updated: May 27, 2026</p>
      </header>

      <p className="text-muted">
        This Privacy Policy explains what information pixelartavatar.com (the
        &quot;Service&quot;) collects, how it is used, and the choices you have.
        By using the Service, you agree to the practices described here.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">1. Information we collect</h2>
        <ul className="text-muted list-disc pl-6 space-y-1">
          <li>
            <strong className="text-ink">Photos you upload.</strong> We process
            the photos you upload in order to generate pixel art.
          </li>
          <li>
            <strong className="text-ink">Generated images.</strong> The pixel
            art previews and downloads created from your photos.
          </li>
          <li>
            <strong className="text-ink">Technical and usage data.</strong> This
            includes your IP address, basic device and browser information, and
            a device signal used to detect abuse. We use these to operate the
            Service, enforce usage limits, and prevent fraud and automated
            abuse.
          </li>
          <li>
            <strong className="text-ink">Payment information.</strong> Payments
            are handled by our payment provider. We do not receive or store
            your full card details.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">2. How we use information</h2>
        <p className="text-muted">
          We use the information above to provide and improve the Service,
          generate and deliver your pixel art, process payments, prevent abuse
          and fraud, and maintain the security and reliability of the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">3. Service providers</h2>
        <p className="text-muted">
          We rely on trusted third parties to run the Service, including
          providers for AI image generation, temporary image storage, bot
          protection, usage-limit enforcement, payment processing, and website
          hosting. These providers process data only as needed to perform their
          services.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">4. Data retention</h2>
        <p className="text-muted">
          Uploaded photos and generated images are stored only temporarily and
          are deleted automatically, typically within about 24 hours. We do not
          keep your photos long-term.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">
          5. We do not sell your data or train on your photos
        </h2>
        <p className="text-muted">
          We do not sell your personal information, and we do not use your
          uploaded photos to train AI models.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">6. Cookies and bot protection</h2>
        <p className="text-muted">
          We use a small number of cookies and similar technologies for
          essential functions, such as a bot check that helps prevent automated
          abuse and a cookie used for administrative access. We do not use
          advertising cookies.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">7. Security</h2>
        <p className="text-muted">
          We take reasonable measures to protect information processed by the
          Service. However, no method of transmission or storage is completely
          secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">8. Children&apos;s privacy</h2>
        <p className="text-muted">
          The Service is not directed to children under 13, and we do not
          knowingly collect personal information from them.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">9. International processing</h2>
        <p className="text-muted">
          Your information may be processed in countries other than where you
          live, including by the service providers described above.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">10. Your choices</h2>
        <p className="text-muted">
          Because uploaded images are deleted automatically within a short
          period, most data is not retained. If you have a request regarding
          your information, you can submit it through the contact page on this
          site.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">11. Changes to this policy</h2>
        <p className="text-muted">
          We may update this Privacy Policy from time to time. Material changes
          will be reflected by updating the date above.
        </p>
      </section>
    </article>
  );
}
