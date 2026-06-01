export type SquareObjectLike = {
  id?: string;
  type?: string;
  version?: bigint | number | string;
  updatedAt?: string;
  categoryData?: {
    name?: string;
    ordinal?: bigint | number | string;
    isTopLevel?: boolean;
  };
  imageData?: {
    name?: string;
    url?: string;
  };
  taxData?: Record<string, unknown> & {
    name?: string;
    percentage?: string;
    calculationPhase?: string;
    inclusionType?: string;
    appliesToCustomAmounts?: boolean;
    enabled?: boolean;
  };
  modifierListData?: Record<string, unknown> & {
    name?: string;
    selectionType?: string;
    modifiers?: SquareObjectLike[];
  };
  modifierData?: Record<string, unknown> & {
    name?: string;
    priceMoney?: MoneyLike;
    ordinal?: bigint | number | string;
    onByDefault?: boolean;
    modifierListId?: string;
  };
  itemData?: Record<string, unknown> & {
    name?: string;
    description?: string;
    descriptionPlaintext?: string;
    isArchived?: boolean;
    categories?: Array<{ id?: string; name?: string; ordinal?: bigint | number | string }>;
    categoryId?: string;
    variations?: SquareObjectLike[];
    imageIds?: string[];
    modifierListInfo?: Array<{
      modifierListId?: string;
      minSelectedModifiers?: number;
      maxSelectedModifiers?: number;
      enabled?: boolean;
    }>;
    taxIds?: string[];
  };
  itemVariationData?: Record<string, unknown> & {
    itemId?: string;
    name?: string;
    sku?: string;
    ordinal?: bigint | number | string;
    priceMoney?: MoneyLike;
    pricingType?: string;
    trackInventory?: boolean;
    sellable?: boolean;
    stockable?: boolean;
  };
};

type MoneyLike = {
  amount?: bigint | number | string;
  currency?: string;
};

export type CategoryLookup = Record<string, { id: string; name: string; ordinal?: number }>;
export type ImageLookup = Record<string, string>;

export type NormalizedSquareItem = {
  squareItemId: string;
  squareVariationId: string;
  name: string;
  description?: string;
  categoryId?: string;
  category: string;
  variationName: string;
  priceCents: number;
  currency: string;
  trackInventory: boolean;
  itemType: "menu" | "retail" | "merch" | "modifier" | "service" | "gift_card" | "unknown";
  cafeOrRetail: "cafe" | "retail";
  /** Primary image URL (short-lived Square signed URL). For backward compatibility. */
  imageUrl?: string;
  /**
   * All image URLs for the item, in Square's preferred order.
   * Populated after `cacheAllSquareImages()` runs in the sync pipeline.
   */
  imageUrls: string[];
  /** All Square image IDs associated with this item. */
  squareImageIds: string[];
  modifierListIds: string[];
  taxIds: string[];
  squareVersion: bigint;
  isActive: boolean;
  raw: SquareObjectLike;
  variationRaw?: SquareObjectLike;
};

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  return BigInt(0);
}

export function buildCategoryLookup(objects: SquareObjectLike[]): CategoryLookup {
  const lookup: CategoryLookup = {};
  for (const obj of objects) {
    if (obj.type !== "CATEGORY" || !obj.id || !obj.categoryData?.name) continue;
    lookup[obj.id] = {
      id: obj.id,
      name: obj.categoryData.name,
      ordinal: toNumber(obj.categoryData.ordinal, 0),
    };
  }
  return lookup;
}

export function buildImageLookup(objects: SquareObjectLike[]): ImageLookup {
  const lookup: ImageLookup = {};
  for (const obj of objects) {
    if (obj.type !== "IMAGE" || !obj.id || !obj.imageData?.url) continue;
    lookup[obj.id] = obj.imageData.url;
  }
  return lookup;
}

export function getCategoryForItem(item: SquareObjectLike, categories: CategoryLookup): { id?: string; name: string } {
  const itemData = item.itemData as any;
  // Square can attach the category several ways: an inline name, a `categories[]`
  // array of {id} refs (often a reporting category + the real one), a legacy
  // top-level `categoryId`, or a `reportingCategory`. Collect every candidate id
  // and pick the FIRST that resolves to a real category name in the lookup.
  const candidateIds: string[] = [];
  const inlineName = itemData?.categories?.[0]?.name as string | undefined;
  for (const ref of itemData?.categories ?? []) {
    if (ref?.id) candidateIds.push(ref.id);
  }
  if (itemData?.reportingCategory?.id) candidateIds.push(itemData.reportingCategory.id);
  if (itemData?.categoryId) candidateIds.push(itemData.categoryId);

  if (inlineName) {
    return { id: candidateIds[0], name: inlineName };
  }
  for (const id of candidateIds) {
    const resolved = categories[id]?.name;
    if (resolved) return { id, name: resolved };
  }
  return { id: candidateIds[0], name: "Uncategorized" };
}

/**
 * Authoritative Square-Category → item_type map (the clean, owner-controlled
 * source of truth). Match is case-insensitive and substring-based on the Square
 * Category NAME, checked BEFORE the name-keyword heuristic. To route an item,
 * just put it in a Square category whose name contains one of these tokens —
 * e.g. category "Coffee Beans (Retail Bags)" → retail → Shop, even though the
 * name "Kynda Coffee ..." would otherwise keyword-match to "menu".
 *
 * Order matters: first matching token wins. Keep more-specific tokens first.
 */
const CATEGORY_ITEM_TYPE_RULES: Array<[RegExp, NormalizedSquareItem["itemType"]]> = [
  [/gift\s*card/, "gift_card"],
  [/add[-\s]?on|modifier/, "modifier"],
  [/catering|service|rental|dispenser/, "service"],
  // "beans"/"bag"/"whole bean"/"ground" before any coffee→menu inference:
  // bagged retail coffee is a shippable Shop good, not a made-to-order drink.
  [/bean|bag|whole bean|ground|retail|wellness|supplement/, "retail"],
  [/apparel|merch|drinkware|mug|glass|tee|shirt|hoodie|hat|tote/, "merch"],
  [/drink|espresso|coffee|tea|beverage|bakery|food|breakfast|lunch|pastry/, "menu"],
];

export function classifySquareItem(name: string, category: string): NormalizedSquareItem["itemType"] {
  const nm = (name || "").toLowerCase();
  // Gift cards are unmistakable by name and must win regardless of category.
  if (/gift\s*card/.test(nm)) return "gift_card";

  // 1) Authoritative: the Square category name decides, if it matches a rule.
  const cat = (category || "").toLowerCase();
  for (const [token, type] of CATEGORY_ITEM_TYPE_RULES) {
    if (token.test(cat)) return type;
  }

  // 2) Fallback heuristic on name + category (for unmapped/legacy categories).
  const haystack = `${name} ${category}`.toLowerCase();
  if (/gift\s*card/.test(haystack)) return "gift_card";
  // Bagged/retail coffee beans before the generic coffee→menu rule.
  if (/whole bean|bagged|coffee beans|\bbeans\b|\b\d+\s*oz\s*bag\b|\bbag\b/.test(haystack)) return "retail";
  if (/shirt|tee|hoodie|hat|mug|tumbler|glass|cup|sticker|tote|merch|apparel/.test(haystack)) return "merch";
  if (/syrup|extra shot|add |substitute|modifier|milk|sauce|flavor/.test(haystack)) return "modifier";
  if (/coffee|espresso|latte|cappuccino|mocha|americano|tea|matcha|chai|smoothie|energy|breakfast|lunch|panini|bagel|bread|food|pastry|drink|beverage|lemonade|palmer/.test(haystack)) return "menu";
  if (/catering|dispenser|service|rental|fee/.test(haystack)) return "service";
  return "retail";
}

export function cafeOrRetailForItemType(itemType: NormalizedSquareItem["itemType"]): "cafe" | "retail" {
  return itemType === "menu" || itemType === "modifier" || itemType === "service" ? "cafe" : "retail";
}
function collectSquareImageIds(obj: SquareObjectLike): string[] {
  const objAny = obj as any;
  const itemDataAny = (obj.itemData ?? {}) as any;
  const ids = [
    ...(Array.isArray(itemDataAny.imageIds) ? itemDataAny.imageIds : []),
    ...(Array.isArray(itemDataAny.image_ids) ? itemDataAny.image_ids : []),
    ...(Array.isArray(objAny.imageIds) ? objAny.imageIds : []),
    ...(Array.isArray(objAny.image_ids) ? objAny.image_ids : []),
    itemDataAny.imageId,
    itemDataAny.image_id,
    objAny.imageId,
    objAny.image_id,
  ];

  return Array.from(
    new Set(ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))
  );
}

export function normalizeSquareItems(
  objects: SquareObjectLike[],
  categories: CategoryLookup = buildCategoryLookup(objects),
  images: ImageLookup = buildImageLookup(objects)
): NormalizedSquareItem[] {
  const normalized: NormalizedSquareItem[] = [];

  for (const obj of objects) {
    if (obj.type !== "ITEM" || !obj.itemData) continue;

    const itemData = obj.itemData;
    const itemName = itemData.name || "Unknown Item";
    const category = getCategoryForItem(obj, categories);
    const itemType = classifySquareItem(itemName, category.name);
    const cafeOrRetail = cafeOrRetailForItemType(itemType);
    const imageIds = collectSquareImageIds(obj);
    // Ordered list: primary first, then the rest. Keep all URLs so downstream
    // consumers (gallery/carousel) can render more than just the hero image.
    const imageUrls = imageIds
      .map((id: string) => images[id])
      .filter((url): url is string => Boolean(url));
    const imageUrl = imageUrls[0];
    const modifierListIds = (itemData.modifierListInfo || [])
      .filter((info) => info.enabled !== false && info.modifierListId)
      .map((info) => info.modifierListId!)
      .filter(Boolean);
    const taxIds = itemData.taxIds || [];
    const variations = itemData.variations || [];

    for (const variationObject of variations) {
      const variation = variationObject.itemVariationData;
      if (!variationObject.id || !variation) continue;
      const money = variation.priceMoney;
      normalized.push({
        squareItemId: obj.id as string,
        squareVariationId: variationObject.id as string,
        name: itemName,
        description: itemData.descriptionPlaintext || itemData.description || undefined,
        categoryId: category.id,
        category: category.name,
        variationName: variation.name || "Regular",
        priceCents: toNumber(money?.amount, 0),
        currency: money?.currency || "USD",
        trackInventory: variation.trackInventory || false,
        itemType,
        cafeOrRetail,
        imageUrl,
        imageUrls,
        squareImageIds: imageIds,
        modifierListIds,
        taxIds,
        squareVersion: toBigInt(obj.version),
        isActive: itemData.isArchived !== true,
        raw: obj,
        variationRaw: variationObject,
      });
    }
  }

  return normalized;
}

export function serializeSquareRaw(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeSquareRaw);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeSquareRaw(entry)]));
  }
  return value;
}
