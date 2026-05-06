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
  imageUrl?: string;
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
  const itemData = item.itemData;
  const categoryRef = itemData?.categories?.[0];
  const categoryId = categoryRef?.id ?? itemData?.categoryId;
  const categoryName = categoryRef?.name ?? (categoryId ? categories[categoryId]?.name : undefined);
  return { id: categoryId, name: categoryName || "Uncategorized" };
}

export function classifySquareItem(name: string, category: string): NormalizedSquareItem["itemType"] {
  const haystack = `${name} ${category}`.toLowerCase();
  if (/gift\s*card/.test(haystack)) return "gift_card";
  if (/shirt|tee|hoodie|hat|mug|tumbler|glass|cup|sticker|tote|merch|apparel/.test(haystack)) return "merch";
  if (/syrup|extra shot|add |substitute|modifier|milk|sauce|flavor/.test(haystack)) return "modifier";
  if (/coffee|espresso|latte|cappuccino|mocha|americano|tea|matcha|chai|smoothie|energy|breakfast|lunch|panini|bagel|bread|food|pastry|drink|beverage|lemonade|palmer/.test(haystack)) return "menu";
  if (/catering|dispenser|service|rental|fee/.test(haystack)) return "service";
  return "retail";
}

export function cafeOrRetailForItemType(itemType: NormalizedSquareItem["itemType"]): "cafe" | "retail" {
  return itemType === "menu" || itemType === "modifier" || itemType === "service" ? "cafe" : "retail";
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
    const objAny = obj as any;
    const imageIds = objAny.imageIds ? objAny.imageIds : ((objAny.imageId ? [objAny.imageId] : itemData.imageIds) || []);
    const imageUrl = imageIds.map((id: string) => images[id]).find(Boolean);
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
