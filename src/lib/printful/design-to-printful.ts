import type { CartItem } from "@/types";

interface PrintfulRecipient {
  name: string;
  address1: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  email?: string;
}

export function buildPrintfulPayloadFromDesignItems(
  designItems: CartItem[],
  recipient: PrintfulRecipient
) {
  const items = designItems.map((item) => {
    const design = item.product.design_data || {};
    return {
      variant_id: Number(design.printful_variant_id || 12345),
      quantity: item.quantity,
      retail_price: (item.product.price_cents / 100).toFixed(2),
    };
  });

  return {
    recipient,
    items,
  };
}
