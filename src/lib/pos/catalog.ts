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
  raw?: {
    kyndaInventory?: {
      quantity_available?: number | null;
      synced_at?: string | null;
    };
    [key: string]: unknown;
  } | null;
  synced_at?: string | null;
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
  override?: CatalogOverrideRow | null;
  is_featured?: boolean | null;
}

export interface CatalogOverrideRow {
  id: string;
  provider: string;
  provider_item_id: string;
  provider_variation_id: string | null;
  display_name: string | null;
  display_description: string | null;
  image_urls: string[] | null;
  category_name: string | null;
  item_type: string | null;
  available_online: boolean | null;
  available_pickup: boolean | null;
  available_delivery: boolean | null;
  available_shipping: boolean | null;
  available_qr: boolean | null;
  is_hidden: boolean;
  is_featured: boolean | null;
  sort_order: number | null;
  channel_visibility: ChannelVisibility | null;
  menu_metrics_recipe_id: string | null;
  admin_notes: string | null;
}

/**
 * Owner-controlled channel routing for an item (Epic 1: Menu vs Shop separation).
 * - "auto"   — fall back to the item_type heuristic (merch still excluded from menu)
 * - "menu"   — food/drink ordering surfaces only; never in Shop
 * - "shop"   — shipped/retail goods only; never on Menu
 * - "both"   — intentional allowlist (e.g. bagged retail coffee on Menu + Shop)
 * - "hidden" — never shown on any public channel
 */
export type ChannelVisibility = "auto" | "menu" | "shop" | "both" | "hidden";

/** Channels that represent the customer Menu (food & drink ordering). */
const MENU_CHANNELS: PosCatalogChannel[] = ["menu", "qr", "pickup", "delivery"];
/** Channels that represent the Shop (shipped/retail goods). */
const SHOP_CHANNELS: PosCatalogChannel[] = ["shop", "shipping"];

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
  raw?: PosCatalogVariationRow["raw"];
  syncedAt?: string | null;
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
  isFeatured: boolean;
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
  includeOverrides?: boolean;
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
  channel: PosCatalogChannel = "all",
  visibility: ChannelVisibility | null = null
): boolean {
  if (!item.is_active) return false;

  // Owner-controlled channel routing takes precedence over the item_type
  // heuristic (Epic 1). The customer Menu is strictly food/drink ordering; the
  // Shop is strictly shipped/retail goods. An explicit decision (menu|shop|both)
  // excludes the item from the OTHER surface; sub-channel availability flags
  // (qr/pickup/delivery/shipping) still gate WHERE within a surface it shows.
  // Only "auto" defers entirely to the item_type heuristic below.
  if (visibility && visibility !== "auto") {
    if (visibility === "hidden") return false;
    const isMenuChannel = MENU_CHANNELS.includes(channel);
    const isShopChannel = SHOP_CHANNELS.includes(channel);
    if (visibility === "menu" && isShopChannel) return false;
    if (visibility === "shop" && isMenuChannel) return false;
    // On the MATCHING surface, an explicit decision overrides the item_type
    // restriction (e.g. bagged coffee Square mistyped as "menu" still belongs
    // on the Shop) but availability still applies per channel.
    if (visibility === "menu" && isMenuChannel) {
      return channel === "menu"
        ? (item.available_pickup || item.available_qr || item.available_online)
        : channel === "qr"
        ? item.available_qr
        : channel === "pickup"
        ? item.available_pickup
        : channel === "delivery"
        ? item.available_delivery
        : true;
    }
    if (visibility === "shop" && isShopChannel) {
      // Shop/shipping: require online availability (shipping channel needs the
      // shipping flag); item_type no longer matters since the owner decided.
      return channel === "shipping" ? item.available_shipping : item.available_online;
    }
    // "both" falls through to the availability + item_type heuristic below,
    // which already admits retail/merch on shop and menu/retail on menu.
  }

  switch (channel) {
    case "all":
      return true;
    case "menu":
      // Food & drink ordering surface ONLY. Merch never appears on the Menu.
      // (Retail food/drink like bagged coffee is fine; merch/gift_card is not.)
      return (
        ["menu", "retail"].includes(item.item_type) &&
        (item.available_pickup || item.available_qr || item.available_online)
      );
    case "qr":
      return item.available_qr && ["menu", "retail"].includes(item.item_type);
    case "pickup":
      return item.available_pickup && ["menu", "retail"].includes(item.item_type);
    case "delivery":
      return item.available_delivery && ["menu", "retail"].includes(item.item_type);
    case "shipping":
      return item.available_shipping && ["retail", "merch"].includes(item.item_type);
    case "shop":
      // Shipped/retail goods surface: merch, retail goods, gift cards, anything
      // explicitly shippable. Never made-to-order food/drink unless shippable.
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
    .filter((row) => !row.override?.is_hidden)
    .filter((row) => shouldIncludeItemForChannel(row, channel, row.override?.channel_visibility ?? null))
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
          raw: variation.raw,
          syncedAt: variation.synced_at,
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
        isFeatured: row.is_featured === true,
      };
    })
    .sort((a, b) => {
      const aOverride = rows.find((row) => row.id === a.id)?.override;
      const bOverride = rows.find((row) => row.id === b.id)?.override;
      const ao = aOverride?.sort_order ?? Number.MAX_SAFE_INTEGER;
      const bo = bOverride?.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      const categoryCompare = a.categoryName.localeCompare(b.categoryName);
      if (categoryCompare !== 0) return categoryCompare;
      return a.name.localeCompare(b.name);
    });
}

function overrideKey(provider: string, providerItemId: string, providerVariationId?: string | null): string {
  return `${provider}:${providerItemId}:${providerVariationId ?? ""}`;
}

export function applyCatalogOverrides(rows: PosCatalogRow[], overrides: CatalogOverrideRow[]): PosCatalogRow[] {
  const overridesByExactKey = new Map(
    overrides.map((override) => [
      overrideKey(override.provider, override.provider_item_id, override.provider_variation_id),
      override,
    ])
  );

  return rows.map((row) => {
    const override =
      overridesByExactKey.get(overrideKey(row.provider, row.provider_item_id, null)) ??
      overridesByExactKey.get(overrideKey(row.provider, row.provider_item_id, ""));

    if (!override) return row;

    return {
      ...row,
      name: override.display_name ?? row.name,
      description: override.display_description ?? row.description,
      category_name: override.category_name ?? row.category_name,
      item_type: override.item_type ?? row.item_type,
      available_online: override.available_online ?? row.available_online,
      available_pickup: override.available_pickup ?? row.available_pickup,
      available_delivery: override.available_delivery ?? row.available_delivery,
      available_shipping: override.available_shipping ?? row.available_shipping,
      available_qr: override.available_qr ?? row.available_qr,
      image_urls: override.image_urls ?? row.image_urls,
      is_featured: override.is_featured ?? row.is_featured ?? false,
      override,
    };
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
  // Shop-only sourced categories (Epic 1)
  if (
    text.includes("chemex") || text.includes("hario") || text.includes("v60") ||
    text.includes("kettle") || text.includes("grinder") || text.includes("french press") ||
    text.includes("aeropress") || text.includes("filter") || text.includes("dripper") ||
    text.includes("scale") || text.includes("brew")
  ) {
    return "brew-gear";
  }
  if (
    (text.includes("tea") && (text.includes("loose") || text.includes("leaf") || text.includes("bulk"))) ||
    text.includes("loose-leaf") || text.includes("loose leaf")
  ) {
    return "bulk-tea";
  }
  if (
    text.includes("candle") || text.includes("apothecary") || text.includes("soap") ||
    text.includes("balm") || text.includes("incense") || text.includes("essential oil")
  ) {
    return "apothecary";
  }
  if (text.includes("custom") || text.includes("design studio") || text.includes("printful")) {
    return "design-studio";
  }
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
    is_active: item.availableOnline ?? true,
    is_featured: item.isFeatured,
    inventory_count: undefined,
    created_at: new Date(0).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getPosCatalog(options: GetPosCatalogOptions = {}): Promise<PosCatalogResult> {
  const channel = options.channel ?? "menu";
  const includeModifiers = options.includeModifiers ?? true;
  const includeOverrides = options.includeOverrides ?? true;
  const limit = Math.min(Math.max(options.limit ?? 250, 1), 500);

  // Pull the full synced catalog first, then apply owner overrides, channel
  // filters, sort order, and the API limit. Limiting at the DB query layer can
  // drop all useful items when early alphabetical rows are hidden by overrides.
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
        "id, provider, provider_item_id, provider_variation_id, name, sku, ordinal, price_cents, currency, pricing_type, track_inventory, sellable, stockable, raw, synced_at"
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

  let overrides: CatalogOverrideRow[] = [];
  if (includeOverrides && providerItemIds.length > 0) {
    const { data, error } = await supabaseAdmin()
      .from("catalog_overrides")
      .select(
        "id, provider, provider_item_id, provider_variation_id, display_name, display_description, image_urls, category_name, item_type, available_online, available_pickup, available_delivery, available_shipping, available_qr, is_hidden, is_featured, sort_order, channel_visibility, menu_metrics_recipe_id, admin_notes"
      )
      .in("provider_item_id", providerItemIds);

    if (error) throw new Error(`Failed to load catalog overrides: ${error.message}`);
    overrides = (data ?? []) as CatalogOverrideRow[];
  }

  const hydratedRows = rows.map((row) => ({
    ...row,
    variations: variationsByItemId.get(row.provider_item_id) ?? [],
    modifierLists: (row.modifier_list_ids ?? [])
      .map((id) => modifierListsById.get(id))
      .filter(Boolean) as PosCatalogModifierListRow[],
  }));

  const rowsWithOverrides = includeOverrides ? applyCatalogOverrides(hydratedRows, overrides) : hydratedRows;
  const items = mapPosCatalogRows(rowsWithOverrides, { channel, includeModifiers }).slice(0, limit);

  return {
    channel,
    categories: groupCatalogByCategory(items),
    items,
    generatedAt: new Date().toISOString(),
  };
}
