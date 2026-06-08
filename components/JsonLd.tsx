/**
 * Renders a JSON-LD <script> tag (structured data) server-side so
 * search engines and LLMs can read clean, machine-readable facts about
 * the page. Server component: the markup ships in the initial HTML.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline here (no user input).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
