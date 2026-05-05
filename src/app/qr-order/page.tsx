import Link from "next/link";
import { Coffee, MapPin, ShoppingBag, Smartphone } from "lucide-react";
import { getPosCatalog } from "@/lib/pos/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "QR Ordering | Kynda Coffee",
  description: "Order from your table, the lobby, or a parking spot at Kynda Coffee.",
};

export default async function QrOrderPage() {
  const catalog = await getPosCatalog({ channel: "qr", includeModifiers: true });
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
            Live POS-powered ordering catalog
          </p>
          <h1 className="font-heading text-3xl font-bold text-espresso sm:text-5xl">
            QR Order at Kynda Coffee
          </h1>
          <p className="mt-4 text-base text-mocha sm:text-lg">
            Scan at your table, order from the lobby, or start a parking spot pickup order. This page is now reading the same normalized POS catalog synced from Square.
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

        <div className="mt-10 rounded-3xl border border-latte/20 bg-white p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-latte/20 pb-5 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-heading text-2xl font-bold text-espresso">Orderable Items</h2>
              <p className="mt-1 text-sm text-mocha">
                {itemCount} synced item{itemCount === 1 ? "" : "s"} available for QR ordering. Full cart/payment submission is the next wiring step.
              </p>
            </div>
            <p className="text-xs text-mocha/60">
              Refreshed {new Date(catalog.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="py-14 text-center">
              <h3 className="font-heading text-xl font-bold text-espresso">Ordering catalog is syncing</h3>
              <p className="mt-2 text-mocha">Please check back shortly or order at the counter.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              {categories.map((category) => (
                <div key={category.name}>
                  <h3 className="font-heading text-xl font-bold text-espresso">{category.name}</h3>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {category.items.map((item) => (
                      <article key={item.id} className="rounded-2xl border border-latte/20 bg-cream/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-espresso">{item.name}</h4>
                            {item.description && <p className="mt-1 text-sm text-mocha">{item.description}</p>}
                          </div>
                          <span className="whitespace-nowrap font-semibold text-espresso">{item.priceLabel}</span>
                        </div>

                        {item.variations.length > 1 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.variations.map((variation) => (
                              <span key={variation.id} className="rounded-full bg-white px-2.5 py-1 text-xs text-mocha shadow-sm">
                                {variation.name}: {variation.priceLabel}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.modifierLists.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {item.modifierLists.slice(0, 3).map((list) => (
                              <details key={list.id} className="rounded-xl bg-white px-3 py-2 text-sm">
                                <summary className="cursor-pointer font-medium text-espresso">
                                  {list.name} ({list.modifiers.length})
                                </summary>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {list.modifiers.slice(0, 12).map((modifier) => (
                                    <span key={modifier.id} className="rounded-full bg-latte/20 px-2 py-0.5 text-xs text-mocha">
                                      {modifier.name}{modifier.priceCents > 0 ? ` +${modifier.priceLabel}` : ""}
                                    </span>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled
                          className="mt-4 w-full rounded-full bg-latte/30 px-4 py-2 text-sm font-semibold text-mocha"
                          title="Cart submission is the next build step"
                        >
                          Cart wiring next
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
