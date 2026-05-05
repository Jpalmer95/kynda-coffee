import { squareCatalog, squareInventory } from "@/lib/square/client";
import {
  buildCategoryLookup,
  buildImageLookup,
  normalizeSquareItems,
  serializeSquareRaw,
  type NormalizedSquareItem,
  type SquareObjectLike,
} from "@/lib/square/catalog-transform";

export type SquareCatalogItem = NormalizedSquareItem;

export interface SquareCatalogSnapshot {
  objects: SquareObjectLike[];
  items: SquareCatalogItem[];
  categories: ReturnType<typeof buildCategoryLookup>;
  images: ReturnType<typeof buildImageLookup>;
  cursor?: string;
}

export async function fetchSquareCatalogObjects(cursor?: string): Promise<{
  objects: SquareObjectLike[];
  nextCursor?: string;
}> {
  const response = await squareCatalog().listCatalog(cursor, undefined);
  return {
    objects: (response.result?.objects || []) as unknown as SquareObjectLike[],
    nextCursor: response.result.cursor || undefined,
  };
}

export async function fetchSquareCatalogSnapshot(): Promise<SquareCatalogSnapshot> {
  const objects: SquareObjectLike[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  do {
    const page = await fetchSquareCatalogObjects(cursor);
    objects.push(...page.objects);
    cursor = page.nextCursor;
    pageCount++;
    if (pageCount > 50) break;
  } while (cursor);

  const categories = buildCategoryLookup(objects);
  const images = buildImageLookup(objects);
  const items = normalizeSquareItems(objects, categories, images);

  return { objects, items, categories, images, cursor };
}

export async function fetchSquareCatalog(cursor?: string): Promise<{
  items: SquareCatalogItem[];
  nextCursor?: string;
}> {
  const { objects, nextCursor } = await fetchSquareCatalogObjects(cursor);
  const categories = buildCategoryLookup(objects);
  const images = buildImageLookup(objects);
  return {
    items: normalizeSquareItems(objects, categories, images),
    nextCursor,
  };
}

export async function fetchInventoryCounts(variationIds: string[]): Promise<Record<string, number>> {
  if (variationIds.length === 0) return {};

  const response = await squareInventory().batchRetrieveInventoryCounts({
    catalogObjectIds: variationIds,
  });

  const counts: Record<string, number> = {};

  for (const count of response.result?.counts || []) {
    if (count.catalogObjectId && count.quantity) {
      counts[count.catalogObjectId] = parseInt(count.quantity, 10) || 0;
    }
  }

  return counts;
}

export function rawForJsonb(value: unknown) {
  return serializeSquareRaw(value);
}

export async function createSquareOrder(items: Array<{
  variationId: string;
  quantity: string;
}>): Promise<string | null> {
  const { squareOrders } = await import("@/lib/square/client");
  const locationId = process.env.SQUARE_LOCATION_ID || "";

  const lineItems = items.map(item => ({
    quantity: item.quantity,
    catalogObjectId: item.variationId,
  }));

  const response = await squareOrders().createOrder({
    order: {
      locationId,
      lineItems,
    },
  });

  return response.result?.order?.id || null;
}
