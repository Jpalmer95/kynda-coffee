// Minimal Printful types for Kynda Coffee (order placement + variants + shipping)

export interface PrintfulVariant {
  id: number;
  external_id?: string;
  name: string;
  retail_price?: string;
  currency?: string;
}

export interface PrintfulProductVariant {
  id: number;
  variant_id: number;
  quantity: number;
  retail_price: string;
  currency?: string;
}

export interface PrintfulAddress {
  name: string;
  address1: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface PrintfulCreateOrderPayload {
  external_id?: string;
  recipient: PrintfulAddress;
  items: PrintfulProductVariant[];
  retail_costs?: {
    shipping?: string;
    total?: string;
  };
  confirm?: boolean; // set true to place order immediately
}

export interface PrintfulShippingEstimate {
  id: number;
  name: string;
  rate: string;
  currency: string;
  min_delivery_days?: number;
  max_delivery_days?: number;
}

export interface PrintfulOrderResponse {
  id: number;
  external_id?: string;
  status: string;
  shipping: PrintfulShippingEstimate;
  costs: {
    total: string;
    currency: string;
  };
  retail_costs: {
    total: string;
    currency: string;
  };
}