import { randomUUID } from "node:crypto";
import { squareClient } from "../square/client";
import type {
  PaymentProvider,
  PaymentProviderName,
  CreateCheckoutInput,
  CheckoutSessionResult,
  NormalizedWebhookEvent,
} from "./types";

/**
 * Square payment adapter — hosted checkout via Square's Payment Links (Checkout
 * API). Proves the payment layer is provider-agnostic: the same checkout call
 * site works against Square when PAYMENT_PROVIDER=square. Webhook verification
 * uses Square's HMAC-SHA256 signature scheme.
 */
export class SquarePaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderName = "square";

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult> {
    const currency = (input.currency ?? "usd").toUpperCase();
    const checkout = squareClient().checkoutApi;

    const { result } = await checkout.createPaymentLink({
      idempotencyKey: randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID ?? "",
        lineItems: input.lineItems.map((li) => ({
          name: li.name,
          quantity: String(li.quantity),
          basePriceMoney: { amount: BigInt(li.amountCents), currency: currency as never },
        })),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
      checkoutOptions: {
        redirectUrl: input.successUrl,
        askForShippingAddress: Boolean(input.collectShippingAddress),
      },
      prePopulatedData: { buyerEmail: input.customerEmail },
    });

    const link = result.paymentLink;
    return {
      url: link?.url ?? null,
      sessionId: link?.id ?? link?.orderId ?? "",
      provider: this.name,
    };
  }

  async verifyAndParseWebhook(payload: string, signature: string): Promise<NormalizedWebhookEvent> {
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
    if (!signatureKey || !notificationUrl) {
      throw new Error("SQUARE_WEBHOOK_SIGNATURE_KEY and SQUARE_WEBHOOK_NOTIFICATION_URL must be set");
    }

    // Square HMAC-SHA256 over (notificationUrl + rawBody), base64.
    const { createHmac } = await import("node:crypto");
    const expected = createHmac("sha256", signatureKey)
      .update(notificationUrl + payload)
      .digest("base64");
    if (expected !== signature) {
      throw new Error("Invalid Square webhook signature");
    }

    const event = JSON.parse(payload) as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    const rawType = event.type ?? "unknown";
    let type: NormalizedWebhookEvent["type"] = "other";
    if (rawType === "payment.updated" || rawType === "payment.created") type = "payment.succeeded";
    else if (rawType.startsWith("order.") && rawType.includes("fulfill")) type = "checkout.completed";

    const paymentObj = (event.data?.object?.payment ?? {}) as Record<string, unknown>;
    const amountMoney = (paymentObj.amount_money ?? {}) as { amount?: number; currency?: string };

    return {
      provider: this.name,
      type,
      rawType,
      paymentId: typeof paymentObj.id === "string" ? paymentObj.id : undefined,
      sessionId: typeof paymentObj.order_id === "string" ? paymentObj.order_id : undefined,
      amountCents: typeof amountMoney.amount === "number" ? amountMoney.amount : undefined,
      currency: amountMoney.currency,
      customerEmail: typeof paymentObj.buyer_email_address === "string" ? paymentObj.buyer_email_address : undefined,
    };
  }
}
