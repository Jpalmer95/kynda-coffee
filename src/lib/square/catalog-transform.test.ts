import { describe, it, expect } from "vitest";
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
  categoryData: { name: "Coffee Drinks", ordinal: BigInt(1) },
};

const image = {
  id: "IMG_LATTE",
  type: "IMAGE",
  imageData: { url: "https://example.com/latte.jpg" },
};

const latte = {
  id: "ITEM_LATTE",
  type: "ITEM",
  version: BigInt(123),
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
          priceMoney: { amount: BigInt(450), currency: "USD" },
          trackInventory: false,
        },
      },
      {
        id: "VAR_LARGE",
        type: "ITEM_VARIATION",
        itemVariationData: {
          itemId: "ITEM_LATTE",
          name: "Large",
          priceMoney: { amount: BigInt(650), currency: "USD" },
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

    expect(categories.CAT_DRINKS.name).toBe("Coffee Drinks");
    expect(categories.CAT_DRINKS.ordinal).toBe(1);
    expect(images.IMG_LATTE).toBe("https://example.com/latte.jpg");
  });

  it("resolves category IDs on Square items into category names", () => {
    const categories = buildCategoryLookup([category]);
    const resolved = getCategoryForItem(latte, categories);

    expect(resolved).toEqual({ id: "CAT_DRINKS", name: "Coffee Drinks" });
  });

  it("normalizes all item variations without losing metadata", () => {
    const normalized = normalizeSquareItems([category, image, latte]);

    expect(normalized.length).toBe(2);
    expect(normalized[0].squareItemId).toBe("ITEM_LATTE");
    expect(normalized[0].squareVariationId).toBe("VAR_SMALL");
    expect(normalized[0].category).toBe("Coffee Drinks");
    expect(normalized[0].itemType).toBe("menu");
    expect(normalized[0].cafeOrRetail).toBe("cafe");
    expect(normalized[0].imageUrl).toBe("https://example.com/latte.jpg");
    expect(normalized[0].imageUrls).toEqual(["https://example.com/latte.jpg"]);
    expect(normalized[0].modifierListIds).toEqual(["MOD_MILK"]);
    expect(normalized[0].taxIds).toEqual(["TAX_SALES"]);
    expect(normalized[1].squareVariationId).toBe("VAR_LARGE");
    expect(normalized[1].priceCents).toBe(650);
  });

  it("classifies Kynda catalog items into portable item types", () => {
    expect(classifySquareItem("Kynda Hoodie", "Merch")).toBe("merch");
    expect(classifySquareItem("Gift Card", "Retail")).toBe("gift_card");
    expect(classifySquareItem("Extra Espresso Shot", "Modifiers")).toBe("modifier");
    expect(classifySquareItem("Caprese Panini", "Food")).toBe("menu");
  });

  it("serializes BigInt values before JSONB persistence", () => {
    expect(serializeSquareRaw({ version: BigInt(123), nested: [BigInt(1)] })).toEqual({
      version: "123",
      nested: ["1"],
    });
  });
});
