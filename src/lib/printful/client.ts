// Printful API client for print-on-demand fulfillment
// Docs: https://developers.printful.com/

const PRINTFUL_API = "https://api.printful.com";

interface PrintfulProduct {
  id: number;
  name: string;
  variants: PrintfulVariant[];
}

interface PrintfulVariant {
  id: number;
  name: string;
  price: string;
  availability_status: string;
}

interface PrintfulOrder {
  external_id: string;
  recipient: {
    name: string;
    address1: string;
    city: string;
    state_code: string;
    zip: string;
    country_code: string;
  };
  items: {
    variant_id: number;
    quantity: number;
    files: { url: string }[];
  }[];
}

async function printfulFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${PRINTFUL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Printful API error: ${res.status} — ${error}`);
  }

  const json = await res.json();
  return json.result;
}

/** List available store products */
export async function listPrintfulProducts() {
  return printfulFetch("/store/products");
}

/** Get product details with variants */
export async function getPrintfulProduct(id: number): Promise<PrintfulProduct> {
  return printfulFetch(`/store/products/${id}`);
}

/** Create a product with a custom design */
export async function createPrintfulProduct(data: {
  name: string;
  variant_id: number;
  design_url: string;
}) {
  return printfulFetch("/store/products", {
    method: "POST",
    body: JSON.stringify({
      sync_product: { name: data.name },
      sync_variants: [
        {
          variant_id: data.variant_id,
          retail_price: "29.99", // Will be overridden by our pricing
          files: [{ url: data.design_url }],
        },
      ],
    }),
  });
}

/** Place an order for fulfillment */
export async function createPrintfulOrder(order: PrintfulOrder) {
  return printfulFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      ...order,
      confirm: true, // Auto-confirm for production
    }),
  });
}

/** Get order status */
export async function getPrintfulOrderStatus(orderId: number) {
  return printfulFetch(`/orders/${orderId}`);
}

/** Get available product catalog (blank items for printing) */
export async function getPrintfulCatalog(categoryId?: number) {
  const params = categoryId ? `?category_id=${categoryId}` : "";
  return printfulFetch(`/products${params}`);
}

// Common Kynda product mappings
export const KYNDA_PRINTFUL_PRODUCTS = {
  "t-shirt": { category: "Men's clothing", product_id: 71 }, // Bella+Canvas 3001
  "hoodie": { category: "Men's clothing", product_id: 146 }, // Gildan 18500
  "mug": { category: "Drinkware", product_id: 19 }, // 11oz Mug
  "tote-bag": { category: "Bags", product_id: 93 }, // Tote Bag
  "hat": { category: "Headwear", product_id: 1 }, // Dad hat
} as const;
