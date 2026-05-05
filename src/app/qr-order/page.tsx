import Link from "next/link";
import { Coffee, MapPin, ShoppingBag, Smartphone } from "lucide-react";
import { getPosCatalog } from "@/lib/pos/catalog";
import { QrOrderClient } from "@/components/qr/QrOrderClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "QR Ordering | Kynda Coffee",
  description: "Order from your table, the lobby, or a parking spot at Kynda Coffee.",
};

export default async function QrOrderPage() {
  const catalog = await getPosCatalog({ channel: "qr", includeModifiers: true, limit: 500 });
  const categories = catalog.categories.filter((category) => category.items.length > 0);
  const itemCount = catalog.items.length;

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rust/10 text-rust">
            <Smartphone className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-rust">
            Interactive POS-powered ordering
          </p>
          <h1 className="font-heading text-3xl font-bold text-espresso sm:text-5xl">
            QR Order at Kynda Coffee
          </h1>
          <p className="mt-4 text-base text-mocha sm:text-lg">
            Scan at your table, order from the lobby, or start a parking spot pickup order. Choose variations, modifiers, quantities, and notes from the Square-synced catalog.
          </p>
          <p className="mt-3 text-sm text-mocha">
            {itemCount} curated item{itemCount === 1 ? "" : "s"} currently available for QR ordering.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: MapPin, title: "Table", desc: "Use a table-specific QR code for dine-in ordering." },
            { icon: Coffee, title: "Lobby", desc: "Order while you browse, work, or wait near the counter." },
            { icon: ShoppingBag, title: "Parking", desc: "Add a parking spot number for quick handoff." },
          ].map((mode) => (
            <div key={mode.title} className="rounded-2xl border border-latte/20 bg-white p-5 shadow-sm">
              <mode.icon className="h-6 w-6 text-rust" aria-hidden="true" />
              <h2 className="mt-3 font-heading text-xl font-bold text-espresso">{mode.title}</h2>
              <p className="mt-1 text-sm text-mocha">{mode.desc}</p>
            </div>
          ))}
        </div>

        <QrOrderClient categories={categories} generatedAt={catalog.generatedAt} />

        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
          <Link href="/menu" className="btn-secondary">
            View Full Menu
          </Link>
          <a href="tel:+15122196781" className="btn-accent">
            Call Kynda Coffee
          </a>
        </div>
      </div>
    </section>
  );
}
