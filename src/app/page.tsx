import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Truck, Coffee, Heart } from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-espresso">
        <div className="absolute inset-0 bg-[url('/images/hero-coffee.jpg')] bg-cover bg-center opacity-40" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-latte">
            Organic Specialty Coffee · Est. 2020 · Horseshoe Bay, TX
          </p>
          <h1 className="font-heading text-5xl font-bold leading-tight text-cream sm:text-6xl lg:text-7xl">
            Every Cup
            <br />
            <span className="text-rust">Tells a Story</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-latte/80">
            Hand-selected micro-lot roasts using only the top 5% of coffee beans
            from around the world. Locally roasted, organic, and crafted with care.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/shop" className="btn-primary">
              Shop Coffee Beans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/menu" className="btn-secondary border-cream text-cream hover:bg-cream hover:text-espresso">
              View Our Menu
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="section-padding">
        <div className="container-max">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Coffee,
                title: "Micro-Lot Quality",
                description:
                  "Only the top 5% of beans make the cut. Rich, smooth flavors from bold full-bodied roasts to mellow fruity notes.",
              },
              {
                icon: Heart,
                title: "Organic & Local",
                description:
                  "Our beans are roasted locally with a commitment to quality and freshness. You'll taste it in every sip.",
              },
              {
                icon: Sparkles,
                title: "AI Design Studio",
                description:
                  "Create one-of-a-kind Kynda merch. Browse trends, generate with AI, and customize your own designs.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-latte/20 bg-white p-8 text-center transition-shadow hover:shadow-lg"
              >
                <item.icon className="mx-auto h-10 w-10 text-rust" />
                <h3 className="mt-4 font-heading text-xl font-semibold text-espresso">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-mocha">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Preview */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-bold text-espresso sm:text-4xl">
              Freshly Roasted, Ready to Ship
            </h2>
            <p className="mt-3 text-mocha">
              Subscribe to Coffee Club and save 10% on every delivery.
            </p>
          </div>

          {/* Product grid placeholder — will be populated from Supabase */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Morning Ritual Blend", price: "$18.00", tagline: "Medium roast · Chocolate & Caramel" },
              { name: "Hill Country Dark", price: "$19.00", tagline: "Dark roast · Bold & Smoky" },
              { name: "Sunrise Light", price: "$17.00", tagline: "Light roast · Citrus & Floral" },
              { name: "Kynda Espresso", price: "$20.00", tagline: "Espresso blend · Rich & Creamy" },
            ].map((product) => (
              <div key={product.name} className="group cursor-pointer rounded-2xl border border-latte/20 bg-cream p-6 transition-all hover:shadow-lg">
                <div className="aspect-square rounded-xl bg-latte/20" />
                <h3 className="mt-4 font-heading text-lg font-semibold text-espresso group-hover:text-rust transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-mocha">{product.tagline}</p>
                <p className="mt-2 font-medium text-espresso">{product.price}</p>
              </div>
            ))}
          </div>

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
          <div className="overflow-hidden rounded-3xl bg-espresso p-8 sm:p-12 lg:p-16">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="text-sm font-medium uppercase tracking-widest text-rust">
                  New Feature
                </p>
                <h2 className="mt-2 font-heading text-3xl font-bold text-cream sm:text-4xl">
                  Design Your Own
                  <br />
                  Kynda Merch
                </h2>
                <p className="mt-4 text-latte/70">
                  Browse trending designs, generate unique patterns with AI, and see
                  your creation on mugs, tees, glassware, and more. Every piece is
                  made to order.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link href="/studio" className="btn-accent">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Open Design Studio
                  </Link>
                  <Link href="/shop" className="btn-secondary border-cream text-cream hover:bg-cream hover:text-espresso">
                    Shop Core Collection
                  </Link>
                </div>
              </div>
              <div className="aspect-square rounded-2xl bg-latte/10" />
            </div>
          </div>
        </div>
      </section>

      {/* Order Online CTA */}
      <section className="section-padding bg-white">
        <div className="container-max text-center">
          <Truck className="mx-auto h-12 w-12 text-rust" />
          <h2 className="mt-4 font-heading text-3xl font-bold text-espresso sm:text-4xl">
            Skip the Line
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-mocha">
            Order ahead for pickup or get Kynda delivered via DoorDash and Uber Eats.
            Scan the QR code in-store or order right here.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/menu" className="btn-primary">
              Order for Pickup
            </Link>
            <Link href="/catering" className="btn-secondary">
              Cater Your Event
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
