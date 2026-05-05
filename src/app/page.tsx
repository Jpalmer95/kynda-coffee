"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Truck, Coffee, Heart, ChevronDown, Star, MapPin, Mail, Loader2, CheckCircle } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { RecentlyViewedStrip } from "@/components/shop/RecentlyViewed";

function FeaturedProducts() {
  const { products, loading } = useProducts({ featured: true, limit: 4 });

  if (loading) {
    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-latte/20 bg-white">
            <div className="aspect-square rounded-t-2xl bg-latte/10" />
            <div className="p-4 sm:p-5 space-y-3">
              <div className="h-3 w-16 rounded bg-latte/10" />
              <div className="h-5 w-3/4 rounded bg-latte/20" />
              <div className="h-4 w-1/4 rounded bg-latte/20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    setError("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to subscribe");
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section className="section-padding bg-espresso">
      <div className="container-max max-w-2xl mx-auto text-center">
        <Mail className="mx-auto h-8 w-8 text-rust" aria-hidden="true" />
        <h2 className="mt-4 font-heading text-2xl sm:text-3xl font-bold text-cream">
          Stay in the Loop
        </h2>
        <p className="mt-2 text-base text-latte/80">
          Get exclusive drops, seasonal roasts, and subscriber-only deals delivered to your inbox.
        </p>

        {status === "success" ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-sage/20 p-4 text-sage">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">You're subscribed! Welcome to the family.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field flex-1 bg-white/10 border-white/20 text-cream placeholder:text-latte/50 focus:border-rust"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="btn-accent whitespace-nowrap"
            >
              {status === "submitting" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Subscribe
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        )}

        <p className="mt-4 text-xs text-latte/50">
          No spam, ever. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[70vh] sm:min-h-[85vh] items-center justify-center overflow-hidden">
        {/* Hero image */}
        <div className="absolute inset-0">
          <img
            src="/images/hero-coffee.jpg"
            alt="Specialty coffee being poured into a ceramic cup"
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/90 via-espresso/70 to-espresso/40" />
        </div>
        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <div className="animate-fade-in">
            <p className="mb-4 sm:mb-6 inline-block rounded-full border border-latte/30 px-3 py-1.5 text-xs sm:text-sm font-medium uppercase tracking-widest text-latte">
              Organic Specialty Coffee · Est. 2020 · Horseshoe Bay, TX
            </p>
            <h1 className="font-heading text-4xl font-bold leading-[1.1] text-cream sm:text-6xl lg:text-7xl">
              Every Cup
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-rust">Tells a Story</span>
                <span className="absolute -bottom-1 left-0 h-2 sm:h-3 w-full bg-rust/20" />
              </span>
            </h1>
            <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-latte/80">
              Hand-selected micro-lot roasts using only the top 5% of coffee beans
              from around the world. Locally roasted, organic, and crafted with care.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/shop" className="btn-primary w-full sm:w-auto text-base px-8 py-4">
                Shop Coffee Beans
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/menu" className="btn-secondary w-full sm:w-auto border-cream text-cream hover:bg-cream hover:text-espresso text-base px-8 py-4">
                View Our Menu
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="h-6 w-6 text-latte/40" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="section-padding relative">
        <div className="container-max">
          <div className="grid gap-4 sm:gap-8 md:grid-cols-3">
            {[
              {
                icon: Coffee,
                title: "Micro-Lot Quality",
                description:
                  "Only the top 5% of beans make the cut. Rich, smooth flavors from bold full-bodied roasts to mellow fruity notes.",
                accent: "from-amber-500/10 to-transparent",
              },
              {
                icon: Heart,
                title: "Organic & Local",
                description:
                  "Our beans are roasted locally with a commitment to quality and freshness. You'll taste it in every sip.",
                accent: "from-sage/10 to-transparent",
              },
              {
                icon: Sparkles,
                title: "AI Design Studio",
                description:
                  "Create one-of-a-kind Kynda merch. Browse trends, generate with AI, and customize your own designs.",
                accent: "from-rust/10 to-transparent",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-[24px] border border-latte/10 bg-white p-6 sm:p-8 text-center transition-all duration-300 hover:shadow-hover hover:-translate-y-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${item.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative">
                  <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-cream">
                    <item.icon className="h-7 w-7 sm:h-8 sm:w-8 text-rust" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 sm:mt-5 font-heading text-lg sm:text-xl font-semibold text-espresso">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-mocha">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products — Live from DB */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <div className="mb-8 sm:mb-12 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-rust">
              Fresh Picks
            </p>
            <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-espresso lg:text-4xl">
              Freshly Roasted, Ready to Ship
            </h2>
            <p className="mt-3 text-sm sm:text-base text-mocha">
              Subscribe to Coffee Club and save 10% on every delivery.
            </p>
          </div>

          <FeaturedProducts />

          <div className="mt-8 sm:mt-10 text-center">
            <Link href="/shop" className="btn-primary">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      <RecentlyViewedStrip />

      {/* AI Design Studio CTA */}
      <section className="section-padding">
        <div className="container-max">
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl bg-espresso">
            <div className="grid items-center lg:grid-cols-2">
              <div className="p-6 sm:p-12 lg:p-16">
                <p className="text-xs sm:text-sm font-medium uppercase tracking-widest text-rust">
                  New Feature
                </p>
                <h2 className="mt-3 font-heading text-2xl sm:text-3xl font-bold leading-tight text-cream lg:text-4xl">
                  Design Your Own
                  <br />
                  Kynda Merch
                </h2>
                <p className="mt-4 text-base sm:text-lg leading-relaxed text-latte/70">
                  Browse trending designs, generate unique patterns with AI, and see
                  your creation on mugs, tees, glassware, and more. Every piece is
                  made to order.
                </p>
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                  <Link href="/studio" className="btn-accent text-base px-6 sm:px-8 py-3.5 sm:py-4">
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    Open Design Studio
                  </Link>
                  <Link href="/shop" className="btn-secondary border-cream text-cream hover:bg-cream hover:text-espresso text-base px-6 sm:px-8 py-3.5 sm:py-4">
                    Shop Core Collection
                  </Link>
                </div>
              </div>
              {/* Visual mockup */}
              <div className="hidden lg:block">
                <div className="relative h-full min-h-[400px] bg-gradient-to-br from-rust/20 to-latte/10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-4 p-8">
                      {["🎨", "☕", "👕", "🥃"].map((emoji, i) => (
                        <div
                          key={i}
                          className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl bg-white/10 text-4xl backdrop-blur-sm transition-transform duration-300 hover:scale-110"
                        >
                          {emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Online CTA */}
      <section className="section-padding bg-white">
        <div className="container-max text-center">
          <div className="mx-auto max-w-2xl">
            <Truck className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-rust" aria-hidden="true" />
            <h2 className="mt-4 font-heading text-2xl sm:text-3xl font-bold text-espresso lg:text-4xl">
              Skip the Line
            </h2>
            <p className="mt-3 text-base sm:text-lg text-mocha">
              Order ahead for pickup or get Kynda delivered via DoorDash and Uber Eats.
              Scan the QR code in-store or order right here.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/menu" className="btn-primary w-full sm:w-auto text-base px-8 py-4">
                Order for Pickup
              </Link>
              <a
                href="https://www.doordash.com/store/kynda-coffee-horseshoe-bay-123456/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full sm:w-auto text-base px-8 py-4"
              >
                DoorDash Delivery
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSection />

      {/* Social Proof / Community */}
      <section className="section-padding">
        <div className="container-max text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-rust">
            From the Texas Hill Country
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-espresso lg:text-4xl">
            Built with Passion, Poured with Love
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-mocha">
            Started in 2020 with zero funding and a dream. Six years later,
            Kynda Coffee is a community staple — organic, local, and always honest.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            <div className="text-center">
              <p className="font-heading text-3xl sm:text-4xl font-bold text-espresso">6+</p>
              <p className="text-sm text-mocha">Years Strong</p>
            </div>
            <div className="h-10 sm:h-12 w-px bg-latte/30" />
            <div className="text-center">
              <p className="font-heading text-3xl sm:text-4xl font-bold text-espresso">100%</p>
              <p className="text-sm text-mocha">Organic Beans</p>
            </div>
            <div className="h-10 sm:h-12 w-px bg-latte/30" />
            <div className="text-center">
              <p className="font-heading text-3xl sm:text-4xl font-bold text-espresso">Top 5%</p>
              <p className="text-sm text-mocha">Micro-Lot Quality</p>
            </div>
          </div>

          {/* Reviews teaser */}
          <div className="mt-10 sm:mt-12 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-5 w-5 fill-rust text-rust" aria-hidden="true" />
              ))}
            </div>
            <p className="text-sm text-mocha">
              <span className="font-semibold text-espresso">4.9</span> out of 5 from 200+ local reviews
            </p>
            <div className="flex items-center gap-1 text-sm text-mocha">
              <MapPin className="h-4 w-4 text-rust" aria-hidden="true" />
              <span>4315 FM 2147, Horseshoe Bay, TX</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
