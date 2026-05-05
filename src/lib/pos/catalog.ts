import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Product, ProductCategory } from "@/types";

export type PosCatalogChannel =
  | "all"
  | "menu"
  | "qr"
  | "pickup"
  | "delivery"
  | "shipping"
  | "shop";

export interface PosCatalogVariationRow {
  id: string;
  provider: string;
  provider_item_id: string;
  provider_variation_id: string;
  name: string;
  sku: string | null;
  ordinal: number | null;
  price_cents: number;
  currency: string;
  pricing_type: string | null;
  track_inventory: boolean;
  sellable: boolean;
  stockable: boolean;
}

export interface PosCatalogModifierRow {
  id: string;
  provider: string;
  provider_modifier_id: string;
  provider_modifier_list_id: string;
  name: string;
  price_cents: number;
  currency: string;
  ordinal: number | null;
  on_by_default: boolean;
}

export interface PosCatalogModifierListRow {
  id: string;
  provider: string;
  provider_modifier_list_id: string;
  name: string;
  selection_type: string | null;
  min_selected_modifiers: number | null;
  max_selected_modifiers: number | null;
  modifiers?: PosCatalogModifierRow[];
}

export interface PosCatalogRow {
  id: string;
  provider: string;
  provider_item_id: string;
  name: string;
  description: string | null;
  category_name: string | null;
  item_type: string;
  is_active: boolean;
  available_online: boolean;
  available_pickup: boolean;
  available_delivery: boolean;
  available_shipping: boolean;
  available_qr: boolean;
  image_urls: string[] | null;
  modifier_list_ids: string[] | null;
  tax_ids: string[] | null;
  variations?: PosCatalogVariationRow[];
  modifierLists?: PosCatalogModifierListRow[];
}

export interface PosCatalogVariation {
  id: string;
  provider: string;
  providerItemId: string;
  providerVariationId: string;
  name: string;
  sku: string | null;
  ordinal: number | null;
  priceCents: number;
  currency: string;
  priceLabel: string;
  pricingType: string | null;
  trackInventory: boolean;
  sellable: boolean;
  stockable: boolean;
}

export interface PosCatalogModifier {
  id: string;
  provider: string;
  providerModifierId: string;
  providerModifierListId: string;
  name: string;
  priceCents: number;
  currency: string;
  priceLabel: string;
  ordinal: number | null;
  onByDefault: boolean;
}

export interface PosCatalogModifierList {
  id: string;
  provider: string;
  providerModifierListId: string;
  name: string;
  selectionType: string | null;
  minSelectedModifiers: number | null;
  maxSelectedModifiers: number | null;
  modifiers: PosCatalogModifier[];
}

export interface PosCatalogItem {
  id: string;
  provider: string;
  providerItemId: string;
  name: string;
  description: string;
  categoryName: string;
  itemType: string;
  availableOnline: boolean;
  availablePickup: boolean;
  availableDelivery: boolean;
  availableShipping: boolean;
  availableQr: boolean;
  imageUrls: string[];
  modifierListIds: string[];
  taxIds: string[];
  variations: PosCatalogVariation[];
  modifierLists: PosCatalogModifierList[];
  priceCents: number;
  currency: string;
  priceLabel: string;
  variationLabels: string[];
}

export interface PosCatalogCategoryGroup {
  name: string;
  items: PosCatalogItem[];
}

export interface PosCatalogResult {
  channel: PosCatalogChannel;
  categories: PosCatalogCategoryGroup[];
  items: PosCatalogItem[];
  generatedAt: string;
}

export interface MapPosCatalogOptions {
  channel?: PosCatalogChannel;
  includeModifiers?: boolean;
}

export interface GetPosCatalogOptions extends MapPosCatalogOptions {
  category?: string | null;
  limit?: number;
}

const DEFAULT_CURRENCY = "USD";
const UNKNOWN_CATEGORY = "Uncategorized";

export function formatMoney(cents: number, currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

export function shouldIncludeItemForChannel(
  item: Pick<
    PosCatalogRow,
    | "is_active"
    | "item_type"
    | "available_online"
    | "available_pickup"
    | "available_delivery"
    | "available_shipping"
    | "available_qr"
  >,
  channel: PosCatalogChannel = "all"
): boolean {
  if (!item.is_active) return false;

  switch (channel) {
    case "all":
      return true;
    case "menu":
      return (
        ["menu", "retail", "merch"].includes(item.item_type) &&
        (item.available_pickup || item.available_qr || item.available_online)
      );
    case "qr":
      return item.available_qr && ["menu", "retail", "merch"].includes(item.item_type);
    case "pickup":
      return item.available_pickup && ["menu", "retail", "merch"].includes(item.item_type);
    case "delivery":
      return item.available_delivery && ["menu", "retail"].includes(item.item_type);
    case "shipping":
      return item.available_shipping && ["retail", "merch"].includes(item.item_type);
    case "shop":
      return (
        item.available_online &&
        (item.available_shipping || ["retail", "merch", "gift_card"].includes(item.item_type))
      );
  }
}

function compareOrdinalThenName<T extends { ordinal?: number | null; name: string }>(a: T, b: T) {
  const ao = a.ordinal ?? Number.MAX_SAFE_INTEGER;
  const bo = b.ordinal ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name);
}

export function mapPosCatalogRows(
  rows: PosCatalogRow[],
  options: MapPosCatalogOptions = {}
): PosCatalogItem[] {
  const channel = options.channel ?? "all";
  const includeModifiers = options.includeModifiers ?? true;

  return rows
    .filter((row) => shouldIncludeItemForChannel(row, channel))
    .map((row) => {
      const variations = [...(row.variations ?? [])]
        .filter((variation) => variation.sellable !== false)
        .sort(compareOrdinalThenName)
        .map<PosCatalogVariation>((variation) => ({
          id: variation.id,
          provider: variation.provider,
          providerItemId: variation.provider_item_id,
          providerVariationId: variation.provider_variation_id,
          name: variation.name || "Regular",
          sku: variation.sku,
          ordinal: variation.ordinal,
          priceCents: variation.price_cents ?? 0,
          currency: variation.currency || DEFAULT_CURRENCY,
          priceLabel: formatMoney(variation.price_cents ?? 0, variation.currency || DEFAULT_CURRENCY),
          pricingType: variation.pricing_type,
          trackInventory: variation.track_inventory,
          sellable: variation.sellable,
          stockable: variation.stockable,
        }));

      const firstVariation = variations[0];
      const priceCents = firstVariation?.priceCents ?? 0;
      const currency = firstVariation?.currency ?? DEFAULT_CURRENCY;
      const hasMultiplePrices = new Set(variations.map((variation) => variation.priceCents)).size > 1;
      const priceLabel = variations.length === 0
        ? "Market price"
        : `${hasMultiplePrices ? "from " : ""}${formatMoney(priceCents, currency)}`;

      const modifierLists = includeModifiers
        ? [...(row.modifierLists ?? [])]
            .sort(compareOrdinalThenName)
            .map<PosCatalogModifierList>((list) => ({
              id: list.id,
              provider: list.provider,
              providerModifierListId: list.provider_modifier_list_id,
              name: list.name,
              selectionType: list.selection_type,
              minSelectedModifiers: list.min_selected_modifiers,
              maxSelectedModifiers: list.max_selected_modifiers,
              modifiers: [...(list.modifiers ?? [])]
                .sort(compareOrdinalThenName)
                .map<PosCatalogModifier>((modifier) => ({
                  id: modifier.id,
                  provider: modifier.provider,
                  providerModifierId: modifier.provider_modifier_id,
                  providerModifierListId: modifier.provider_modifier_list_id,
                  name: modifier.name,
                  priceCents: modifier.price_cents ?? 0,
                  currency: modifier.currency || DEFAULT_CURRENCY,
                  priceLabel: formatMoney(modifier.price_cents ?? 0, modifier.currency || DEFAULT_CURRENCY),
                  ordinal: modifier.ordinal,
                  onByDefault: modifier.on_by_default,
                })),
            }))
        : [];

      return {
        id: row.id,
        provider: row.provider,
        providerItemId: row.provider_item_id,
        name: row.name,
        description: row.description ?? "",
        categoryName: row.category_name || UNKNOWN_CATEGORY,
        itemType: row.item_type,
        availableOnline: row.available_online,
        availablePickup: row.available_pickup,
        availableDelivery: row.available_delivery,
        availableShipping: row.available_shipping,
        availableQr: row.available_qr,
        imageUrls: row.image_urls ?? [],
        modifierListIds: row.modifier_list_ids ?? [],
        taxIds: row.tax_ids ?? [],
        variations,
        modifierLists,
        priceCents,
        currency,
        priceLabel,
        variationLabels: variations.map((variation) => `${variation.name} • ${variation.priceLabel}`),
      };
    })
    .sort((a, b) => {
      const categoryCompare = a.categoryName.localeCompare(b.categoryName);
      if (categoryCompare !== 0) return categoryCompare;
      return a.name.localeCompare(b.name);
    });
}

export function groupCatalogByCategory(items: PosCatalogItem[]): PosCatalogCategoryGroup[] {
  const groups = new Map<string, PosCatalogItem[]>();

  for (const item of items) {
    const categoryName = item.categoryName || UNKNOWN_CATEGORY;
    const current = groups.get(categoryName) ?? [];
    current.push(item);
    groups.set(categoryName, current);
  }

  return Array.from(groups.entries()).map(([name, groupedItems]) => ({
    name,
    items: groupedItems,
  }));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function categoryForPosItem(item: Pick<PosCatalogItem, "itemType" | "categoryName" | "name">): ProductCategory {
  const text = `${item.itemType} ${item.categoryName} ${item.name}`.toLowerCase();

  if (text.includes("gift")) return "gift-card";
  if (text.includes("catering")) return "catering";
  if (text.includes("subscription") || text.includes("club")) return "subscription";
  if (text.includes("mug")) return "merch-mugs";
  if (text.includes("glass")) return "merch-glassware";
  if (text.includes("shirt") || text.includes("tee") || text.includes("hoodie") || text.includes("apparel")) {
    return "merch-apparel";
  }
  if (text.includes("merch") || text.includes("tote") || text.includes("hat") || text.includes("sticker")) {
    return "merch-accessories";
  }
  return "coffee-beans";
}

export function mapPosCatalogItemToProduct(item: PosCatalogItem): Product {
  const primaryVariation = item.variations[0];
  const baseSlug = slugify(item.name || item.providerItemId);

  return {
    id: `pos:${item.id}`,
    slug: `pos-${baseSlug}-${slugify(item.providerItemId)}`,
    name: item.name,
    description: item.description || `${item.categoryName} from Kynda Coffee`,
    category: categoryForPosItem(item),
    price_cents: item.priceCents,
    images: item.imageUrls,
    source: "square",
    square_item_id: item.providerItemId,
    square_variation_id: primaryVariation?.providerVariationId,
    track_inventory: primaryVariation?.trackInventory ?? false,
    inventory_synced_at: undefined,
    is_active: true,
    is_featured: item.itemType === "merch" || item.availableShipping,
    inventory_count: undefined,
    created_at: new Date(0).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getPosCatalog(options: GetPosCatalogOptions = {}): Promise<PosCatalogResult> {
  const channel = options.channel ?? "menu";
  const includeModifiers = options.includeModifiers ?? true;
  const limit = Math.min(Math.max(options.limit ?? 250, 1), 500);

  let itemQuery = supabaseAdmin()
    .from("pos_items")
    .select(
      "id, provider, provider_item_id, name, description, category_name, item_type, is_active, available_online, available_pickup, available_delivery, available_shipping, available_qr, image_urls, modifier_list_ids, tax_ids"
    )
    .eq("is_active", true)
    .order("category_name", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit);

  if (options.category) {
    itemQuery = itemQuery.eq("category_name", options.category);
  }

  const { data: itemRows, error: itemError } = await itemQuery;
  if (itemError) throw new Error(`Failed to load POS items: ${itemError.message}`);

  const rows = (itemRows ?? []) as PosCatalogRow[];
  const providerItemIds = rows.map((row) => row.provider_item_id);

  let variations: PosCatalogVariationRow[] = [];
  if (providerItemIds.length > 0) {
    const { data, error } = await supabaseAdmin()
      .from("pos_item_variations")
      .select(
        "id, provider, provider_item_id, provider_variation_id, name, sku, ordinal, price_cents, currency, pricing_type, track_inventory, sellable, stockable"
      )
      .in("provider_item_id", providerItemIds)
      .order("ordinal", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw new Error(`Failed to load POS variations: ${error.message}`);
    variations = (data ?? []) as PosCatalogVariationRow[];
  }

  const variationsByItemId = new Map<string, PosCatalogVariationRow[]>();
  for (const variation of variations) {
    const current = variationsByItemId.get(variation.provider_item_id) ?? [];
    current.push(variation);
    variationsByItemId.set(variation.provider_item_id, current);
  }

  let modifierListsById = new Map<string, PosCatalogModifierListRow>();
  if (includeModifiers) {
    const modifierListIds = Array.from(new Set(rows.flatMap((row) => row.modifier_list_ids ?? [])));

    if (modifierListIds.length > 0) {
      const { data: listData, error: listError } = await supabaseAdmin()
        .from("pos_modifier_lists")
        .select(
          "id, provider, provider_modifier_list_id, name, selection_type, min_selected_modifiers, max_selected_modifiers"
        )
        .in("provider_modifier_list_id", modifierListIds)
        .order("name", { ascending: true });

      if (listError) throw new Error(`Failed to load POS modifier lists: ${listError.message}`);

      modifierListsById = new Map(
        ((listData ?? []) as PosCatalogModifierListRow[]).map((list) => [
          list.provider_modifier_list_id,
          { ...list, modifiers: [] },
        ])
      );

      const { data: modifierData, error: modifierError } = await supabaseAdmin()
        .from("pos_modifiers")
        .select(
          "id, provider, provider_modifier_id, provider_modifier_list_id, name, price_cents, currency, ordinal, on_by_default"
        )
        .in("provider_modifier_list_id", modifierListIds)
        .order("ordinal", { ascending: true })
        .order("name", { ascending: true });

      if (modifierError) throw new Error(`Failed to load POS modifiers: ${modifierError.message}`);

      for (const modifier of (modifierData ?? []) as PosCatalogModifierRow[]) {
        const list = modifierListsById.get(modifier.provider_modifier_list_id);
        if (!list) continue;
        list.modifiers = [...(list.modifiers ?? []), modifier];
      }
    }
  }

  const hydratedRows = rows.map((row) => ({
    ...row,
    variations: variationsByItemId.get(row.provider_item_id) ?? [],
    modifierLists: (row.modifier_list_ids ?? [])
      .map((id) => modifierListsById.get(id))
      .filter(Boolean) as PosCatalogModifierListRow[],
  }));

  const items = mapPosCatalogRows(hydratedRows, { channel, includeModifiers });

  return {
    channel,
    categories: groupCatalogByCategory(items),
    items,
    generatedAt: new Date().toISOString(),
  };
}
