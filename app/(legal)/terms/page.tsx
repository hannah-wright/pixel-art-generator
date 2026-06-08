import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Pixel Art Avatar",
};

export default function TermsPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-pixel text-5xl">Terms of Service</h1>
        <p className="text-sm text-muted">Last updated: May 27, 2026</p>
      </header>

      <p className="text-muted">
        Welcome to pixelartavatar.com (the &quot;Service&quot;). These Terms
        of Service (&quot;Terms&quot;) govern your use of the Service. By
        uploading a photo, generating a preview, or making a purchase, you
        agree to these Terms. If you do not agree, please do not use the
        Service.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">1. The Service</h2>
        <p className="text-muted">
          pixelartavatar.com turns photos you upload into stylized pixel art.
          You can generate a free, watermarked preview. If you like a result,
          you can pay to download a clean, watermark-free version.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">2. Eligibility</h2>
        <p className="text-muted">
          You must be able to form a binding contract to use the Service. If
          you are under the age of majority in your location, you may use the
          Service only with the involvement of a parent or guardian.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">3. Photos you upload</h2>
        <p className="text-muted">
          You are responsible for the photos you upload. By uploading a photo,
          you confirm that you own it or have permission to use it, and that it
          does not infringe anyone&apos;s rights.
        </p>
        <p className="text-muted">
          You grant pixelartavatar.com a limited license to process your photo
          solely to provide the Service, for example to generate pixel art and
          deliver your download. We do not use your photos to train AI models,
          and we do not sell them. Uploaded photos and generated images are
          stored only temporarily and are deleted automatically, typically
          within about 24 hours.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">4. Acceptable use</h2>
        <p className="text-muted">You agree not to use the Service to:</p>
        <ul className="text-muted list-disc pl-6 space-y-1">
          <li>upload photos of other people without their consent;</li>
          <li>
            upload content that is illegal, infringing, hateful, harassing,
            sexually explicit, or that depicts minors inappropriately;
          </li>
          <li>
            attempt to bypass usage limits, bot checks, payment, or
            watermarks; or
          </li>
          <li>
            interfere with, scrape, or place an unreasonable load on the
            Service.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">5. AI-generated results</h2>
        <p className="text-muted">
          Pixel art results are generated automatically by AI and are stylized
          interpretations of your photo. They may not perfectly resemble the
          original image, and results vary between runs. For this reason the
          Service is provided on an &quot;as is&quot; basis.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">6. Payments and refunds</h2>
        <p className="text-muted">
          Prices are shown before checkout and may change at any time. Payments
          are processed by our payment provider. Because downloads are digital
          goods delivered immediately, all sales are final and non-refundable
          once a download has been delivered, except where a refund is required
          by law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">7. Intellectual property</h2>
        <p className="text-muted">
          Subject to these Terms and your payment, you may use the pixel art
          you generate and download for personal and commercial purposes. The
          pixelartavatar.com name, website, and underlying software remain our
          property.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">8. Disclaimers</h2>
        <p className="text-muted">
          The Service is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, whether express or
          implied, including fitness for a particular purpose and
          non-infringement. We do not warrant that the Service will be
          uninterrupted, error-free, or that results will meet your
          expectations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">9. Limitation of liability</h2>
        <p className="text-muted">
          To the fullest extent permitted by law, pixelartavatar.com will not
          be liable for any indirect, incidental, special, or consequential
          damages, or for any loss of data, arising out of or relating to your
          use of the Service. Our total liability for any claim relating to the
          Service will not exceed the amount you paid us in the three months
          before the claim arose.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">10. Changes to the Service and Terms</h2>
        <p className="text-muted">
          We may modify or discontinue the Service, and we may update these
          Terms, at any time. Continued use of the Service after changes take
          effect means you accept the updated Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">11. Termination</h2>
        <p className="text-muted">
          We may suspend or terminate access to the Service at any time,
          including for any violation of these Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">12. Governing law</h2>
        <p className="text-muted">
          These Terms are governed by the applicable laws of the jurisdiction
          in which the operator of pixelartavatar.com is established, without
          regard to conflict-of-law rules.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">13. Severability</h2>
        <p className="text-muted">
          If any part of these Terms is found unenforceable, the remaining
          provisions will remain in effect.
        </p>
      </section>

      <p className="text-muted">
        Questions about these Terms can be submitted through the contact page
        on this site.
      </p>
    </article>
  );
}
