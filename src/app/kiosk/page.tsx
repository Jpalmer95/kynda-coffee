import { getPosCatalog } from "@/lib/pos/catalog";
import { KioskClient } from "@/components/kiosk/KioskClient";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const catalog = await getPosCatalog({
    channel: "qr",
    includeModifiers: true,
    limit: 500,
  });

  const categories = catalog.categories.filter((c) => c.items.length > 0);

  return <KioskClient categories={categories} generatedAt={catalog.generatedAt} />;
}
