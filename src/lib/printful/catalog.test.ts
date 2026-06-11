import { describe, it, expect } from "vitest";
import {
  calculateRetailPrice,
  calculateProfit,
  PRODUCT_MARKUP,
  type PrintfulProduct,
  type ProductVariant,
} from "./catalog";

function makeProduct(category: PrintfulProduct["category"], basePriceCents: number): PrintfulProduct {
  return {
    id: "test-product",
    printfulId: 1,
    name: "Test Product",
    category,
    description: "Test description",
    basePriceCents,
    imageUrl: "https://example.com/image.jpg",
    mockupImages: { front: "https://example.com/front.jpg" },
    variants: [],
    printAreas: { front: { width: 10, height: 10, x: 50, y: 50 } },
    canvasPrintArea: { x: 250, y: 250, w: 500, h: 500 },
  };
}

function makeVariant(additionalPriceCents: number): ProductVariant {
  return {
    id: 1,
    name: "Test Variant",
    additionalPriceCents,
  };
}

describe("calculateRetailPrice", () => {
  it("calculates apparel pricing correctly", () => {
    const product = makeProduct("apparel", 1000);
    expect(calculateRetailPrice(product)).toBe(Math.round(1000 * 2.6) + 500);
  });

  it("calculates drinkware pricing correctly", () => {
    const product = makeProduct("drinkware", 1000);
    expect(calculateRetailPrice(product)).toBe(Math.round(1000 * 2.8) + 400);
  });

  it("calculates accessories pricing correctly", () => {
    const product = makeProduct("accessories", 1000);
    expect(calculateRetailPrice(product)).toBe(Math.round(1000 * 2.8) + 300);
  });

  it("calculates wall-art pricing correctly", () => {
    const product = makeProduct("wall-art", 1000);
    expect(calculateRetailPrice(product)).toBe(Math.round(1000 * 3.0) + 800);
  });

  it("calculates home-living pricing correctly", () => {
    const product = makeProduct("home-living", 1000);
    expect(calculateRetailPrice(product)).toBe(Math.round(1000 * 2.7) + 600);
  });

  it("adds variant additionalPriceCents to base price", () => {
    const product = makeProduct("apparel", 1000);
    const variant = makeVariant(250);
    expect(calculateRetailPrice(product, variant)).toBe(Math.round(1250 * 2.6) + 500);
  });

  it("handles undefined variant by using base price only", () => {
    const product = makeProduct("drinkware", 1500);
    expect(calculateRetailPrice(product, undefined)).toBe(Math.round(1500 * 2.8) + 400);
  });

  it("handles zero base price", () => {
    const product = makeProduct("accessories", 0);
    expect(calculateRetailPrice(product)).toBe(0 + 300);
  });

  it("handles variant with zero additionalPriceCents", () => {
    const product = makeProduct("wall-art", 500);
    const variant = makeVariant(0);
    expect(calculateRetailPrice(product, variant)).toBe(Math.round(500 * 3.0) + 800);
  });

  it("rounds fractional cents correctly", () => {
    const product = makeProduct("apparel", 333);
    expect(calculateRetailPrice(product)).toBe(Math.round(333 * 2.6) + 500);
  });
});

describe("calculateProfit", () => {
  it("returns profit for a simple sale", () => {
    expect(calculateProfit(1000, 3000, 500)).toBe(1500);
  });

  it("returns negative profit when costs exceed retail", () => {
    expect(calculateProfit(2000, 1500, 500)).toBe(-1000);
  });
});

describe("PRODUCT_MARKUP", () => {
  it("has markup tiers for all categories", () => {
    expect(PRODUCT_MARKUP.apparel).toEqual({ multiplier: 2.6, shippingBufferCents: 500 });
    expect(PRODUCT_MARKUP.drinkware).toEqual({ multiplier: 2.8, shippingBufferCents: 400 });
    expect(PRODUCT_MARKUP.accessories).toEqual({ multiplier: 2.8, shippingBufferCents: 300 });
    expect(PRODUCT_MARKUP["wall-art"]).toEqual({ multiplier: 3.0, shippingBufferCents: 800 });
    expect(PRODUCT_MARKUP["home-living"]).toEqual({ multiplier: 2.7, shippingBufferCents: 600 });
  });
});
