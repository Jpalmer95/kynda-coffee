import { describe, it, expect } from "vitest";
import type { PosCatalogItem } from "@/lib/pos/catalog";
import {
  buildQrOrderDraft,
  validateQrOrderRequest,
  type QrOrderRequest,
} from "./qr-order";

function catalogItem(overrides: Partial<PosCatalogItem> = {}): PosCatalogItem {
  return {
    id: "item-latte",
    provider: "square",
    providerItemId: "SQ_ITEM_LATTE",
    name: "Latte",
    description: "Espresso and milk",
    categoryName: "Coffee Drinks",
    itemType: "menu",
    availableOnline: true,
    availablePickup: true,
    availableDelivery: false,
    availableShipping: false,
    availableQr: true,
    imageUrls: [],
    modifierListIds: ["MOD_MILK", "MOD_FLAVOR"],
    taxIds: [],
    variations: [
      {
        id: "var-small",
        provider: "square",
        providerItemId: "SQ_ITEM_LATTE",
        providerVariationId: "SQ_VAR_SMALL",
        name: "Small",
        sku: null,
        ordinal: 1,
        priceCents: 450,
        currency: "USD",
        priceLabel: "$4.50",
        pricingType: "FIXED_PRICING",
        trackInventory: false,
        sellable: true,
        stockable: false,
      },
      {
        id: "var-large",
        provider: "square",
        providerItemId: "SQ_ITEM_LATTE",
        providerVariationId: "SQ_VAR_LARGE",
        name: "Large",
        sku: null,
        ordinal: 2,
        priceCents: 650,
        currency: "USD",
        priceLabel: "$6.50",
        pricingType: "FIXED_PRICING",
        trackInventory: false,
        sellable: true,
        stockable: false,
      },
    ],
    modifierLists: [
      {
        id: "list-milk",
        provider: "square",
        providerModifierListId: "MOD_MILK",
        name: "Milk Options",
        selectionType: "SINGLE",
        minSelectedModifiers: 0,
        maxSelectedModifiers: 1,
        modifiers: [
          {
            id: "mod-oat",
            provider: "square",
            providerModifierId: "MOD_OAT",
            providerModifierListId: "MOD_MILK",
            name: "Oat Milk",
            priceCents: 75,
            currency: "USD",
            priceLabel: "$0.75",
            ordinal: 1,
            onByDefault: false,
          },
        ],
      },
      {
        id: "list-flavor",
        provider: "square",
        providerModifierListId: "MOD_FLAVOR",
        name: "Flavor",
        selectionType: "MULTIPLE",
        minSelectedModifiers: 0,
        maxSelectedModifiers: 3,
        modifiers: [
          {
            id: "mod-vanilla",
            provider: "square",
            providerModifierId: "MOD_VANILLA",
            providerModifierListId: "MOD_FLAVOR",
            name: "Vanilla",
            priceCents: 50,
            currency: "USD",
            priceLabel: "$0.50",
            ordinal: 1,
            onByDefault: false,
          },
        ],
      },
    ],
    priceCents: 450,
    currency: "USD",
    priceLabel: "from $4.50",
    variationLabels: ["Small • $4.50", "Large • $6.50"],
    ...overrides,
  };
}

const validRequest: QrOrderRequest = {
  customer: {
    name: "Jonathan",
    phone: "512-555-0100",
    email: "jonathan@example.com",
  },
  fulfillment: {
    mode: "table",
    label: "12",
  },
  paymentPreference: "pay_at_counter",
  notes: "Please make it extra hot",
  items: [
    {
      providerItemId: "SQ_ITEM_LATTE",
      providerVariationId: "SQ_VAR_LARGE",
      quantity: 2,
      modifierIds: ["MOD_OAT", "MOD_VANILLA"],
      notes: "Light ice",
    },
  ],
};

describe("QR order request validation", () => {
  it("normalizes a valid request", () => {
    const result = validateQrOrderRequest(validRequest);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.customer.name).toBe("Jonathan");
    expect(result.value.customer.phone).toBe("512-555-0100");
    expect(result.value.customer.email).toBe("jonathan@example.com");
    expect(result.value.fulfillment.mode).toBe("table");
    expect(result.value.fulfillment.label).toBe("12");
    expect(result.value.items[0].quantity).toBe(2);
  });

  it("rejects missing customer contact and empty carts", () => {
    const result = validateQrOrderRequest({
      customer: { name: "" },
      fulfillment: { mode: "lobby" },
      items: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/customer name/i);
    }
  });

  it("requires table and parking labels for context-specific modes", () => {
    const table = validateQrOrderRequest({
      ...validRequest,
      fulfillment: { mode: "table", label: "" },
    });
    const parking = validateQrOrderRequest({
      ...validRequest,
      fulfillment: { mode: "parking", label: "" },
    });

    expect(table.ok).toBe(false);
    if (!table.ok) expect(table.error).toMatch(/table/i);
    expect(parking.ok).toBe(false);
    if (!parking.ok) expect(parking.error).toMatch(/parking/i);
  });
});

describe("QR order draft builder", () => {
  it("prices variations, modifiers, quantity, and metadata into an order draft", () => {
    const result = buildQrOrderDraft(validRequest, [catalogItem()], new Date("2026-05-05T12:34:56.000Z"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.order_number).toBe("QR-20260505-123456");
    expect(result.value.email).toBe("jonathan@example.com");
    expect(result.value.status).toBe("pending");
    expect(result.value.source).toBe("qr");
    expect(result.value.subtotal_cents).toBe(1550);
    expect(result.value.tax_cents).toBe(0);
    expect(result.value.shipping_cents).toBe(0);
    expect(result.value.total_cents).toBe(1550);
    expect(result.value.items[0]).toEqual({
      product_id: "pos:item-latte",
      product_name: "Latte",
      variant_name: "Large",
      quantity: 2,
      unit_price_cents: 775,
      total_cents: 1550,
      provider: "square",
      provider_item_id: "SQ_ITEM_LATTE",
      provider_variation_id: "SQ_VAR_LARGE",
      modifiers: [
        {
          provider_modifier_id: "MOD_OAT",
          provider_modifier_list_id: "MOD_MILK",
          name: "Oat Milk",
          price_cents: 75,
        },
        {
          provider_modifier_id: "MOD_VANILLA",
          provider_modifier_list_id: "MOD_FLAVOR",
          name: "Vanilla",
          price_cents: 50,
        },
      ],
      notes: "Light ice",
    });
    expect(result.value.fulfillment_metadata).toEqual({
      mode: "table",
      label: "12",
      customer_name: "Jonathan",
      customer_phone: "512-555-0100",
      payment_preference: "pay_at_counter",
      sms_consent: false,
    });
    expect(result.value.payment_status).toBe("unpaid");
    expect(result.value.payment_method).toBe("pay_at_counter");
    expect(result.value.paid_at).toBe(null);
    expect(result.value.payment_metadata).toEqual({ initial_preference: "pay_at_counter" });
  });

  it("rejects unavailable items, invalid variations, invalid modifiers, and excessive modifier counts", () => {
    const unavailable = buildQrOrderDraft(validRequest, [catalogItem({ availableQr: false })]);
    const badVariation = buildQrOrderDraft(
      { ...validRequest, items: [{ ...validRequest.items![0], providerVariationId: "BAD" }] },
      [catalogItem()]
    );
    const tooManyModifiers = buildQrOrderDraft(
      { ...validRequest, items: [{ ...validRequest.items![0], modifierIds: ["MOD_OAT", "MOD_VANILLA"] }] },
      [catalogItem({
        modifierLists: [{ ...catalogItem().modifierLists[0], maxSelectedModifiers: 1 }],
        modifierListIds: ["MOD_MILK"],
      })]
    );

    expect(unavailable.ok).toBe(false);
    if (!unavailable.ok) expect(unavailable.error).toMatch(/not available/i);
    expect(badVariation.ok).toBe(false);
    if (!badVariation.ok) expect(badVariation.error).toMatch(/variation/i);
    expect(tooManyModifiers.ok).toBe(false);
    if (!tooManyModifiers.ok) expect(tooManyModifiers.error).toMatch(/modifier/i);
  });
});
