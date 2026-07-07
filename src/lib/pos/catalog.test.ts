import { describe, it, expect } from "vitest";
import {
  formatMoney,
  groupCatalogByCategory,
  applyCatalogOverrides,
  mapPosCatalogItemToProduct,
  mapPosCatalogRows,
  shouldIncludeItemForChannel,
  type CatalogOverrideRow,
  type PosCatalogRow,
} from "./catalog";

const overrides: CatalogOverrideRow[] = [
  {
    id: "override-latte",
    provider: "square",
    provider_item_id: "SQ_ITEM_LATTE",
    provider_variation_id: null,
    display_name: "Kynda Signature Latte",
    display_description: "Owner-approved public description",
    image_urls: ["https://example.com/override-latte.jpg"],
    category_name: "Signature Drinks",
    item_type: "menu",
    available_online: true,
    available_pickup: true,
    available_delivery: false,
    available_shipping: false,
    available_qr: false,
    is_hidden: false,
    is_featured: true,
    sort_order: 10,
    channel_visibility: "menu",
    menu_metrics_recipe_id: "recipe-latte",
    admin_notes: "Keep visible on menu but not QR.",
  },
  {
    id: "override-hoodie",
    provider: "square",
    provider_item_id: "SQ_ITEM_HOODIE",
    provider_variation_id: null,
    display_name: null,
    display_description: null,
    image_urls: null,
    category_name: null,
    item_type: null,
    available_online: null,
    available_pickup: null,
    available_delivery: null,
    available_shipping: null,
    available_qr: null,
    is_hidden: true,
    is_featured: null,
    sort_order: null,
    channel_visibility: null,
    menu_metrics_recipe_id: null,
    admin_notes: "Hide until photo is ready.",
  },
];

const rows: PosCatalogRow[] = [
  {
    id: "item-latte",
    provider: "square",
    provider_item_id: "SQ_ITEM_LATTE",
    name: "Latte",
    description: "Espresso and steamed milk",
    category_name: "Coffee Drinks",
    item_type: "menu",
    is_active: true,
    available_online: true,
    available_pickup: true,
    available_delivery: false,
    available_shipping: false,
    available_qr: true,
    image_urls: ["https://example.com/latte.jpg"],
    modifier_list_ids: ["MOD_MILK"],
    tax_ids: ["TAX"],
    variations: [
      {
        id: "var-large",
        provider: "square",
        provider_item_id: "SQ_ITEM_LATTE",
        provider_variation_id: "SQ_VAR_LARGE",
        name: "Large",
        sku: null,
        ordinal: 2,
        price_cents: 650,
        currency: "USD",
        pricing_type: "FIXED_PRICING",
        track_inventory: false,
        sellable: true,
        stockable: false,
      },
      {
        id: "var-small",
        provider: "square",
        provider_item_id: "SQ_ITEM_LATTE",
        provider_variation_id: "SQ_VAR_SMALL",
        name: "Small",
        sku: null,
        ordinal: 1,
        price_cents: 450,
        currency: "USD",
        pricing_type: "FIXED_PRICING",
        track_inventory: false,
        sellable: true,
        stockable: false,
      },
    ],
    modifierLists: [
      {
        id: "list-milk",
        provider: "square",
        provider_modifier_list_id: "MOD_MILK",
        name: "Milk Options",
        selection_type: "SINGLE",
        min_selected_modifiers: 0,
        max_selected_modifiers: 1,
        modifiers: [
          {
            id: "mod-oat",
            provider: "square",
            provider_modifier_id: "MOD_OAT",
            provider_modifier_list_id: "MOD_MILK",
            name: "Oat Milk",
            price_cents: 75,
            currency: "USD",
            ordinal: 1,
            on_by_default: false,
          },
        ],
      },
    ],
  },
  {
    id: "item-hoodie",
    provider: "square",
    provider_item_id: "SQ_ITEM_HOODIE",
    name: "Kynda Hoodie",
    description: "Soft branded hoodie",
    category_name: "Merchandise",
    item_type: "merch",
    is_active: true,
    available_online: true,
    available_pickup: true,
    available_delivery: false,
    available_shipping: true,
    available_qr: false,
    image_urls: [],
    modifier_list_ids: [],
    tax_ids: [],
    variations: [
      {
        id: "var-hoodie",
        provider: "square",
        provider_item_id: "SQ_ITEM_HOODIE",
        provider_variation_id: "SQ_VAR_HOODIE",
        name: "Regular",
        sku: null,
        ordinal: null,
        price_cents: 4200,
        currency: "USD",
        pricing_type: "FIXED_PRICING",
        track_inventory: true,
        sellable: true,
        stockable: true,
      },
    ],
    modifierLists: [],
  },
];

describe("POS catalog formatting", () => {
  it("formats fixed-money cents as display prices", () => {
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(450)).toBe("$4.50");
    expect(formatMoney(4200)).toBe("$42.00");
  });

  it("filters items by channel flags and item type", () => {
    expect(shouldIncludeItemForChannel(rows[0], "qr")).toBe(true);
    expect(shouldIncludeItemForChannel(rows[1], "qr")).toBe(false);
    expect(shouldIncludeItemForChannel(rows[1], "shop")).toBe(true);
    expect(shouldIncludeItemForChannel(rows[0], "shop")).toBe(false);
    expect(shouldIncludeItemForChannel(rows[0], "menu")).toBe(true);
  });

  it("excludes merch from the customer Menu (Epic 1: Menu vs Shop separation)", () => {
    // rows[1] is the Kynda Hoodie (item_type: "merch", available_pickup: true).
    // Even though it is pickup-available, merch must never appear on the food/drink Menu.
    expect(shouldIncludeItemForChannel(rows[1], "menu")).toBe(false);
    expect(shouldIncludeItemForChannel(rows[1], "pickup")).toBe(false);
    expect(shouldIncludeItemForChannel(rows[1], "qr")).toBe(false);
    // But merch still belongs in the Shop.
    expect(shouldIncludeItemForChannel(rows[1], "shop")).toBe(true);
  });

  it("respects explicit owner channel_visibility over heuristics", () => {
    const latte = rows[0]; // item_type "menu", normally menu-only
    const hoodie = rows[1]; // item_type "merch", normally shop-only

    // "hidden" hides everywhere.
    expect(shouldIncludeItemForChannel(latte, "menu", "hidden")).toBe(false);
    expect(shouldIncludeItemForChannel(latte, "shop", "hidden")).toBe(false);

    // "shop" forces an item out of all Menu channels...
    expect(shouldIncludeItemForChannel(latte, "menu", "shop")).toBe(false);
    expect(shouldIncludeItemForChannel(latte, "qr", "shop")).toBe(false);

    // "menu" forces an item out of all Shop channels...
    expect(shouldIncludeItemForChannel(hoodie, "shop", "menu")).toBe(false);
    expect(shouldIncludeItemForChannel(hoodie, "shipping", "menu")).toBe(false);

    // "both" allows an item through on either side (subject to availability).
    expect(shouldIncludeItemForChannel(hoodie, "shop", "both")).toBe(true);

    // Explicit visibility overrides the item_type restriction on the matching
    // surface, even when Square mistyped the item — but sub-channel availability
    // flags still gate WHERE it shows. Real case: bagged coffee Square typed as
    // "menu" but routed to the Shop must appear on the Shop (online-available).
    expect(shouldIncludeItemForChannel(latte, "shop", "shop")).toBe(true); // latte is online
    // A merch item routed to the Menu shows on the menu surface (pickup/online),
    // but only on the QR sub-channel if it's actually QR-available (it isn't).
    expect(shouldIncludeItemForChannel(hoodie, "menu", "menu")).toBe(true); // pickup+online
    expect(shouldIncludeItemForChannel(hoodie, "qr", "menu")).toBe(false); // not QR-available

    // "auto" / null keeps the heuristic behavior.
    expect(shouldIncludeItemForChannel(latte, "menu", "auto")).toBe(true);
    expect(shouldIncludeItemForChannel(latte, "menu", null)).toBe(true);
  });

  it("maps raw POS rows into stable API items with sorted variations and modifiers", () => {
    const [item] = mapPosCatalogRows(rows, { channel: "qr", includeModifiers: true });

    expect(item.id).toBe("item-latte");
    expect(item.providerItemId).toBe("SQ_ITEM_LATTE");
    expect(item.priceCents).toBe(450);
    expect(item.priceLabel).toBe("from $4.50");
    expect(item.variationLabels).toEqual(["Small • $4.50", "Large • $6.50"]);
    expect(item.imageUrls).toEqual(["https://example.com/latte.jpg"]);
    expect(item.modifierLists.length).toBe(1);
    expect(item.modifierLists[0].modifiers[0].name).toBe("Oat Milk");
  });

  it("groups mapped catalog items by category preserving category counts", () => {
    const items = mapPosCatalogRows(rows, { channel: "all", includeModifiers: false });
    const groups = groupCatalogByCategory(items);

    expect(groups.map((group) => [group.name, group.items.length])).toEqual([
      ["Coffee Drinks", 1],
      ["Merchandise", 1],
    ]);
  });

  it("maps POS catalog items into legacy Product cards for the shop grid", () => {
    const [, hoodie] = mapPosCatalogRows(rows, { channel: "all", includeModifiers: false });
    const product = mapPosCatalogItemToProduct(hoodie);

    expect(product.id).toBe("pos:item-hoodie");
    expect(product.slug).toBe("pos-kynda-hoodie-sq-item-hoodie");
    expect(product.category).toBe("merch-apparel");
    expect(product.source).toBe("square");
    expect(product.square_item_id).toBe("SQ_ITEM_HOODIE");
    expect(product.square_variation_id).toBe("SQ_VAR_HOODIE");
    expect(product.price_cents).toBe(4200);
    expect(product.track_inventory).toBe(true);
  });

  it("applies owner catalog overrides before channel filtering", () => {
    const overriddenRows = applyCatalogOverrides(rows, overrides);
    const qrItems = mapPosCatalogRows(overriddenRows, { channel: "qr", includeModifiers: false });
    const allItems = mapPosCatalogRows(overriddenRows, { channel: "all", includeModifiers: false });

    expect(allItems[0].name).toBe("Kynda Signature Latte");
    expect(allItems[0].description).toBe("Owner-approved public description");
    expect(allItems[0].categoryName).toBe("Signature Drinks");
    expect(allItems[0].imageUrls).toEqual(["https://example.com/override-latte.jpg"]);
    expect(qrItems.some((item) => item.providerItemId === "SQ_ITEM_LATTE")).toBe(false);
    expect(allItems.some((item) => item.providerItemId === "SQ_ITEM_HOODIE")).toBe(false);
  });

  it("propagates is_featured from override through to PosCatalogItem and Product", () => {
    const overriddenRows = applyCatalogOverrides(rows, overrides);
    const allItems = mapPosCatalogRows(overriddenRows, { channel: "all", includeModifiers: false });

    // The latte override has is_featured: true
    const latte = allItems.find((item) => item.providerItemId === "SQ_ITEM_LATTE");
    expect(latte).toBeDefined();
    expect(latte!.isFeatured).toBe(true);

    // mapPosCatalogItemToProduct must carry is_featured through (powers homepage)
    const product = mapPosCatalogItemToProduct(latte!);
    expect(product.is_featured).toBe(true);
  });

  it("defaults isFeatured to false when no override sets it", () => {
    const items = mapPosCatalogRows(rows, { channel: "all", includeModifiers: false });
    // No overrides applied — neither row has is_featured
    expect(items.every((item) => item.isFeatured === false)).toBe(true);
  });
});
