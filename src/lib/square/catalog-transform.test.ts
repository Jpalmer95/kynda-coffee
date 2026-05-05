import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCategoryLookup,
  buildImageLookup,
  classifySquareItem,
  getCategoryForItem,
  normalizeSquareItems,
  serializeSquareRaw,
} from "./catalog-transform";

const category = {
  id: "CAT_DRINKS",
  type: "CATEGORY",
  categoryData: { name: "Coffee Drinks", ordinal: 1n },
};

const image = {
  id: "IMG_LATTE",
  type: "IMAGE",
  imageData: { url: "https://example.com/latte.jpg" },
};

const latte = {
  id: "ITEM_LATTE",
  type: "ITEM",
  version: 123n,
  itemData: {
    name: "Latte",
    descriptionPlaintext: "Espresso and steamed milk",
    categories: [{ id: "CAT_DRINKS" }],
    imageIds: ["IMG_LATTE"],
    modifierListInfo: [{ modifierListId: "MOD_MILK", enabled: true }],
    taxIds: ["TAX_SALES"],
    variations: [
      {
        id: "VAR_SMALL",
        type: "ITEM_VARIATION",
        itemVariationData: {
          itemId: "ITEM_LATTE",
          name: "Small",
          priceMoney: { amount: 450n, currency: "USD" },
          trackInventory: false,
        },
      },
      {
        id: "VAR_LARGE",
        type: "ITEM_VARIATION",
        itemVariationData: {
          itemId: "ITEM_LATTE",
          name: "Large",
          priceMoney: { amount: 650n, currency: "USD" },
          trackInventory: false,
        },
      },
    ],
  },
};

describe("Square catalog transforms", () => {
  it("builds category and image lookup maps from mixed Square objects", () => {
    const categories = buildCategoryLookup([category, image]);
    const images = buildImageLookup([category, image]);

    assert.equal(categories.CAT_DRINKS.name, "Coffee Drinks");
    assert.equal(categories.CAT_DRINKS.ordinal, 1);
    assert.equal(images.IMG_LATTE, "https://example.com/latte.jpg");
  });

  it("resolves category IDs on Square items into category names", () => {
    const categories = buildCategoryLookup([category]);
    const resolved = getCategoryForItem(latte, categories);

    assert.deepEqual(resolved, { id: "CAT_DRINKS", name: "Coffee Drinks" });
  });

  it("normalizes all item variations without losing metadata", () => {
    const normalized = normalizeSquareItems([category, image, latte]);

    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].squareItemId, "ITEM_LATTE");
    assert.equal(normalized[0].squareVariationId, "VAR_SMALL");
    assert.equal(normalized[0].category, "Coffee Drinks");
    assert.equal(normalized[0].itemType, "menu");
    assert.equal(normalized[0].cafeOrRetail, "cafe");
    assert.equal(normalized[0].imageUrl, "https://example.com/latte.jpg");
    assert.deepEqual(normalized[0].modifierListIds, ["MOD_MILK"]);
    assert.deepEqual(normalized[0].taxIds, ["TAX_SALES"]);
    assert.equal(normalized[1].squareVariationId, "VAR_LARGE");
    assert.equal(normalized[1].priceCents, 650);
  });

  it("classifies Kynda catalog items into portable item types", () => {
    assert.equal(classifySquareItem("Kynda Hoodie", "Merch"), "merch");
    assert.equal(classifySquareItem("Gift Card", "Retail"), "gift_card");
    assert.equal(classifySquareItem("Extra Espresso Shot", "Modifiers"), "modifier");
    assert.equal(classifySquareItem("Caprese Panini", "Food"), "menu");
  });

  it("serializes BigInt values before JSONB persistence", () => {
    assert.deepEqual(serializeSquareRaw({ version: 123n, nested: [1n] }), {
      version: "123",
      nested: ["1"],
    });
  });
});
