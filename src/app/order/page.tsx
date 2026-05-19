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
        <div className="mx-auto max-w-3xl text-center flex flex-col items-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[12px] bg-[surface-card] border border-[latte] text-[forest] shadow-[0_0_20px_rgba(74,222,128,0.1)]">
            <Coffee className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[forest]">
            Fast • Fresh • Yours
          </p>
          <h1 className="font-heading text-4xl font-bold text-sand sm:text-6xl tracking-tight">
            Order at Kynda Coffee
          </h1>
          <p className="mt-5 max-w-prose text-base text-[mocha] sm:text-lg">
            Choose your fulfillment, add what you love, and pay how you prefer. 
            Great for solo orders, groups at tables, or easy curbside pickup.
          </p>
          <p className="mt-4 text-[11px] font-bold tracking-widest text-[latte-500] uppercase">
            {itemCount} items available right now — ready to craft.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            { icon: MapPin, title: "Table", desc: "Dine-in at one of our tables" },
            { icon: Coffee, title: "Lobby", desc: "Order while you relax or wait" },
            { icon: ShoppingBag, title: "Curbside", desc: "We'll bring it out to your car" },
            { icon: Users, title: "Parking Spot", desc: "Quick handoff from the lot" },
          ].map((mode) => (
            <div key={mode.title} className="rounded-[12px] border border-[latte] bg-[surface-card] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-1 hover:border-[forest]/30 hover:shadow-[0_0_15px_rgba(74,222,128,0.05)]">
              <mode.icon className="h-7 w-7 text-[forest]" aria-hidden="true" />
              <h3 className="mt-4 font-heading text-xl font-bold text-sand tracking-tight">{mode.title}</h3>
              <p className="mt-2 text-sm text-[mocha]">{mode.desc}</p>
            </div>
          ))}
        </div>

        <OrderClient
          categories={categories}
          generatedAt={catalog.generatedAt}
          initialMode={modeParam}
          initialLabel={labelParam}
        />

        <div className="mt-12 flex flex-col items-center gap-6 text-center text-sm text-[mocha]">
          <Link href="/menu" className="btn-secondary rounded-[4px] border-[latte] px-8 hover:border-[forest] hover:text-white">
            Back to full menu
          </Link>
          <p className="max-w-xs text-xs tracking-wide">
            Don't want to order online? Just come to the counter — we're happy to help in person.
          </p>
        </div>
      </div>
    </section>
  );
}
