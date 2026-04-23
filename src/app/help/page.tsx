import { FAQSchema } from "@/components/seo/JsonLd";
import Link from "next/link";
import { HelpCircle, Truck, Coffee, CreditCard, RotateCcw, MessageSquare, Search } from "lucide-react";

const FAQS = [
  {
    category: "Orders & Shipping",
    icon: Truck,
    questions: [
      {
        q: "How long does shipping take?",
        a: "Most orders ship within 1-2 business days. Standard shipping takes 3-7 business days. We also offer local pickup at our Horseshoe Bay location if you're nearby.",
      },
      {
        q: "Do you offer free shipping?",
        a: "Yes! All orders over $50 ship free via USPS Priority Mail within the continental US. Orders under $50 have a flat $5.99 shipping rate.",
      },
      {
        q: "Can I track my order?",
        a: "Absolutely. Once your order ships, you'll receive a tracking number via email. You can also track any order on our Track Order page using your order number and email.",
      },
      {
        q: "Do you ship internationally?",
        a: "Currently we only ship within the United States. We're working on expanding to Canada and Mexico soon.",
      },
    ],
  },
  {
    category: "Coffee & Products",
    icon: Coffee,
    questions: [
      {
        q: "How fresh is your coffee?",
        a: "We roast in small batches every week. Coffee is typically roasted within 48 hours of shipping to ensure maximum freshness. Each bag has a roasted-on date.",
      },
      {
        q: "What grind should I choose?",
        a: "Whole bean stays freshest longest. Choose Espresso for machines, Drip for auto-drip makers, Pour-Over for V60/Chemex, French Press for coarse immersion, and Cold Brew for long steeping.",
      },
      {
        q: "How should I store my coffee?",
        a: "Store in an airtight container away from light, heat, and moisture. Avoid the fridge or freezer — room temperature in a pantry is best. Use within 30 days of roasting for peak flavor.",
      },
      {
        q: "Are your beans really organic?",
        a: "Yes. We source only certified organic beans. Our roasting process is also certified organic, and we maintain full traceability from farm to cup.",
      },
    ],
  },
  {
    category: "Payments & Returns",
    icon: CreditCard,
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, Mastercard, Amex, Discover), Apple Pay, Google Pay, and Shop Pay. All transactions are securely processed via Stripe.",
      },
      {
        q: "What is your return policy?",
        a: "We offer a 30-day satisfaction guarantee. If you're not happy with your coffee, contact us for a refund or replacement. Merch must be unworn with tags attached for returns.",
      },
      {
        q: "Can I modify or cancel my order?",
        a: "We process orders quickly, but if you need to make a change, reach out within 2 hours of placing your order and we'll do our best to accommodate.",
      },
    ],
  },
  {
    category: "Coffee Club & Subscriptions",
    icon: RotateCcw,
    questions: [
      {
        q: "How does the Coffee Club work?",
        a: "Choose your favorite roast, grind, and delivery frequency (weekly, biweekly, or monthly). We'll automatically ship fresh coffee to your door. You can pause, skip, or cancel anytime.",
      },
      {
        q: "Can I change my subscription?",
        a: "Yes! Log into your account, go to Coffee Club, and update your preferences, frequency, or shipping address anytime before your next billing date.",
      },
      {
        q: "Is there a discount for subscribing?",
        a: "Coffee Club members save 10% on every delivery, plus get early access to limited micro-lot releases and exclusive subscriber-only blends.",
      },
    ],
  },
];

export const metadata = {
  title: "Help & FAQ | Kynda Coffee",
  description: "Find answers to common questions about shipping, coffee, subscriptions, and returns at Kynda Coffee.",
};

export default function HelpPage() {
  const allQuestions = FAQS.flatMap((section) =>
    section.questions.map((q) => ({ question: q.q, answer: q.a }))
  );

  return (
    <>
      <FAQSchema questions={allQuestions} />
      <section className="section-padding">
        <div className="container-max max-w-3xl">
          {/* Header */}
          <div className="text-center">
            <HelpCircle className="mx-auto h-10 w-10 text-rust" aria-hidden="true" />
            <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-espresso">
              Help & FAQ
            </h1>
            <p className="mt-3 text-base sm:text-lg text-mocha">
              Quick answers to common questions. Can&apos;t find what you need?{" "}
              <Link href="/contact" className="text-rust hover:underline">
                Contact us
              </Link>
              .
            </p>
          </div>

          {/* Quick links */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Track Order", href: "/track-order", icon: Search },
              { label: "Shipping Info", href: "/shipping", icon: Truck },
              { label: "Size Guide", href: "/size-guide", icon: MessageSquare },
              { label: "Contact Us", href: "/contact", icon: MessageSquare },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-latte/20 bg-white p-4 transition-all hover:shadow-md hover:border-latte/40"
              >
                <link.icon className="h-5 w-5 text-mocha" />
                <span className="text-sm font-medium text-espresso">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* FAQ Sections */}
          <div className="mt-12 space-y-10">
            {FAQS.map((section) => (
              <div key={section.category}>
                <div className="flex items-center gap-2 mb-4">
                  <section.icon className="h-5 w-5 text-rust" aria-hidden="true" />
                  <h2 className="font-heading text-xl font-semibold text-espresso">
                    {section.category}
                  </h2>
                </div>
                <div className="space-y-3">
                  {section.questions.map((item, idx) => (
                    <details
                      key={idx}
                      className="group rounded-xl border border-latte/20 bg-white open:shadow-sm transition-all"
                    >
                      <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium text-espresso list-none">
                        {item.q}
                        <span className="ml-4 flex-shrink-0 text-mocha transition-transform group-open:rotate-180">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </span>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-mocha leading-relaxed">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 rounded-2xl bg-espresso p-6 sm:p-10 text-center">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-cream">
              Still have questions?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-latte/80">
              Our team is here to help. Reach out and we&apos;ll get back to you within 24 hours.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/contact" className="btn-accent w-full sm:w-auto">
                Contact Support
              </Link>
              <a
                href="mailto:kyndacoffee@gmail.com"
                className="btn-secondary w-full sm:w-auto border-cream text-cream hover:bg-cream hover:text-espresso"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
