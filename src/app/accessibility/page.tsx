import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility — Kynda Coffee",
  description: "Kynda Coffee is committed to making our website accessible to everyone.",
};

export default function AccessibilityPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-espresso">Accessibility Statement</h1>
        <p className="mt-2 text-sm text-mocha">Last updated: April 2025</p>

        <div className="mt-8 space-y-6 text-mocha">
          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">Our Commitment</h2>
            <p className="mt-2">Kynda Coffee is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.</p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">Accessibility Features</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Keyboard navigation support throughout the site</li>
              <li>Focus indicators for interactive elements</li>
              <li>ARIA labels and roles for screen readers</li>
              <li>Skip-to-content link for keyboard users</li>
              <li>Reduced motion support for users with vestibular disorders</li>
              <li>Sufficient color contrast ratios (WCAG AA compliant)</li>
              <li>Responsive design that works with zoom up to 200%</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">Feedback</h2>
            <p className="mt-2">If you experience any accessibility barriers, please contact us at <a href="mailto:kyndacoffee@gmail.com" className="text-rust hover:underline">kyndacoffee@gmail.com</a> or call (512) 219-6781. We welcome your feedback and will do our best to address any issues.</p>
          </section>
        </div>
      </div>
    </section>
  );
}
