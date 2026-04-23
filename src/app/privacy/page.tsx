import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Kynda Coffee",
  description: "How Kynda Coffee collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-espresso">Privacy Policy</h1>
        <p className="mt-2 text-sm text-mocha">Last updated: April 2025</p>

        <div className="mt-8 space-y-6 text-mocha">
          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">Information We Collect</h2>
            <p className="mt-2">We collect information you provide directly, such as your name, email, shipping address, and payment information when you make a purchase or subscribe to our newsletter.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">How We Use Your Information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Process and fulfill orders</li>
              <li>Send order updates and shipping notifications</li>
              <li>Send marketing emails (with your consent)</li>
              <li>Improve our products and services</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">Data Security</h2>
            <p className="mt-2">We use industry-standard encryption and security practices. Payment information is processed securely by Stripe and is never stored on our servers.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">Contact Us</h2>
            <p className="mt-2">If you have questions about this policy, email us at <a href="mailto:kyndacoffee@gmail.com" className="text-rust hover:underline">kyndacoffee@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
