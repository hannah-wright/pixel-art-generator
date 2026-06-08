import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact · Pixel Art Avatar",
};

export default function ContactPage() {
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-pixel text-5xl">Contact</h1>
        <p className="text-muted">
          Questions, feedback, or need help with an order? Send a message and
          we will get back to you.
        </p>
      </header>

      <ContactForm />
    </article>
  );
}
