"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Coffee,
  Heart,
  Star,
  MapPin,
  Mail,
  Loader2,
  CheckCircle,
  Package,
  Palette,
  BookOpen,
  Gift,
  ShoppingBag,
} from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { QuickViewModal } from "@/components/shop/QuickViewModal";
import { useProducts } from "@/hooks/useProducts";
import { RecentlyViewedStrip } from "@/components/shop/RecentlyViewed";
import type { Product } from "@/types";

function FeaturedProducts({ onQuickView }: { onQuickView: (product: Product) => void }) {
  const { products, loading } = useProducts({ featured: true, limit: 4 });

  if (loading) {
    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border/20 bg-card">
            <div className="aspect-square rounded-t-xl bg-muted" />
            <div className="p-4 sm:p-5 space-y-3">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-border/20 bg-card p-10 text-center">
        <Coffee className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 font-heading text-xl font-semibold text-foreground">
          Fresh roasts are ready in the shop
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore our full lineup of organic beans, subscriptions, and merchandise.
        </p>
        <Link href="/shop" className="btn-primary mt-5 inline-flex">
          Browse Full Shop
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
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
        throw new Error(typeof data.error === "string" ? data.error : "Failed to subscribe");
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section className="section-padding bg-surface">
      <div className="container-max max-w-2xl mx-auto text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
          <Mail className="h-6 w-6 text-sand" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-heading text-2xl sm:text-3xl font-bold text-sand">
          Stay in the Loop
        </h2>
        <p className="mt-2 text-base text-sand/85">
          Get seasonal micro-lot drops, grand opening updates, and subscriber-only roasts delivered to your inbox.
        </p>

        {status === "success" ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-sage/20 p-4 text-sand">
            <CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="font-medium">You&apos;re subscribed! Welcome to the Kynda family.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
            <label htmlFor="home-newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="home-newsletter-email"
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field flex-1 bg-white/10 border-white/25 text-sand placeholder:text-sand/60 focus:border-sand focus:ring-sand"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="btn-accent whitespace-nowrap px-7"
            >
              {status === "submitting" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Subscribe
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <p className="mt-4 text-xs text-sand/70">
          No spam, ever. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}

const EXPERIENCE_CARDS = [
  {
    href: "/shop/coffee-beans",
    icon: Coffee,
    label: "Small-Batch Roasts",
    title: "Organic Coffee Beans",
    description: "Single-origin & signature blends roasted fresh and shipped nationwide.",
  },
  {
    href: "/shop/merch",
    icon: ShoppingBag,
    label: "Designed In-House",
    title: "Kynda Merch",
    description: "Heirloom ceramic mugs, soft tees, totes, and everyday café staples.",
  },
  {
    href: "/studio",
    icon: Palette,
    label: "Made to Order",
    title: "Custom Design Studio",
    description: "Personalize your own mug, hoodie, or tote with Kynda artwork.",
  },
  {
    href: "/menu",
    icon: BookOpen,
    label: "Horseshoe Bay Café",
    title: "Explore the Menu",
    description: "Browse our handcrafted espresso drinks, cold brew, and scratch pastries.",
  },
];

export default function HomePage() {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  return (
    <>
      {/* Editorial UI-First Hero */}
      <section className="relative overflow-hidden bg-background pt-6 pb-14 sm:pt-10 sm:pb-20 lg:pt-14 lg:pb-24">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left: Editorial copy & primary actions */}
            <div className="lg:col-span-7 animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-card px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                Organic Specialty Coffee · Est. 2020 · Horseshoe Bay, TX
              </div>

              <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight leading-[1.06] text-foreground sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
                Every Cup{" "}
                <span className="italic font-normal text-primary">
                  Tells a Story.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Hand-selected organic micro-lot roasts crafted from the top 5% of
                coffee harvests worldwide. Roasted locally in the Texas Hill
                Country and shipped fresh to your door.
              </p>

              {/* Primary CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <Link
                  href="/shop/coffee-beans"
                  className="btn-primary w-full sm:w-auto px-7 py-3.5 text-base"
                >
                  Shop Coffee Beans
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/menu"
                  className="btn-secondary w-full sm:w-auto px-7 py-3.5 text-base"
                >
                  Explore the Menu
                </Link>
              </div>

              {/* Trust / Craft Proof Bar */}
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/20 pt-6 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-foreground">4.9</strong> (200+ local reviews)
                  </span>
                </div>
                <span className="hidden sm:inline text-border" aria-hidden="true">·</span>
                <div className="flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>100% Organic Micro-Lot</span>
                </div>
                <span className="hidden sm:inline text-border" aria-hidden="true">·</span>
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Free US Shipping $50+</span>
                </div>
              </div>
            </div>

            {/* Right: Framed Visual Showcase */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border/20 bg-card shadow-hover">
                  <img
                    src="/images/hero-coffee.jpg"
                    alt="Specialty coffee being poured into a ceramic cup at Kynda Coffee"
                    className="h-full w-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                    <div className="text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
                        Texas Hill Country
                      </p>
                      <p className="font-heading text-lg font-semibold leading-snug">
                        Small-Batch Organic Craft
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tactile Coffee Club floating card */}
                <Link
                  href="/shop"
                  className="group mt-4 flex items-center gap-3.5 rounded-xl border border-border/20 bg-card p-3.5 shadow-soft transition-all duration-200 hover:shadow-hover sm:absolute sm:-bottom-5 sm:-left-6 sm:mt-0 sm:max-w-[270px] sm:bg-card/95 sm:backdrop-blur-md"
                >
                  <img
                    src="/images/coffee-beans.jpg"
                    alt="Freshly roasted Kynda Coffee beans"
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Coffee Club
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      Save 10% on every roast
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      Shop subscriptions
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience / Category Bento Strip */}
      <section className="border-y border-border/15 bg-card/60 py-10 sm:py-14">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXPERIENCE_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group card-lift flex flex-col justify-between rounded-xl border border-border/20 bg-background p-5 sm:p-6 shadow-soft transition-colors hover:border-primary/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <card.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {card.label}
                  </p>
                  <h2 className="mt-1 font-heading text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products — Live from DB with Quick View */}
      <section className="section-padding bg-background">
        <div className="container-max">
          <div className="mb-8 sm:mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary">
                Fresh Picks
              </p>
              <h2 className="mt-1.5 font-heading text-2xl sm:text-3xl font-bold text-foreground lg:text-4xl">
                Freshly Roasted, Ready to Ship
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                Tap any product to quick-view, choose your grind, or subscribe to Coffee Club for 10% off.
              </p>
            </div>
            <Link
              href="/shop"
              className="btn-secondary self-start sm:self-auto whitespace-nowrap"
            >
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <FeaturedProducts onQuickView={setQuickViewProduct} />
        </div>
      </section>

      {/* Recently Viewed */}
      <RecentlyViewedStrip />

      {/* Take Kynda Home — Real Product Photography Showcase */}
      <section className="section-padding bg-card/60">
        <div className="container-max">
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl bg-surface shadow-hover">
            <div className="grid items-center lg:grid-cols-12">
              <div className="p-6 sm:p-10 lg:col-span-6 lg:p-14">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-sand/75">
                  Crafted &amp; Made to Order
                </p>
                <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-bold leading-tight text-sand">
                  Take Kynda Home
                  <br />
                  With You
                </h2>
                <p className="mt-4 text-base leading-relaxed text-sand/85">
                  Bags of our signature organic roasts, stoneware mugs, apparel,
                  and totes — designed in-house and shipped anywhere in the US.
                </p>
                <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3">
                  <Link href="/shop/merch" className="btn-accent px-6 py-3.5 text-base">
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    Shop Kynda Merch
                  </Link>
                  <Link
                    href="/studio"
                    className="inline-flex items-center justify-center rounded-md border border-sand/50 bg-transparent px-6 py-3.5 text-base font-semibold text-sand transition-colors duration-200 hover:bg-sand hover:text-surface focus:outline-none focus:ring-2 focus:ring-sand focus:ring-offset-2 focus:ring-offset-surface"
                  >
                    Open Design Studio
                  </Link>
                </div>
              </div>

              {/* Editorial photo collage (replaces emojis) */}
              <div className="grid grid-cols-2 gap-3 p-6 pt-0 sm:gap-4 sm:p-10 sm:pt-0 lg:col-span-6 lg:p-10">
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <img
                    src="/images/ceramic-mug.jpg"
                    alt="Kynda Coffee handcrafted ceramic mug"
                    className="h-52 sm:h-72 w-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10 sm:translate-y-4">
                  <img
                    src="/images/coffee-beans.jpg"
                    alt="Small-batch organic roasted coffee beans"
                    className="h-52 sm:h-72 w-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Craft Pillars */}
      <section className="section-padding bg-background">
        <div className="container-max">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary">
              The Kynda Standard
            </p>
            <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground lg:text-4xl">
              Crafted for Every Morning Ritual
            </h2>
          </div>

          <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
            {[
              {
                icon: Coffee,
                title: "Micro-Lot Quality",
                description:
                  "Only the top 5% of beans make the cut — rich, balanced profiles from bold full-bodied espressos to bright single-origins.",
              },
              {
                icon: Heart,
                title: "100% Organic & Local",
                description:
                  "Roasted locally in the Texas Hill Country with clean, honest ingredients and a deep respect for every grower.",
              },
              {
                icon: Gift,
                title: "Gifting & Subscriptions",
                description:
                  "Send digital gift cards instantly or schedule recurring bean deliveries with Coffee Club savings built in.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border/20 bg-card p-6 sm:p-8 shadow-soft"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-heading text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story & Community Proof */}
      <section className="border-t border-border/15 bg-card/60 section-padding">
        <div className="container-max">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary">
                From the Texas Hill Country
              </p>
              <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground lg:text-4xl">
                Built with Passion, Poured with Love
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Started in 2020 with zero funding and a dream. Six years later,
                Kynda Coffee is a Horseshoe Bay community staple — organic,
                local, and always honest.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Horseshoe Bay, TX · Opening our new home at 4909 RM 2147</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/about" className="btn-secondary">
                  Read Our Story
                </Link>
                <Link href="/gift-cards" className="btn-ghost text-foreground">
                  Send a Gift Card
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:col-span-6">
              {[
                { stat: "6+", label: "Years in Horseshoe Bay" },
                { stat: "100%", label: "Organic Specialty Beans" },
                { stat: "Top 5%", label: "Micro-Lot Harvests" },
                { stat: "4.9 ★", label: "From 200+ Local Reviews" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/20 bg-background p-5 sm:p-6 shadow-soft"
                >
                  <p className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                    {item.stat}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSection />

      {/* Product Quick-View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </>
  );
}
