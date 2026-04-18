import Link from "next/link";
import type { ProductCategory } from "@/types";

const CATEGORIES: { slug: ProductCategory; name: string; description: string }[] = [
  {
    slug: "coffee-beans",
    name: "Coffee Beans",
    description: "Micro-lot organic roasts, freshly roasted and ready to brew.",
  },
  {
    slug: "merch-apparel",
    name: "Apparel",
    description: "Tees, hoodies, and hats. Design your own or shop our core collection.",
  },
  {
    slug: "merch-mugs",
    name: "Mugs & Cups",
    description: "Ceramic, travel, and custom-printed mugs for every morning.",
  },
  {
    slug: "merch-glassware",
    name: "Glassware",
    description: "Cold brew glasses, espresso cups, and more.",
  },
  {
    slug: "subscription",
    name: "Coffee Club",
    description: "Monthly subscription — fresh roasts delivered, 10% off always.",
  },
];

export default function ShopPage() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Shop Kynda
          </h1>
          <p className="mt-3 text-lg text-mocha">
            Coffee, merch, and custom designs — shipped to your door.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop/${cat.slug}`}
              className="group rounded-2xl border border-latte/20 bg-white p-8 transition-all hover:shadow-lg"
            >
              <div className="aspect-video rounded-xl bg-latte/20" />
              <h2 className="mt-4 font-heading text-xl font-semibold text-espresso group-hover:text-rust transition-colors">
                {cat.name}
              </h2>
              <p className="mt-1 text-sm text-mocha">{cat.description}</p>
            </Link>
          ))}
        </div>

        {/* Design Studio Promo */}
        <div className="mt-16 rounded-3xl bg-espresso p-8 text-center sm:p-12">
          <h2 className="font-heading text-2xl font-bold text-cream sm:text-3xl">
            Want Something Unique?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-latte/70">
            Head to the Design Studio to create your own custom merch with AI.
          </p>
          <Link
            href="/studio"
            className="btn-accent mt-6 inline-flex"
          >
            Open Design Studio
          </Link>
        </div>
      </div>
    </section>
  );
}
