import { describe, it, expect } from "vitest";
import {
  slugify,
  mapToastCategory,
  toCents,
  mapToastItemToProduct,
  mapToastMenusToProducts,
  type ToastMenu,
} from "./toast-mapping";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Lavender Honey Latte", "g1")).toBe("lavender-honey-latte");
  });
  it("falls back to the guid when name is empty", () => {
    expect(slugify("!!!", "g1")).toBe("toast-g1");
  });
});

describe("toCents", () => {
  it("converts dollars to integer cents", () => {
    expect(toCents(4.5)).toBe(450);
    expect(toCents(3)).toBe(300);
  });
  it("guards null/NaN", () => {
    expect(toCents(undefined)).toBe(0);
    expect(toCents(null)).toBe(0);
    expect(toCents(NaN)).toBe(0);
  });
});

describe("mapToastCategory", () => {
  it("maps drink groups to cafe", () => {
    expect(mapToastCategory("Espresso Drinks")).toBe("cafe");
  });
  it("maps food/pastry groups to food", () => {
    expect(mapToastCategory("Bakery")).toBe("food");
  });
  it("maps retail beans to coffee-beans", () => {
    expect(mapToastCategory("Whole Bean Retail")).toBe("coffee-beans");
  });
  it("defaults unknown groups to cafe", () => {
    expect(mapToastCategory("Misc")).toBe("cafe");
    expect(mapToastCategory(undefined)).toBe("cafe");
  });
});

describe("mapToastItemToProduct", () => {
  it("maps a full item to the normalized product shape", () => {
    const p = mapToastItemToProduct(
      { guid: "g1", name: "Cortado", description: "Equal parts espresso + milk", price: 4.25, images: [{ url: "https://img/c.jpg" }] },
      "Espresso Drinks"
    );
    expect(p).toEqual({
      slug: "cortado",
      name: "Cortado",
      description: "Equal parts espresso + milk",
      category: "cafe",
      price_cents: 425,
      is_active: true,
      images: ["https://img/c.jpg"],
    });
  });

  it("treats HIDDEN visibility as inactive", () => {
    expect(mapToastItemToProduct({ guid: "g2", name: "Secret", visibility: "HIDDEN" }).is_active).toBe(false);
  });

  it("handles string-array images and missing fields", () => {
    const p = mapToastItemToProduct({ guid: "g3", name: "Drip", images: ["https://img/d.jpg"] });
    expect(p.images).toEqual(["https://img/d.jpg"]);
    expect(p.description).toBe("");
    expect(p.price_cents).toBe(0);
  });
});

describe("mapToastMenusToProducts", () => {
  const menus: ToastMenu[] = [
    {
      name: "Main",
      menuGroups: [
        {
          name: "Espresso Drinks",
          menuItems: [
            { guid: "a", name: "Latte", price: 5 },
            { guid: "b", name: "Cortado", price: 4.25 },
          ],
        },
        {
          name: "Bakery",
          menuItems: [{ guid: "c", name: "Almond Croissant", price: 4.5 }],
        },
      ],
    },
  ];

  it("flattens the menu tree into normalized products", () => {
    const products = mapToastMenusToProducts(menus);
    expect(products).toHaveLength(3);
    expect(products.map((p) => p.slug).sort()).toEqual(["almond-croissant", "cortado", "latte"]);
    expect(products.find((p) => p.slug === "almond-croissant")?.category).toBe("food");
  });

  it("dedupes by slug", () => {
    const dupMenus: ToastMenu[] = [
      { menuGroups: [{ name: "X", menuItems: [{ guid: "a", name: "Latte", price: 5 }, { guid: "b", name: "Latte", price: 6 }] }] },
    ];
    expect(mapToastMenusToProducts(dupMenus)).toHaveLength(1);
  });

  it("skips items without a guid and handles empty input", () => {
    expect(mapToastMenusToProducts([])).toEqual([]);
    const m: ToastMenu[] = [{ menuGroups: [{ menuItems: [{ guid: "", name: "Bad" }] }] }];
    expect(mapToastMenusToProducts(m)).toEqual([]);
  });
});
