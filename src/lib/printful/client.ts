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
