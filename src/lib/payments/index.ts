import type { PaymentProvider, PaymentProviderName } from "./types";
import { StripePaymentProvider } from "./stripe-provider";
import { SquarePaymentProvider } from "./square-provider";

export type {
  PaymentProvider,
  PaymentProviderName,
  CheckoutLineItem,
  CreateCheckoutInput,
  CheckoutSessionResult,
  NormalizedWebhookEvent,
} from "./types";

const VALID: PaymentProviderName[] = ["stripe", "square"];

/**
 * Resolve the configured provider name from a raw env value. Pure + testable.
 * Defaults to "stripe"; unknown values fall back to "stripe" with a warning so a
 * typo can never take checkout fully offline.
 */
export function resolveProviderName(raw: string | undefined): PaymentProviderName {
  const v = (raw ?? "").trim().toLowerCase();
  if ((VALID as string[]).includes(v)) return v as PaymentProviderName;
  if (v) console.warn(`[payments] Unknown PAYMENT_PROVIDER "${raw}" — falling back to stripe.`);
  return "stripe";
}

const factories: Record<PaymentProviderName, () => PaymentProvider> = {
  stripe: () => new StripePaymentProvider(),
  square: () => new SquarePaymentProvider(),
};

let _cached: PaymentProvider | null = null;

/**
 * Get the configured payment provider (singleton). Switch processors by setting
 * PAYMENT_PROVIDER=square|stripe in env — no checkout/webhook code changes.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!_cached) {
    _cached = factories[resolveProviderName(process.env.PAYMENT_PROVIDER)]();
  }
  return _cached;
}

/** Test-only: reset the cached singleton. */
export function __resetPaymentProviderForTests(): void {
  _cached = null;
}
