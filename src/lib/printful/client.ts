// Printful API client (server-only)
// Requires PRINTFUL_API_KEY in Coolify env

import {
  PrintfulCreateOrderPayload,
  PrintfulOrderResponse,
  PrintfulShippingEstimate,
} from "./types";

const PRINTFUL_API = "https://api.printful.com";
const API_KEY = process.env.PRINTFUL_API_KEY!;

async function pfFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PRINTFUL_API}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Printful error ${res.status}: ${error.error || res.statusText}`);
  }
  return res.json();
}

export async function getVariantPrices(storeId?: number) {
  const qs = storeId ? `?store_id=${storeId}` : "";
  return pfFetch<{ result: any[] }>(`/store/variants${qs}`);
}

export async function createOrder(payload: PrintfulCreateOrderPayload) {
  return pfFetch<{ result: PrintfulOrderResponse }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function estimateShipping(
  recipient: PrintfulCreateOrderPayload["recipient"],
  items: PrintfulCreateOrderPayload["items"]
) {
  return pfFetch<{ result: PrintfulShippingEstimate[] }>("/shipping/rates", {
    method: "POST",
    body: JSON.stringify({ recipient, items }),
  });
}

export async function confirmOrder(orderId: number) {
  return pfFetch(`/orders/${orderId}/confirm`, { method: "POST" });
}

/**
 * Update the recipient (shipping) address on a draft Printful order.
 *
 * Used to reconcile the address Stripe actually collected/verified at
 * checkout — which for wallet payments (Apple Pay / Google Pay / Link) comes
 * from the customer's wallet and can differ from whatever was typed into our
 * own form when the draft was created. Must be called BEFORE confirmOrder()
 * so the order ships to the authoritative Stripe-verified address.
 */
export async function updateOrderRecipient(
  orderId: number,
  recipient: PrintfulCreateOrderPayload["recipient"]
) {
  return pfFetch<{ result: PrintfulOrderResponse }>(`/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({ recipient }),
  });
}
