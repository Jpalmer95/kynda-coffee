import Link from "next/link";
import { getPosCatalog } from "@/lib/pos/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Menu | Kynda Coffee",
  description: "Organic specialty coffee and scratch kitchen in Horseshoe Bay, Texas. Order for pickup or dine in.",
};

const TAG_STYLES: Record<string, string> = {
  menu: "bg-rust/10 text-rust",
  retail: "bg-sage/10 text-sage",
  merch: "bg-blue-50 text-blue-600",
  qr: "bg-amber-50 text-amber-700",
  pickup: "bg-green-50 text-green-700",
  shipping: "bg-purple-50 text-purple-700",
};

export default async function MenuPage() {
  const catalog = await getPosCatalog({ channel: "menu", includeModifiers: false });
  const categories = catalog.categories.filter((category) => category.items.length > 0);

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-rust">
            Synced from our live Kynda POS
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso">
            Our Menu
          </h1>
          <p className="mt-3 text-base sm:text-lg text-mocha max-w-2xl mx-auto">
            Organic specialty coffee and scratch kitchen — everything made with care in Horseshoe Bay.
          </p>
          <p className="mt-2 text-xs text-mocha/60">
            Last refreshed {new Date(catalog.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-latte/20 bg-white p-8 text-center">
            <h2 className="font-heading text-2xl font-bold text-espresso">Menu sync in progress</h2>
            <p className="mt-2 text-mocha">
              Our live menu is being refreshed. Please call us for today&apos;s menu while we finish syncing.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((section) => (
              <div key={section.name}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-espresso">
                    {section.name}
                  </h2>
                  <span className="text-xs font-medium text-mocha/60">
                    {section.items.length} item{section.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 rounded-[24px] border border-latte/10 bg-white p-4 transition-all hover:shadow-hover"
                    >
                      {item.imageUrls?.[0] && (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl bg-latte/10">
                          <img
                            src={item.imageUrls[0]}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-medium text-espresso">{item.name}</h3>
                          <span className="font-semibold text-espresso whitespace-nowrap">{item.priceLabel}</span>
                        </div>
                        {item.description && <p className="mt-1 text-sm text-mocha">{item.description}</p>}
                        {item.variationLabels.length > 1 && (
                          <div className="mt-3 space-y-1 rounded-lg bg-cream/60 p-2">
                            {item.variationLabels.map((variation) => (
                              <div key={variation} className="text-xs text-mocha">
                                {variation}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_STYLES[item.itemType] || "bg-latte/20 text-mocha"}`}>
                            {item.itemType}
                          </span>
                          {item.availableQr && (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_STYLES.qr}`}>
                              QR order
                            </span>
                          )}
                          {item.availablePickup && (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_STYLES.pickup}`}>
                              Pickup
                            </span>
                          )}
                          {item.availableShipping && (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_STYLES.shipping}`}>
                              Shippable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order CTA */}
        <div className="mt-12 rounded-2xl bg-espresso p-6 sm:p-8 text-center">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-cream">
            Ready to Order?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-latte/80">
            Order ahead for pickup or scan the QR code in-store. A fully native Kynda checkout is now being wired into this live catalog.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/qr-order" className="btn-accent">
              Start QR / Pickup Order
            </Link>
            <a href="tel:+15122196781" className="btn-secondary bg-white/10 text-cream border-white/20 hover:bg-white/20">
              Call (512) 219-6781
            </a>
          </div>
        </div>

        {/* Dietary Note */}
        <p className="mt-8 text-center text-xs text-mocha">
          Ask your barista about allergens and non-dairy milk options. Availability can change during service.
        </p>
      </div>
    </section>
  );
}
