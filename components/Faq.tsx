import { JsonLd } from "./JsonLd";

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Visible FAQ accordion that ALSO emits FAQPage JSON-LD from the same
 * data, so the structured data always matches what's on screen (Google
 * requires this for FAQ rich results). Question/answer text targets the
 * long-tail queries people and LLMs ask, which can surface in AI
 * Overviews and assistant answers faster than head terms.
 */
export function Faq({
  items,
  heading = "Frequently asked questions",
}: {
  items: FaqItem[];
  heading?: string;
}) {
  const faqLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <h2 className="font-pixel text-4xl text-center mb-10">▸ {heading}</h2>
      <div className="space-y-4">
        {items.map((it) => (
          <details key={it.q} className="card-chunky group">
            <summary className="font-bold text-lg cursor-pointer list-none flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span>{it.q}</span>
              <span className="text-blue text-2xl leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="text-muted mt-3 leading-relaxed">{it.a}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqLd} />
    </section>
  );
}
