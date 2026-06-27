import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Kynda Coffee",
  description:
    "Kynda Coffee, LLC Privacy Policy. How we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-espresso">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-mocha">
          Last updated: June 2026
        </p>

        <div className="mt-8 space-y-6 text-mocha">
          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Overview
            </h2>
            <p className="mt-2">
              Kynda Coffee, LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;) operates kyndacoffee.com and related online
              ordering services. This Privacy Policy describes how we collect,
              use, and protect your personal information when you visit our
              website, place an order, or interact with our services. We are
              committed to safeguarding your privacy and complying with
              applicable U.S. and Texas state privacy laws.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Information We Collect
            </h2>
            <p className="mt-2">
              We collect information you provide directly to us and information
              collected automatically when you use our services.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                <strong>Contact information:</strong> Name, email address, and
                phone number when you place an order, create an account, or
                contact us. Your phone number is used to send order status
                notifications via SMS (e.g., order confirmed, ready for pickup,
                shipped, delivered).
              </li>
              <li>
                <strong>Order information:</strong> Items ordered, order
                history, fulfillment preferences (pickup, curbside, dine-in,
                delivery), and delivery address.
              </li>
              <li>
                <strong>Payment information:</strong> Payment is processed
                securely through our payment providers (Stripe, Square). We do
                not store full credit card numbers on our servers. Tokenized
                payment references and transaction metadata may be retained for
                order management and accounting.
              </li>
              <li>
                <strong>Device and usage data:</strong> IP address, browser
                type, pages visited, and timestamps. This is collected
                automatically via cookies and analytics tools to improve site
                performance and user experience.
              </li>
              <li>
                <strong>Marketing preferences:</strong> If you subscribe to our
                newsletter or loyalty program, we collect your email and any
                preferences regarding marketing communications.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              How We Use Your Information
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>To process and fulfill your orders, including sending order status notifications via SMS and email</li>
              <li>To communicate with you about your order, account, or customer service requests</li>
              <li>To process payments and prevent fraud</li>
              <li>To improve our website, products, and services</li>
              <li>To send marketing communications if you have opted in (you may unsubscribe at any time)</li>
              <li>To comply with legal obligations and protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              SMS Text Messaging
            </h2>
            <p className="mt-2">
              If you provide your mobile phone number during checkout, we will
              send transactional SMS messages related to your order, including
              order confirmation, ready-for-pickup alerts, shipping
              notifications, and delivery confirmations. Message frequency varies
              based on your order activity. Standard message and data rates may
              apply from your wireless carrier.
            </p>
            <p className="mt-2">
              <strong>Opt-out:</strong> You may opt out of SMS notifications at
              any time by replying STOP to any message. After opting out, you
              will receive a confirmation message. To re-subscribe, reply
              START. For help, reply HELP or contact us at
              kyndacoffee@gmail.com or (512) 219-6781.
            </p>
            <p className="mt-2">
              <strong>We do not share your mobile information with third parties</strong> for
              marketing or promotional purposes. Mobile information is used
              solely for transactional order notifications as described in this
              policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Information Sharing and Third Parties
            </h2>
            <p className="mt-2">
              We do not sell, rent, or trade your personal information. We may
              share your information with the following categories of service
              providers who help us operate our business:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li><strong>Payment processors:</strong> Stripe and Square (payment processing)</li>
              <li><strong>SMS provider:</strong> Twilio (order status text messages)</li>
              <li><strong>Email provider:</strong> Resend (transactional and marketing email)</li>
              <li><strong>Fulfillment partners:</strong> Printful (merchandise production and shipping), USPS/UPS/FedEx (shipping carriers)</li>
              <li><strong>Infrastructure:</strong> Supabase (database hosting), Vercel/DigitalOcean (web hosting)</li>
              <li><strong>Analytics:</strong> Google Analytics or similar tools (usage data, anonymized)</li>
            </ul>
            <p className="mt-2">
              We may also disclose information when required by law, court
              order, or to protect our rights, property, or safety.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Cookies
            </h2>
            <p className="mt-2">
              We use cookies and similar technologies to remember your
              preferences, keep you signed in, analyze traffic, and improve your
              experience. You can control cookies through your browser
              settings. Disabling cookies may affect some site functionality.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Data Retention
            </h2>
            <p className="mt-2">
              We retain personal information for as long as necessary to
              fulfill the purposes described in this policy, comply with legal
              obligations, resolve disputes, and enforce our agreements. Order
              data is typically retained for 7 years for tax and accounting
              purposes. Marketing preference data is retained until you opt out.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Your Rights
            </h2>
            <p className="mt-2">
              Under Texas and U.S. law, you have the right to:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Request access to the personal information we hold about you</li>
              <li>Request correction of inaccurate personal information</li>
              <li>Request deletion of your personal information (subject to legal retention requirements)</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Opt out of the sale or sharing of your personal information (we do not sell your data)</li>
              <li>Limit use of sensitive personal information</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at
              kyndacoffee@gmail.com or (512) 219-6781.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Children&rsquo;s Privacy
            </h2>
            <p className="mt-2">
              Our services are not directed to children under 13. We do not
              knowingly collect personal information from children under 13. If
              you believe we have collected information from a child, please
              contact us and we will promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Security
            </h2>
            <p className="mt-2">
              We use industry-standard security measures to protect your
              personal information, including encrypted data transmission (HTTPS),
              secure payment processing via PCI-compliant providers, and
              access controls. However, no method of transmission over the
              Internet is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the updated policy on
              this page with a revised &ldquo;Last updated&rdquo; date. We
              encourage you to review this page periodically.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Contact Us
            </h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy or our data
              practices, please contact us:
            </p>
            <ul className="mt-3 list-none space-y-1">
              <li>Email: <a href="mailto:kyndacoffee@gmail.com" className="text-forest hover:underline">kyndacoffee@gmail.com</a></li>
              <li>Phone: (512) 219-6781</li>
              <li>Address: 4315 FM 2147, Horseshoe Bay, TX 78657</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
