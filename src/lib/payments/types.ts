/**
 * Payment abstraction layer (Roadmap V2 — Epic 10, payment-agnostic).
 *
 * Provider-agnostic types so checkout/webhook code never imports a specific
 * payment SDK directly. Mirrors the POS adapter pattern: a factory picks the
 * provider from PAYMENT_PROVIDER env (default "stripe"), and every provider
 * implements the same PaymentProvider interface. Switching processors is then a
 * config change, not a rewrite — the core promise of "payment-agnostic."
 */

export type PaymentProviderName = "stripe" | "square";

export interface CheckoutLineItem {
  name: string;
  /** Unit price in integer cents. */
  amountCents: number;
  quantity: number;
  imageUrl?: string;
  description?: string;
}

export interface CreateCheckoutInput {
  lineItems: CheckoutLineItem[];
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string; // default "usd"
  /** Opaque key/value metadata carried through to the webhook. */
  metadata?: Record<string, string>;
  /** Collect a US shipping address (shop orders). */
  collectShippingAddress?: boolean;
}

export interface CheckoutSessionResult {
  /** Hosted checkout URL to redirect the customer to. */
  url: string | null;
  /** Provider's session/order id (for reconciliation). */
  sessionId: string;
  provider: PaymentProviderName;
}

export interface NormalizedWebhookEvent {
  provider: PaymentProviderName;
  /** Normalized event kind we care about. */
  type: "checkout.completed" | "payment.succeeded" | "payment.failed" | "other";
  /** Provider's raw event type string (for logging/branching). */
  rawType: string;
  sessionId?: string;
  paymentId?: string;
  amountCents?: number;
  currency?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  /** Create a hosted checkout session and return its redirect URL. */
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult>;

  /**
   * Verify a webhook signature and normalize the event. Implementations must
   * throw if the signature is invalid (so callers can return 400).
   * `payload` is the raw request body string; `signature` the provider header.
   */
  verifyAndParseWebhook(payload: string, signature: string): Promise<NormalizedWebhookEvent>;
}
