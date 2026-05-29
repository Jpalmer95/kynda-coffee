import { getPosCatalog } from "@/lib/pos/catalog";
import { MenuClient } from "@/components/menu/MenuClient";
import { DeliveryPlatforms } from "@/components/order/DeliveryPlatforms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Menu | Kynda Coffee",
  description:
    "Browse our full menu of fresh coffee, espresso drinks, pastries, and more. Order ahead for pickup or enjoy in our café.",
};

export default async function MenuPage() {
  const catalog = await getPosCatalog({
    channel: "menu",
    includeModifiers: true,
    limit: 500,
  });

  const categories = catalog.categories.filter((c) => c.items.length > 0);
  const itemCount = catalog.items.length;

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-forest">
            Fresh • Local • Handcrafted
          </p>
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Our Menu
          </h1>
          <p className="mt-4 max-w-prose text-base text-mocha sm:text-lg">
            Everything we make in-house. Click any item to customize and add it
            to your cart. Then head to the order page to finish up.
          </p>
          <p className="mt-3 text-sm text-mocha">
            {itemCount} items available right now — everything you see is ready to order.
          </p>
        </div>

        {/* Delivery links — compact view */}
        <div className="mt-6 flex justify-center">
          <DeliveryPlatforms compact />
        </div>

        <MenuClient categories={categories} generatedAt={catalog.generatedAt} />
      </div>
    </section>
  );
}
