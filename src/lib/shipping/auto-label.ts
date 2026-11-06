/**
 * Automated Shipping Label & Self-Healing Packaging Resupply Engine
 *
 * Pure deterministic module that:
 *  1. Selects the optimal shipping parcel preset (mailer vs box) and weight (oz)
 *     for shipped coffee beans & in-house merchandise orders.
 *  2. Computes the exact packaging SKU decrements (thermal labels, mailers, boxes,
 *     coffee valve bags) so packaging stock self-heals into the Amazon/Uline order list.
 *  3. Generates thermal printer (4x6 ZPL) + Shippo/EasyPost-ready parcel payloads.
 */

export interface ShippedOrderLine {
  name: string;
  quantity: number;
  category?: string;
  weightOzEach?: number;
}

export interface PackagingDecrement {
  sku: string;
  name: string;
  vendor: "Amazon" | "Uline";
  quantityUsed: number;
}

export interface AutoLabelPlan {
  orderId: string;
  parcelPreset: "poly-mailer-10x13" | "box-8x6x4" | "box-12x10x6";
  dimensionsIn: { length: number; width: number; height: number };
  totalWeightOz: number;
  carrierServiceRecommendation: "USPS Ground Advantage" | "UPS Ground";
  estimatedPostageCents: number;
  packagingDecrements: PackagingDecrement[];
  zplThermalPreview: string;
}

export function buildShippingLabelPlan(params: {
  orderId: string;
  recipientName: string;
  cityStateZip: string;
  lines: ShippedOrderLine[];
}): AutoLabelPlan {
  const { orderId, recipientName, cityStateZip, lines } = params;

  let itemWeightOz = 0;
  let totalUnits = 0;
  let beanBagsUsed = 0;

  for (const line of lines) {
    const qty = Math.max(1, Math.floor(line.quantity));
    totalUnits += qty;
    const lower = line.name.toLowerCase();
    const is5lb = /\b5\s*lb\b/i.test(lower);
    const is2lb = /\b2\s*lb\b/i.test(lower);
    const unitOz =
      line.weightOzEach ?? (is5lb ? 82 : is2lb ? 34 : 13.5); // 12oz bag + valve bag tare = 13.5oz
    itemWeightOz += unitOz * qty;

    if (
      line.category === "coffee-beans" ||
      /\b(blend|roast|espresso|ethiopia|colombia|decaf|beans)\b/i.test(lower)
    ) {
      beanBagsUsed += qty;
    }
  }

  let parcelPreset: AutoLabelPlan["parcelPreset"] = "poly-mailer-10x13";
  let dimensionsIn = { length: 10, width: 13, height: 2 };
  let tareOz = 1.5;

  if (totalUnits >= 4 || itemWeightOz > 48) {
    parcelPreset = "box-12x10x6";
    dimensionsIn = { length: 12, width: 10, height: 6 };
    tareOz = 7.5;
  } else if (totalUnits >= 2 || itemWeightOz > 16) {
    parcelPreset = "box-8x6x4";
    dimensionsIn = { length: 8, width: 6, height: 4 };
    tareOz = 4.5;
  }

  const totalWeightOz = Number((itemWeightOz + tareOz).toFixed(1));
  const carrierServiceRecommendation =
    totalWeightOz <= 15.9 ? "USPS Ground Advantage" : "UPS Ground";
  const estimatedPostageCents =
    totalWeightOz <= 15.9 ? 485 : totalWeightOz <= 48 ? 740 : 1090;

  const packagingDecrements: PackagingDecrement[] = [
    {
      sku: "PKG-LABEL-4X6",
      name: "4x6 Direct Thermal Shipping Label",
      vendor: "Amazon",
      quantityUsed: 1,
    },
    parcelPreset === "poly-mailer-10x13"
      ? {
          sku: "PKG-MAILER-10X13",
          name: "10x13 Eco Poly Mailer",
          vendor: "Amazon",
          quantityUsed: 1,
        }
      : {
          sku: parcelPreset === "box-8x6x4" ? "PKG-BOX-8X6X4" : "PKG-BOX-12X10X6",
          name:
            parcelPreset === "box-8x6x4"
              ? "8x6x4 Corrugated Shipping Box"
              : "12x10x6 Corrugated Shipping Box",
          vendor: "Amazon",
          quantityUsed: 1,
        },
  ];

  if (beanBagsUsed > 0) {
    packagingDecrements.push({
      sku: "PKG-BAG-12OZ-VALVE",
      name: "12oz Matte One-Way Valve Coffee Bag",
      vendor: "Amazon",
      quantityUsed: beanBagsUsed,
    });
  }

  const zplThermalPreview = [
    "^XA",
    "^CF0,36",
    "^FO40,40^FDKYNDA COFFEE ROASTERS^FS",
    "^CF0,24",
    "^FO40,85^FD4909 RM 2147, Horseshoe Bay TX 78657^FS",
    "^FO40,130^GB720,3,3^FS",
    `^FO40,155^FDSHIP TO: ${recipientName.replace(/[\^~]/g, "")}^FS`,
    `^FO40,190^FD${cityStateZip.replace(/[\^~]/g, "")}^FS`,
    `^FO40,245^FDService: ${carrierServiceRecommendation} (${totalWeightOz} oz)^FS`,
    `^FO40,280^FDOrder: #${orderId.slice(0, 12)}^FS`,
    "^XZ",
  ].join("\n");

  return {
    orderId,
    parcelPreset,
    dimensionsIn,
    totalWeightOz,
    carrierServiceRecommendation,
    estimatedPostageCents,
    packagingDecrements,
    zplThermalPreview,
  };
}
