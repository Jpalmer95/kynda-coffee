import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Kynda Coffee",
  description:
    "Terms and Conditions for using kyndacoffee.com and placing orders with Kynda Coffee, LLC.",
};

export default function TermsPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-espresso">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-mocha">Last updated: June 2026</p>

        <div className="mt-8 space-y-6 text-mocha">
          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Agreement to Terms
            </h2>
            <p className="mt-2">
              These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a
              legally binding agreement between you (&ldquo;you,&rdquo;
              &ldquo;user,&rdquo; or &ldquo;customer&rdquo;) and Kynda Coffee,
              LLC (&ldquo;Kynda Coffee,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
              or &ldquo;our&rdquo;) governing your access to and use of
              kyndacoffee.com, our online ordering platform, QR ordering system,
              and related services (collectively, the &ldquo;Services&rdquo;). By
              accessing or using our Services, you agree to be bound by these
              Terms. If you do not agree, you may not use our Services.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              About Us
            </h2>
            <p className="mt-2">
              Kynda Coffee, LLC is a Texas limited liability company with its
              principal place of business at 4315 FM 2147, Horseshoe Bay, TX
              78657. Our contact email is kyndacoffee@gmail.com and our phone
              number is (512) 219-6781.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Using Our Services
            </h2>
            <p className="mt-2">
              You may use our Services only if you are at least 13 years old
              and capable of forming a binding contract under Texas law. By
              placing an order, you represent and warrant that the information
              you provide is accurate and complete.
            </p>
            <p className="mt-2">
              You agree not to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Use our Services for any unlawful purpose</li>
              <li>Provide false, inaccurate, or misleading information</li>
              <li>Attempt to interfere with, compromise, or disrupt the security of our systems</li>
              <li>Use automated systems (bots, scrapers) to access our Services without our permission</li>
              <li>Resell, redistribute, or commercially exploit products purchased through our Services in violation of applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Orders and Payment
            </h2>
            <p className="mt-2">
              <strong>Placing orders:</strong> When you place an order through
              our website, QR ordering system, or in-store point-of-sale, you
              are making an offer to purchase the selected items. We reserve
              the right to accept or decline any order at our discretion. Once
              we accept your order and payment is confirmed, a binding
              purchase agreement is formed.
            </p>
            <p className="mt-2">
              <strong>Pricing:</strong> All prices are listed in U.S. dollars
              and are subject to applicable Texas state and local sales tax.
              Prices may change without notice. Errors in pricing or product
              descriptions will be corrected upon discovery, and we may cancel
              or adjust affected orders.
            </p>
            <p className="mt-2">
              <strong>Payment:</strong> We accept credit/debit cards via
              Stripe, in-person payments via Square POS, and Apple/Google Pay.
              For online orders, payment must be received and confirmed before
              your order is prepared (prepaid-only policy). In-store POS orders
              may pay at the register.
            </p>
            <p className="mt-2">
              <strong>Fulfillment:</strong> We offer pickup, curbside, dine-in,
              and delivery options. Estimated preparation and delivery times are
              approximate. We are not liable for delays caused by circumstances
              beyond our control (weather, carrier delays, supply chain
              disruptions).
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Shipping and Returns
            </h2>
            <p className="mt-2">
              Shipping rates, delivery timelines, and our return policy are
              detailed on our <a href="/shipping" className="text-forest hover:underline">Shipping &amp; Returns</a> page,
              which is incorporated herein by reference. Coffee and food items
              may be returned within 30 days for a full refund or replacement.
              Merchandise must be unworn and unwashed with tags attached. Custom
              items are made to order and only returnable if defective.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              SMS and Email Communications
            </h2>
            <p className="mt-2">
              By providing your phone number during checkout, you consent to
              receive transactional SMS messages from Kynda Coffee related to
              your order status, including order confirmation, ready-for-pickup
              alerts, shipping, and delivery notifications. Message frequency
              varies based on order activity. Standard message and data rates
              may apply.
            </p>
            <p className="mt-2">
              <strong>Opt-out:</strong> Reply STOP to any SMS to opt out.
              Reply START to re-subscribe. Reply HELP for assistance. You may
              also contact us at kyndacoffee@gmail.com or (512) 219-6781.
            </p>
            <p className="mt-2">
              By providing your email address, you consent to receive
              transactional emails (order confirmations, shipping updates) and,
              if you opt in, marketing emails. You may unsubscribe from
              marketing emails at any time via the link in each email.
            </p>
            <p className="mt-2">
              Our SMS terms and conditions are available at this URL:
              <a href="/terms" className="ml-1 text-forest hover:underline">kyndacoffee.com/terms</a>.
              Our privacy policy is available at
              <a href="/privacy" className="ml-1 text-forest hover:underline">kyndacoffee.com/privacy</a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Loyalty and Rewards
            </h2>
            <p className="mt-2">
              If you participate in our loyalty or rewards program, points and
              rewards have no cash value and are non-transferable. We may
              modify or discontinue the program at any time. Points may expire
              if your account is inactive for 12 months or more.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Gift Cards
            </h2>
            <p className="mt-2">
              Gift cards are issued by Kynda Coffee, LLC and have no expiration
              date or dormancy fees. Gift cards are non-refundable, cannot be
              redeemed for cash (except as required by law), and can be used
              for any purchase on kyndacoffee.com or in-store. Lost or stolen
              gift cards will not be replaced without proof of purchase.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Intellectual Property
            </h2>
            <p className="mt-2">
              All content on kyndacoffee.com, including text, graphics, logos,
              images, and software, is the property of Kynda Coffee, LLC or its
              licensors and is protected by U.S. copyright and trademark laws.
              You may not reproduce, distribute, or create derivative works
              without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              User-Generated Content
            </h2>
            <p className="mt-2">
              If you submit reviews, photos, or other content to our site, you
              grant Kynda Coffee a non-exclusive, royalty-free, worldwide,
              perpetual license to use, reproduce, modify, and display that
              content in connection with our Services. You represent that you
              own or have the right to submit the content and that it does not
              violate the rights of any third party.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Disclaimers
            </h2>
            <p className="mt-2">
              Our Services are provided on an &ldquo;as is&rdquo; and
              &ldquo;as available&rdquo; basis. We make no warranties, express
              or implied, regarding the accuracy, reliability, or availability
              of our Services. To the fullest extent permitted by law, Kynda
              Coffee, LLC disclaims all warranties, including implied
              warranties of merchantability and fitness for a particular
              purpose.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Limitation of Liability
            </h2>
            <p className="mt-2">
              To the fullest extent permitted by law, Kynda Coffee, LLC shall
              not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits or
              revenues, arising from your use of our Services or any products
              purchased through our Services. Our total liability for any
              claim arising from these Terms shall not exceed the amount you
              paid for the product or service giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Indemnification
            </h2>
            <p className="mt-2">
              You agree to indemnify and hold harmless Kynda Coffee, LLC, its
              owners, officers, employees, and agents from any claims,
              damages, liabilities, costs, and expenses (including
              reasonable attorney fees) arising from your use of our Services,
              your violation of these Terms, or your infringement of any
              third-party rights.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Governing Law and Dispute Resolution
            </h2>
            <p className="mt-2">
              These Terms are governed by the laws of the State of Texas,
              without regard to conflict of law principles. Any dispute arising
              from these Terms or your use of our Services shall be resolved
              exclusively in the state or federal courts located in Llano
              County, Texas, and you consent to the personal jurisdiction of
              those courts.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Modifications to These Terms
            </h2>
            <p className="mt-2">
              We may revise these Terms at any time by posting an updated
              version on this page. The &ldquo;Last updated&rdquo; date will
              reflect the most recent revision. Your continued use of our
              Services after changes are posted constitutes your acceptance of
              the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Accessibility
            </h2>
            <p className="mt-2">
              We are committed to making our website accessible to all users.
              Please see our <a href="/accessibility" className="text-forest hover:underline">Accessibility Statement</a> for
              more information.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Contact Us
            </h2>
            <p className="mt-2">
              If you have questions about these Terms, please contact us:
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
