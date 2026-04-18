"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Truck, Coffee, Heart, ChevronDown } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { useProducts } from "@/hooks/useProducts";

function FeaturedProducts() {
  const { products, loading } = useProducts({ featured: true, limit: 4 });

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-latte/20 bg-white">
            <div className="aspect-square rounded-t-2xl bg-latte/20" />
            <div className="p-5 space-y-3">
              <div className="h-3 w-16 rounded bg-latte/20" />
              <div className="h-5 w-3/4 rounded bg-latte/20" />
              <div className="h-5 w-16 rounded bg-latte/20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-espresso">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-espresso via-espresso/90 to-mocha/40" />
        {/* Texture pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="animate-fade-in">
            <p className="mb-6 inline-block rounded-full border border-latte/30 px-4 py-1.5 text-sm font-medium uppercase tracking-widest text-latte">
              Organic Specialty Coffee · Est. 2020 · Horseshoe Bay, TX
            </p>
            <h1 className="font-heading text-5xl font-bold leading-[1.1] text-cream sm:text-6xl lg:text-7xl">
              Every Cup
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-rust">Tells a Story</span>
                <span className="absolute -bottom-1 left-0 h-3 w-full bg-rust/20" />
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-latte/80">
              Hand-selected micro-lot roasts using only the top 5% of coffee beans
              from around the world. Locally roasted, organic, and crafted with care.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/shop" className="btn-primary text-base px-8 py-4">
                Shop Coffee Beans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/menu" className="btn-secondary border-cream text-cream hover:bg-cream hover:text-espresso text-base px-8 py-4">
                View Our Menu
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="h-6 w-6 text-latte/40" />
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="section-padding relative">
        <div className="container-max">
          <div className="grid gap-8 md:grid-cols-3">
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
                className="group relative overflow-hidden rounded-2xl border border-latte/20 bg-white p-8 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${item.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cream">
                    <item.icon className="h-8 w-8 text-rust" />
                  </div>
                  <h3 className="mt-5 font-heading text-xl font-semibold text-espresso">
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
          <div className="mb-12 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-rust">
              Fresh Picks
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold text-espresso sm:text-4xl">
              Freshly Roasted, Ready to Ship
            </h2>
            <p className="mt-3 text-mocha">
              Subscribe to Coffee Club and save 10% on every delivery.
            </p>
          </div>

          <FeaturedProducts />

          <div className="mt-10 text-center">
            <Link href="/shop" className="btn-primary">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* AI Design Studio CTA */}
      <section className="section-padding">
        <div className="container-max">
          <div className="overflow-hidden rounded-3xl bg-espresso">
            <div className="grid items-center lg:grid-cols-2">
              <div className="p-8 sm:p-12 lg:p-16">
                <p className="text-sm font-medium uppercase tracking-widest text-rust">
                  New Feature
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-cream sm:text-4xl">
                  Design Your Own
                  <br />
                  Kynda Merch
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-latte/70">
                  Browse trending designs, generate unique patterns with AI, and see
                  your creation on mugs, tees, glassware, and more. Every piece is
                  made to order.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link href="/studio" className="btn-accent text-base px-8 py-4">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Open Design Studio
                  </Link>
                  <Link href="/shop" className="btn-secondary border-cream text-cream hover:bg-cream hover:text-espresso text-base px-8 py-4">
                    Shop Core Collection
                  </Link>
                </div>
              </div>
              {/* Visual placeholder — will be a product mockup carousel */}
              <div className="hidden lg:block">
                <div className="relative h-full min-h-[400px] bg-gradient-to-br from-rust/20 to-latte/10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-4 p-8">
                      {["🎨", "☕", "👕", "🥃"].map((emoji, i) => (
                        <div
                          key={i}
                          className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/10 text-4xl backdrop-blur-sm transition-transform duration-300 hover:scale-110"
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
            <Truck className="mx-auto h-12 w-12 text-rust" />
            <h2 className="mt-4 font-heading text-3xl font-bold text-espresso sm:text-4xl">
              Skip the Line
            </h2>
            <p className="mt-3 text-lg text-mocha">
              Order ahead for pickup or get Kynda delivered via DoorDash and Uber Eats.
              Scan the QR code in-store or order right here.
            </p>
            <div className="mt-8">
              <Link href="/menu" className="btn-primary text-base px-8 py-4">
                Order for Pickup
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Community */}
      <section className="section-padding">
        <div className="container-max text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-rust">
            From the Texas Hill Country
          </p>
          <h2 className="mt-2 font-heading text-3xl font-bold text-espresso sm:text-4xl">
            Built with Passion, Poured with Love
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-mocha">
            Started in 2020 with zero funding and a dream. Six years later,
            Kynda Coffee is a community staple — organic, local, and always honest.
          </p>
          <div className="mt-10 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="font-heading text-4xl font-bold text-espresso">6+</p>
              <p className="text-sm text-mocha">Years Strong</p>
            </div>
            <div className="h-12 w-px bg-latte/30" />
            <div className="text-center">
              <p className="font-heading text-4xl font-bold text-espresso">100%</p>
              <p className="text-sm text-mocha">Organic Beans</p>
            </div>
            <div className="h-12 w-px bg-latte/30" />
            <div className="text-center">
              <p className="font-heading text-4xl font-bold text-espresso">Top 5%</p>
              <p className="text-sm text-mocha">Micro-Lot Quality</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
