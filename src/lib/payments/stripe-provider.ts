import { getStripe } from "../stripe/client";
import type {
  PaymentProvider,
  PaymentProviderName,
  CreateCheckoutInput,
  CheckoutSessionResult,
  NormalizedWebhookEvent,
} from "./types";

/**
 * Stripe payment adapter — wraps the existing Stripe Checkout flow behind the
 * provider-agnostic PaymentProvider interface. This is the current production
 * processor; the abstraction lets the platform swap to Square (or another) via
 * PAYMENT_PROVIDER env without touching checkout/webhook business logic.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderName = "stripe";

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult> {
    const stripe = getStripe();
    const currency = input.currency ?? "usd";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail,
      line_items: input.lineItems.map((li) => ({
        quantity: li.quantity,
        price_data: {
          currency,
          unit_amount: li.amountCents,
          product_data: {
            name: li.name,
            ...(li.description ? { description: li.description } : {}),
            ...(li.imageUrl ? { images: [li.imageUrl] } : {}),
          },
        },
      })),
      success_url: input.successUrl.includes("session_id")
        ? input.successUrl
        : `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl,
      ...(input.collectShippingAddress ? { shipping_address_collection: { allowed_countries: ["US"] } } : {}),
      metadata: input.metadata ?? {},
    } as never);

    return { url: session.url, sessionId: session.id, provider: this.name };
  }

  async verifyAndParseWebhook(payload: string, signature: string): Promise<NormalizedWebhookEvent> {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");

    // Throws on bad signature → caller returns 400.
    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    let type: NormalizedWebhookEvent["type"] = "other";
    if (event.type === "checkout.session.completed") type = "checkout.completed";
    else if (event.type === "payment_intent.succeeded") type = "payment.succeeded";
    else if (event.type === "payment_intent.payment_failed") type = "payment.failed";

    const obj = event.data.object as unknown as Record<string, unknown>;
    return {
      provider: this.name,
      type,
      rawType: event.type,
      sessionId: typeof obj.id === "string" ? obj.id : undefined,
      paymentId: typeof obj.payment_intent === "string" ? obj.payment_intent : undefined,
      amountCents: typeof obj.amount_total === "number" ? obj.amount_total : undefined,
      currency: typeof obj.currency === "string" ? obj.currency : undefined,
      customerEmail:
        typeof obj.customer_email === "string"
          ? obj.customer_email
          : (obj.customer_details as { email?: string } | undefined)?.email,
      metadata: (obj.metadata as Record<string, string>) ?? {},
    };
  }
}
