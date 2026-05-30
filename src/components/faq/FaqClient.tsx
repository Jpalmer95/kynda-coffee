"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

const CATEGORY_ORDER = [
  "Ordering",
  "Shipping & Delivery",
  "Returns & Refunds",
  "Loyalty Program",
  "Custom Merch",
  "Gift Cards",
  "General",
];

const FAQ_DATA: FaqItem[] = [
  // Ordering
  {
    category: "Ordering",
    q: "How do I place an order?",
    a: "You can order in-store, through our website, or via our mobile-friendly PWA. Select your fulfillment mode (dine-in, curbside, pickup, delivery) and we'll have it ready when you arrive.",
  },
  {
    category: "Ordering",
    q: "Can I order ahead for pickup?",
    a: "Yes! Place your order online and select 'Pickup' or 'Curbside'. We'll notify you when it's ready. Curbside orders require your vehicle description so we can find you.",
  },
  {
    category: "Ordering",
    q: "Do you offer delivery?",
    a: "We partner with DoorDash and Uber Eats for delivery within the Horseshoe Bay area. You can also order directly through their apps.",
  },
  {
    category: "Ordering",
    q: "Can I customize my drink?",
    a: "Absolutely! When ordering online, you'll see all available modifiers (milk options, syrups, extra shots, etc.). Single-select options like coffee bean type appear as radio buttons; multi-select options like syrups appear as checkboxes.",
  },

  // Shipping & Delivery
  {
    category: "Shipping & Delivery",
    q: "Do you ship coffee beans?",
    a: "Yes! We ship whole bean and ground coffee anywhere in the US via USPS Priority Mail. Orders typically arrive in 2-4 business days.",
  },
  {
    category: "Shipping & Delivery",
    q: "What are your shipping rates?",
    a: "Standard shipping is $5.99. Free shipping on orders over $50. Custom merch items have separate shipping calculated at checkout based on Printful's rates.",
  },
  {
    category: "Shipping & Delivery",
    q: "How long does shipping take?",
    a: "Coffee beans ship within 1-2 business days. Custom merch (mugs, apparel, etc.) is made-to-order and ships in 3-7 business days from Printful's fulfillment centers.",
  },
  {
    category: "Shipping & Delivery",
    q: "Can I track my order?",
    a: "Yes! You'll receive a tracking email when your order ships. You can also track orders at kyndacoffee.com/track-order.",
  },

  // Returns & Refunds
  {
    category: "Returns & Refunds",
    q: "What's your return policy?",
    a: "Coffee beans: we accept returns within 14 days if unopened. Custom merch: due to the personalized nature, we cannot accept returns unless the item is defective or arrived damaged.",
  },
  {
    category: "Returns & Refunds",
    q: "My order arrived damaged. What should I do?",
    a: "Email us at hello@kyndacoffee.com with photos of the damage within 48 hours of delivery. We'll send a replacement or issue a full refund.",
  },
  {
    category: "Returns & Refunds",
    q: "How long do refunds take?",
    a: "Refunds are processed within 3-5 business days of receiving your returned item. You'll see the credit on your original payment method within 5-10 business days.",
  },

  // Loyalty Program
  {
    category: "Loyalty Program",
    q: "How does the loyalty program work?",
    a: "Earn 1 point per $1 spent. Redeem 100 points for $5 off your next order. Points never expire as long as you make a purchase at least once every 12 months.",
  },
  {
    category: "Loyalty Program",
    q: "How do I check my points balance?",
    a: "Sign in to your account at kyndacoffee.com/account to view your current points, tier status, and redemption history.",
  },
  {
    category: "Loyalty Program",
    q: "Can I use points and a promo code together?",
    a: "No, loyalty points and promo codes cannot be stacked. Choose whichever gives you the better discount.",
  },
  {
    category: "Loyalty Program",
    q: "What are the loyalty tiers?",
    a: "Bronze (0-499 pts): 1 pt/$1. Silver (500-999 pts): 1.2 pts/$1. Gold (1000+ pts): 1.5 pts/$1 + free birthday drink.",
  },

  // Custom Merch
  {
    category: "Custom Merch",
    q: "How does the Design Studio work?",
    a: "Visit kyndacoffee.com/studio to design custom merch. Upload your own artwork or generate AI designs. Choose from mugs, tees, hoodies, posters, and more. Preview your design on real product mockups before ordering.",
  },
  {
    category: "Custom Merch",
    q: "Can I upload my own design?",
    a: "Yes! Upload PNG, JPG, or SVG files. For best results, use transparent PNG at 300dpi. We support up to 10MB per file.",
  },
  {
    category: "Custom Merch",
    q: "What if I don't have design skills?",
    a: "Use our AI design generator! Enter a text prompt (e.g., 'geometric coffee bean pattern, minimalist') and we'll create unique designs for you. You can also browse our preset gallery for inspiration.",
  },
  {
    category: "Custom Merch",
    q: "Who prints and ships custom merch?",
    a: "We partner with Printful, a print-on-demand service. They handle printing, quality control, and shipping directly to you. This means no inventory waste and fresh products every time.",
  },

  // Gift Cards
  {
    category: "Gift Cards",
    q: "Do you sell gift cards?",
    a: "Yes! Digital gift cards are available at kyndacoffee.com/gift-cards in denominations of $10, $25, $50, and $100. They're delivered instantly via email.",
  },
  {
    category: "Gift Cards",
    q: "Do gift cards expire?",
    a: "No, Kynda gift cards never expire.",
  },
  {
    category: "Gift Cards",
    q: "Can I use a gift card for custom merch?",
    a: "Gift cards can be used for coffee beans, subscriptions, and in-store purchases. Custom merch is processed separately via Printful and requires a credit card.",
  },

  // General
  {
    category: "General",
    q: "What are your hours?",
    a: "We're open daily from 7:00 AM to 5:00 PM at 4315 FM 2147, Horseshoe Bay, TX. See our location page for directions and parking info.",
  },
  {
    category: "General",
    q: "Do you have Wi-Fi?",
    a: "Yes! Free Wi-Fi is available for all customers. Ask a barista for the password.",
  },
  {
    category: "General",
    q: "Are you hiring?",
    a: "Check our careers page for current openings. We're always looking for passionate baristas and creative folks to join the team.",
  },
  {
    category: "General",
    q: "Do you host events?",
    a: "We occasionally host latte art workshops, coffee tastings, and community events. Follow us on Instagram @kyndacoffee for announcements.",
  },
  {
    category: "General",
    q: "Can I bring my laptop and work?",
    a: "Absolutely! We have outlets and a welcoming atmosphere for remote workers. Just be mindful of table turnover during peak hours (8-10 AM).",
  },
];

export function FaqClient() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return FAQ_DATA;
    return FAQ_DATA.filter(
      (item) =>
        item.q.toLowerCase().includes(term) ||
        item.a.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const groups: Record<string, FaqItem[]> = {};
    filtered.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    // Sort by CATEGORY_ORDER
    return CATEGORY_ORDER.filter((cat) => groups[cat]).map((cat) => ({
      category: cat,
      items: groups[cat],
    }));
  }, [filtered]);

  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="relative bg-surface px-6 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800">
            <HelpCircle className="h-8 w-8 text-sand" />
          </div>
          <h1 className="font-heading text-4xl font-semibold text-sand sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-lg text-sand/80">
            Everything you need to know about Kynda Coffee
          </p>

          {/* Search */}
          <div className="relative mx-auto mt-8 max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sand/60" />
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-0 bg-background/90 py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-sand/50 focus:outline-none"
              aria-label="Search frequently asked questions"
            />
          </div>
        </div>
      </section>

      {/* FAQ CONTENT */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 font-heading text-lg text-muted-foreground">
                No results for &quot;{search}&quot;
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different search term or{" "}
                <a href="/contact" className="text-primary hover:underline">
                  contact us
                </a>{" "}
                directly.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map((group) => (
                <div key={group.category}>
                  <h2 className="mb-4 font-heading text-2xl font-semibold text-foreground">
                    {group.category}
                  </h2>
                  <div className="space-y-2">
                    {group.items.map((item, idx) => {
                      const id = `${group.category}-${idx}`;
                      const expanded = expandedId === id;
                      return (
                        <div
                          key={id}
                          className="rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : id)}
                            className="flex w-full items-center justify-between p-4 text-left"
                            aria-expanded={expanded}
                          >
                            <span className="pr-4 font-medium text-foreground">{item.q}</span>
                            {expanded ? (
                              <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                            )}
                          </button>
                          {expanded && (
                            <div className="border-t border-border px-4 pb-4 pt-3">
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {item.a}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact CTA */}
          <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
            <h3 className="font-heading text-xl font-semibold text-foreground">
              Still have questions?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We're here to help. Reach out anytime.
            </p>
            <a
              href="/contact"
              className="btn-accent mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
