import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    assert.equal(formatMoney(0), "$0.00");
    assert.equal(formatMoney(450), "$4.50");
    assert.equal(formatMoney(4200), "$42.00");
  });

  it("filters items by channel flags and item type", () => {
    assert.equal(shouldIncludeItemForChannel(rows[0], "qr"), true);
    assert.equal(shouldIncludeItemForChannel(rows[1], "qr"), false);
    assert.equal(shouldIncludeItemForChannel(rows[1], "shop"), true);
    assert.equal(shouldIncludeItemForChannel(rows[0], "shop"), false);
    assert.equal(shouldIncludeItemForChannel(rows[0], "menu"), true);
  });

  it("maps raw POS rows into stable API items with sorted variations and modifiers", () => {
    const [item] = mapPosCatalogRows(rows, { channel: "qr", includeModifiers: true });

    assert.equal(item.id, "item-latte");
    assert.equal(item.providerItemId, "SQ_ITEM_LATTE");
    assert.equal(item.priceCents, 450);
    assert.equal(item.priceLabel, "from $4.50");
    assert.deepEqual(item.variationLabels, ["Small • $4.50", "Large • $6.50"]);
    assert.deepEqual(item.imageUrls, ["https://example.com/latte.jpg"]);
    assert.equal(item.modifierLists.length, 1);
    assert.equal(item.modifierLists[0].modifiers[0].name, "Oat Milk");
  });

  it("groups mapped catalog items by category preserving category counts", () => {
    const items = mapPosCatalogRows(rows, { channel: "all", includeModifiers: false });
    const groups = groupCatalogByCategory(items);

    assert.deepEqual(groups.map((group) => [group.name, group.items.length]), [
      ["Coffee Drinks", 1],
      ["Merchandise", 1],
    ]);
  });

  it("maps POS catalog items into legacy Product cards for the shop grid", () => {
    const [, hoodie] = mapPosCatalogRows(rows, { channel: "all", includeModifiers: false });
    const product = mapPosCatalogItemToProduct(hoodie);

    assert.equal(product.id, "pos:item-hoodie");
    assert.equal(product.slug, "pos-kynda-hoodie-sq-item-hoodie");
    assert.equal(product.category, "merch-apparel");
    assert.equal(product.source, "square");
    assert.equal(product.square_item_id, "SQ_ITEM_HOODIE");
    assert.equal(product.square_variation_id, "SQ_VAR_HOODIE");
    assert.equal(product.price_cents, 4200);
    assert.equal(product.track_inventory, true);
  });

  it("applies owner catalog overrides before channel filtering", () => {
    const overriddenRows = applyCatalogOverrides(rows, overrides);
    const qrItems = mapPosCatalogRows(overriddenRows, { channel: "qr", includeModifiers: false });
    const allItems = mapPosCatalogRows(overriddenRows, { channel: "all", includeModifiers: false });

    assert.equal(allItems[0].name, "Kynda Signature Latte");
    assert.equal(allItems[0].description, "Owner-approved public description");
    assert.equal(allItems[0].categoryName, "Signature Drinks");
    assert.deepEqual(allItems[0].imageUrls, ["https://example.com/override-latte.jpg"]);
    assert.equal(qrItems.some((item) => item.providerItemId === "SQ_ITEM_LATTE"), false);
    assert.equal(allItems.some((item) => item.providerItemId === "SQ_ITEM_HOODIE"), false);
  });
});
