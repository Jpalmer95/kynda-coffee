import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format cents to USD string: 1250 -> "$12.50" */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Generate a Kynda order number: KYN-20260418-0001 */
export function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `KYN-${date}-${seq}`;
}

/** Calculate tax for a subtotal (Texas 8.25%) */
export function calculateTax(subtotalCents: number): number {
  return Math.round(subtotalCents * 0.0825);
}

/** Calculate shipping — free over $50, else $5.99 */
export function calculateShipping(subtotalCents: number): number {
  if (subtotalCents >= 5000) return 0;
  return 599;
}

/** Slugify a string for URLs */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Truncate text with ellipsis */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "…";
}
