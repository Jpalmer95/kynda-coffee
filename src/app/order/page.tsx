import Link from "next/link";
import { Coffee, MapPin, ShoppingBag, Users } from "lucide-react";
import { getPosCatalog } from "@/lib/pos/catalog";
import { OrderClient } from "@/components/order/OrderClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order | Kynda Coffee",
  description: "Order from your table, the lobby, curbside pickup, or a parking spot. Fast, simple, and powered by our real-time menu.",
};

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const catalog = await getPosCatalog({ channel: "qr", includeModifiers: true, limit: 500 });
  const categories = catalog.categories.filter((c) => c.items.length > 0);
  const itemCount = catalog.items.length;

  const modeParam = typeof params.mode === "string" ? params.mode : undefined;
  const labelParam = typeof params.label === "string" ? params.label : undefined;

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-bronze/10 text-forest">
            <Coffee className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-forest">
            Fast • Fresh • Yours
          </p>
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-6xl">
            Order at Kynda Coffee
          </h1>
          <p className="mt-4 max-w-prose text-base text-mocha sm:text-lg">
            Choose your fulfillment, add what you love, and pay how you prefer. 
            Great for solo orders, groups at tables, or easy curbside pickup.
          </p>
          <p className="mt-3 text-sm text-mocha">
            {itemCount} items available right now — everything you see is ready to order.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            { icon: MapPin, title: "Table", desc: "Dine-in at one of our tables" },
            { icon: Coffee, title: "Lobby", desc: "Order while you relax or wait" },
            { icon: ShoppingBag, title: "Curbside", desc: "We'll bring it out to your car" },
            { icon: Users, title: "Parking Spot", desc: "Quick handoff from the lot" },
          ].map((mode) => (
            <div key={mode.title} className="rounded-2xl border border-latte/20 bg-card p-5 shadow-sm">
              <mode.icon className="h-6 w-6 text-forest" aria-hidden="true" />
              <h3 className="mt-3 font-heading text-xl font-semibold text-espresso">{mode.title}</h3>
              <p className="mt-1 text-sm text-mocha">{mode.desc}</p>
            </div>
          ))}
        </div>

        <OrderClient
          categories={categories}
          generatedAt={catalog.generatedAt}
          initialMode={modeParam}
          initialLabel={labelParam}
        />

        <div className="mt-10 flex flex-col items-center gap-4 text-center text-sm text-mocha">
          <Link href="/menu" className="btn-secondary">
            Back to full menu
          </Link>
          <p className="max-w-xs text-xs">
            Don&apos;t want to order online? Just come to the counter — we&apos;re happy to help in person.
          </p>
        </div>
      </div>
    </section>
  );
}
