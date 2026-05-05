import type { PosCatalogItem, PosCatalogModifier, PosCatalogVariation } from "@/lib/pos/catalog";

export type QrFulfillmentMode = "table" | "lobby" | "parking" | "pickup";
export type QrPaymentPreference = "pay_at_counter" | "online_later";

export interface QrOrderRequestItem {
  providerItemId: string;
  providerVariationId?: string;
  quantity: number;
  modifierIds?: string[];
  notes?: string;
}

export interface QrOrderRequest {
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  fulfillment?: {
    mode?: QrFulfillmentMode;
    label?: string;
  };
  paymentPreference?: QrPaymentPreference;
  notes?: string;
  items?: QrOrderRequestItem[];
}

export interface NormalizedQrOrderRequest {
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  fulfillment: {
    mode: QrFulfillmentMode;
    label: string;
  };
  paymentPreference: QrPaymentPreference;
  notes: string;
  items: Array<{
    providerItemId: string;
    providerVariationId?: string;
    quantity: number;
    modifierIds: string[];
    notes: string;
  }>;
}

export interface OrderModifierDraft {
  provider_modifier_id: string;
  provider_modifier_list_id: string;
  name: string;
  price_cents: number;
}

export interface QrOrderLineItemDraft {
  product_id: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  provider: string;
  provider_item_id: string;
  provider_variation_id?: string;
  modifiers: OrderModifierDraft[];
  notes?: string;
}

export interface QrOrderDraft {
  order_number: string;
  customer_id: null;
  email: string;
  status: "pending";
  source: "qr";
  items: QrOrderLineItemDraft[];
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address: null;
  notes: string;
  fulfillment_metadata: {
    mode: QrFulfillmentMode;
    label: string;
    customer_name: string;
    customer_phone: string;
    payment_preference: QrPaymentPreference;
  };
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const WALKUP_EMAIL = "walkup@kyndacoffee.local";
const MAX_LINE_QUANTITY = 20;
const MAX_CART_LINES = 50;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanEmail(value: unknown): string {
  return cleanText(value).toLowerCase();
}

function isQrFulfillmentMode(value: unknown): value is QrFulfillmentMode {
  return value === "table" || value === "lobby" || value === "parking" || value === "pickup";
}

function isQrPaymentPreference(value: unknown): value is QrPaymentPreference {
  return value === "pay_at_counter" || value === "online_later";
}

function orderNumberFromDate(now: Date): string {
  const compact = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `QR-${compact.slice(0, 8)}-${compact.slice(9, 15)}`;
}

export function validateQrOrderRequest(request: QrOrderRequest): Result<NormalizedQrOrderRequest> {
  const name = cleanText(request.customer?.name);
  if (!name) return { ok: false, error: "Customer name is required." };

  const phone = cleanText(request.customer?.phone);
  const email = cleanEmail(request.customer?.email);
  if (!phone && !email) return { ok: false, error: "Customer phone or email is required." };

  const mode = request.fulfillment?.mode ?? "lobby";
  if (!isQrFulfillmentMode(mode)) return { ok: false, error: "Invalid fulfillment mode." };

  const label = cleanText(request.fulfillment?.label);
  if (mode === "table" && !label) return { ok: false, error: "Table number is required for table orders." };
  if (mode === "parking" && !label) return { ok: false, error: "Parking spot is required for parking orders." };

  const paymentPreference = request.paymentPreference ?? "pay_at_counter";
  if (!isQrPaymentPreference(paymentPreference)) return { ok: false, error: "Invalid payment preference." };

  const rawItems = Array.isArray(request.items) ? request.items : [];
  if (rawItems.length === 0) return { ok: false, error: "Cart is empty." };
  if (rawItems.length > MAX_CART_LINES) return { ok: false, error: "Cart has too many line items." };

  const items = rawItems.map((item) => ({
    providerItemId: cleanText(item.providerItemId),
    providerVariationId: cleanText(item.providerVariationId) || undefined,
    quantity: Number.isFinite(item.quantity) ? Math.floor(item.quantity) : 0,
    modifierIds: Array.from(new Set((item.modifierIds ?? []).map(cleanText).filter(Boolean))),
    notes: cleanText(item.notes).slice(0, 500),
  }));

  for (const item of items) {
    if (!item.providerItemId) return { ok: false, error: "Each cart item needs a provider item id." };
    if (item.quantity < 1 || item.quantity > MAX_LINE_QUANTITY) {
      return { ok: false, error: `Quantity for ${item.providerItemId} must be between 1 and ${MAX_LINE_QUANTITY}.` };
    }
  }

  return {
    ok: true,
    value: {
      customer: { name, phone, email },
      fulfillment: { mode, label },
      paymentPreference,
      notes: cleanText(request.notes).slice(0, 1000),
      items,
    },
  };
}

function flattenModifiers(item: PosCatalogItem): PosCatalogModifier[] {
  return item.modifierLists.flatMap((list) => list.modifiers);
}

function findVariation(item: PosCatalogItem, providerVariationId?: string): PosCatalogVariation | undefined {
  if (providerVariationId) {
    return item.variations.find((variation) => variation.providerVariationId === providerVariationId);
  }
  return item.variations[0];
}

function validateModifierSelections(item: PosCatalogItem, modifierIds: string[]): Result<OrderModifierDraft[]> {
  const modifierCountsByList = new Map<string, number>();
  const modifiers = flattenModifiers(item);
  const selected: OrderModifierDraft[] = [];

  for (const modifierId of modifierIds) {
    const modifier = modifiers.find((candidate) => candidate.providerModifierId === modifierId);
    if (!modifier) return { ok: false, error: `Invalid modifier for ${item.name}.` };

    modifierCountsByList.set(
      modifier.providerModifierListId,
      (modifierCountsByList.get(modifier.providerModifierListId) ?? 0) + 1
    );
    selected.push({
      provider_modifier_id: modifier.providerModifierId,
      provider_modifier_list_id: modifier.providerModifierListId,
      name: modifier.name,
      price_cents: modifier.priceCents,
    });
  }

  for (const list of item.modifierLists) {
    const count = modifierCountsByList.get(list.providerModifierListId) ?? 0;
    if (list.minSelectedModifiers !== null && list.minSelectedModifiers > 0 && count < list.minSelectedModifiers) {
      return { ok: false, error: `${list.name} requires at least ${list.minSelectedModifiers} modifier(s).` };
    }
    if (list.maxSelectedModifiers !== null && list.maxSelectedModifiers > 0 && count > list.maxSelectedModifiers) {
      return { ok: false, error: `${list.name} allows at most ${list.maxSelectedModifiers} modifier(s).` };
    }
  }

  return { ok: true, value: selected };
}

export function buildQrOrderDraft(
  request: QrOrderRequest,
  catalogItems: PosCatalogItem[],
  now = new Date()
): Result<QrOrderDraft> {
  const normalized = validateQrOrderRequest(request);
  if (!normalized.ok) return normalized;

  const lines: QrOrderLineItemDraft[] = [];

  for (const requestedItem of normalized.value.items) {
    const item = catalogItems.find((candidate) => candidate.providerItemId === requestedItem.providerItemId);
    if (!item || !item.availableQr) return { ok: false, error: `${requestedItem.providerItemId} is not available for QR ordering.` };

    const variation = findVariation(item, requestedItem.providerVariationId);
    if (!variation) return { ok: false, error: `Invalid variation for ${item.name}.` };

    const modifiers = validateModifierSelections(item, requestedItem.modifierIds);
    if (!modifiers.ok) return modifiers;

    const modifiersCents = modifiers.value.reduce((sum, modifier) => sum + modifier.price_cents, 0);
    const unitPriceCents = variation.priceCents + modifiersCents;
    const totalCents = unitPriceCents * requestedItem.quantity;

    lines.push({
      product_id: `pos:${item.id}`,
      product_name: item.name,
      variant_name: variation.name,
      quantity: requestedItem.quantity,
      unit_price_cents: unitPriceCents,
      total_cents: totalCents,
      provider: item.provider,
      provider_item_id: item.providerItemId,
      provider_variation_id: variation.providerVariationId,
      modifiers: modifiers.value,
      ...(requestedItem.notes ? { notes: requestedItem.notes } : {}),
    });
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.total_cents, 0);

  return {
    ok: true,
    value: {
      order_number: orderNumberFromDate(now),
      customer_id: null,
      email: normalized.value.customer.email || WALKUP_EMAIL,
      status: "pending",
      source: "qr",
      items: lines,
      subtotal_cents: subtotalCents,
      tax_cents: 0,
      shipping_cents: 0,
      total_cents: subtotalCents,
      shipping_address: null,
      notes: normalized.value.notes,
      fulfillment_metadata: {
        mode: normalized.value.fulfillment.mode,
        label: normalized.value.fulfillment.label,
        customer_name: normalized.value.customer.name,
        customer_phone: normalized.value.customer.phone,
        payment_preference: normalized.value.paymentPreference,
      },
    },
  };
}
