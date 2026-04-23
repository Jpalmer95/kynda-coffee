import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Kynda Coffee",
  description: "Terms and conditions for using the Kynda Coffee website and services.",
};

export default function TermsPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-espresso">Terms of Service</h1>
        <p className="mt-2 text-sm text-mocha">Last updated: April 2025</p>

        <div className="mt-8 space-y-6 text-mocha">
          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">1. Acceptance of Terms</h2>
            <p className="mt-2">By accessing or using the Kynda Coffee website, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">2. Orders and Payment</h2>
            <p className="mt-2">All orders are subject to availability and confirmation of the order price. Payments are processed securely through Stripe. Prices are in USD and do not include tax until checkout.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">3. Shipping and Returns</h2>
            <p className="mt-2">We ship within the United States. Free shipping on orders over $50. Returns accepted within 30 days of delivery for unused items in original packaging.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">4. Intellectual Property</h2>
            <p className="mt-2">All content on this site, including logos, images, and text, is the property of Kynda Coffee. AI-generated designs created in our Design Studio are licensed for personal use on purchased products.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">5. Contact</h2>
            <p className="mt-2">Questions? Reach us at <a href="mailto:kyndacoffee@gmail.com" className="text-rust hover:underline">kyndacoffee@gmail.com</a> or 4315 FM 2147, Horseshoe Bay, TX 78657.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
