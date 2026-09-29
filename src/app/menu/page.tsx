import { getPosCatalog } from "@/lib/pos/catalog";
import { MenuClient } from "@/components/menu/MenuClient";
import { CuratedSpecials } from "@/components/menu/CuratedSpecials";
import { DeliveryPlatforms } from "@/components/order/DeliveryPlatforms";
import { OrderingPausedNotice } from "@/components/order/OrderingPausedNotice";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { activeSpecials, type Special } from "@/lib/marketing/specials";
import { MenuSchema, LocalBusinessSchema } from "@/components/seo/JsonLd";
import { CAFE_ORDERING_ENABLED, ORDERING_PAUSED_NOTICE } from "@/lib/ordering/availability";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Menu | Kynda Coffee",
  description:
    "Browse our full menu of fresh coffee, espresso drinks, pastries, and more. Café online ordering reopens with our new Horseshoe Bay location this Winter 2026.",
};

async function loadActiveSpecials(): Promise<Special[]> {
  try {
    const { data } = await supabaseAdmin()
      .from("specials")
      .select(
        "id, title, subtitle, description, provider_item_id, provider_variation_id, image_url, price_cents, compare_at_cents, badge, cta_label, starts_at, ends_at, is_active, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return activeSpecials((data ?? []) as Special[]);
  } catch {
    // Table not migrated yet or query failed — menu falls back to heuristic specials.
    return [];
  }
}

export default async function MenuPage() {
  const [catalog, specials] = await Promise.all([
    getPosCatalog({
      channel: "menu",
      includeModifiers: true,
      limit: 500,
    }),
    loadActiveSpecials(),
  ]);

  const categories = catalog.categories.filter((c) => c.items.length > 0);
  const itemCount = catalog.items.length;

  // schema.org/Menu sections for the Google menu rich result (cap to keep payload sane)
  const menuSections = categories.slice(0, 12).map((c) => ({
    name: c.name,
    items: c.items.slice(0, 30).map((item) => ({
      name: item.name,
      description: item.description || undefined,
      priceUsd: item.priceCents ? item.priceCents / 100 : undefined,
    })),
  }));

  const ordering = CAFE_ORDERING_ENABLED;

  return (
    <section className="section-padding">
      <MenuSchema sections={menuSections} />
      <LocalBusinessSchema />
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-forest">
            Fresh • Local • Handcrafted
          </p>
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Our Menu
          </h1>
          <p className="mt-4 max-w-prose text-base text-mocha sm:text-lg">
            {ordering ? (
              <>
                Everything we make in-house. Click any item to customize and add it
                to your cart. Then head to the order page to finish up.
              </>
            ) : (
              <>
                Everything we make in-house — posted here to browse while we
                relocate. {ORDERING_PAUSED_NOTICE.title.toLowerCase()} for now; we
                reopen this Winter 2026.
              </>
            )}
          </p>
          <p className="mt-3 text-sm text-mocha">
            {ordering
              ? `${itemCount} items available right now — everything you see is ready to order.`
              : `${itemCount} items on our menu — browse now, order when we reopen.`}
          </p>
        </div>

        {/* Paused notice — replaces the ordering call to action while we relocate */}
        {!ordering && <OrderingPausedNotice body={ORDERING_PAUSED_NOTICE.menuBody} />}

        {/* Delivery links — paused too: DoorDash/Uber Eats storefronts are offline */}
        {ordering && (
          <div className="mt-6 flex justify-center">
            <DeliveryPlatforms compact />
          </div>
        )}

        {/* Owner-curated Monthly Specials (Epic 5) — top of the ordering page */}
        <div className="mt-8">
          <CuratedSpecials specials={specials} orderingEnabled={ordering} />
        </div>

        <MenuClient
          categories={categories}
          generatedAt={catalog.generatedAt}
          orderingEnabled={ordering}
        />
      </div>
    </section>
  );
}
