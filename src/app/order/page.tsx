import Link from "next/link";
import { Coffee } from "lucide-react";
import { getPosCatalog } from "@/lib/pos/catalog";
import { OrderPageClient } from "@/components/order/OrderPageClient";

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
  const tableParam = typeof params.table === "string" ? params.table : undefined;

  // When a ?table=X param is present (QR code scan), force table mode
  // and pre-fill the label with the table identifier
  const effectiveMode = tableParam ? "table" : modeParam;
  const effectiveLabel = tableParam && !labelParam ? `Table ${tableParam}` : labelParam;

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center flex flex-col items-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[12px] bg-surface border border-latte/30 text-forest shadow-soft">
            <Coffee className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-forest">
            Fast • Fresh • Yours
          </p>
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-6xl tracking-tight">
            Order at Kynda Coffee
          </h1>
          <p className="mt-5 max-w-prose text-base text-mocha sm:text-lg">
            Choose your fulfillment, add what you love, and pay how you prefer. 
            Great for solo orders, groups at tables, or easy curbside pickup.
          </p>
          <p className="mt-4 text-[11px] font-bold tracking-widest text-mocha uppercase">
            {itemCount} items available right now — ready to craft.
          </p>
        </div>

        <div className="mt-12">
          <OrderPageClient
            categories={categories}
            generatedAt={catalog.generatedAt}
            initialMode={effectiveMode}
            initialLabel={effectiveLabel}
            initialTableNumber={tableParam}
          />
        </div>

        <div className="mt-12 flex flex-col items-center gap-6 text-center text-sm text-mocha">
          <Link href="/menu" className="btn-secondary">
            Back to full menu
          </Link>
          <p className="max-w-xs text-xs tracking-wide">
            Don&apos;t want to order online? Just come to the counter — we&apos;re happy to help in person.
          </p>
        </div>
      </div>
    </section>
  );
}
