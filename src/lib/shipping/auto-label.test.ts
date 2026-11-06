import { describe, it, expect } from "vitest";
import { buildShippingLabelPlan } from "./auto-label";

describe("Automated Shipping Label & Packaging Decrement Engine", () => {
  it("selects a 10x13 mailer and USPS Ground Advantage for a single 12oz bag of beans", () => {
    const plan = buildShippingLabelPlan({
      orderId: "ord_123456789",
      recipientName: "Jane Coffee",
      cityStateZip: "Austin, TX 78701",
      lines: [{ name: "Ethiopia Single Origin 12oz Beans", quantity: 1, category: "coffee-beans" }],
    });
    expect(plan.parcelPreset).toBe("poly-mailer-10x13");
    expect(plan.carrierServiceRecommendation).toBe("USPS Ground Advantage");
    expect(plan.totalWeightOz).toBe(15);
    expect(plan.packagingDecrements.map((d) => d.sku)).toEqual([
      "PKG-LABEL-4X6",
      "PKG-MAILER-10X13",
      "PKG-BAG-12OZ-VALVE",
    ]);
  });

  it("upgrades to a corrugated box and UPS Ground for multi-bag orders", () => {
    const plan = buildShippingLabelPlan({
      orderId: "ord_987654321",
      recipientName: "Hill Country Cafe",
      cityStateZip: "Marble Falls, TX 78654",
      lines: [{ name: "House Espresso Roast 12oz", quantity: 3, category: "coffee-beans" }],
    });
    expect(plan.parcelPreset).toBe("box-8x6x4");
    expect(plan.carrierServiceRecommendation).toBe("UPS Ground");
    expect(
      plan.packagingDecrements.find((d) => d.sku === "PKG-BAG-12OZ-VALVE")?.quantityUsed
    ).toBe(3);
    expect(plan.zplThermalPreview).toContain("KYNDA COFFEE ROASTERS");
  });
});
