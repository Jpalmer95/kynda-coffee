/**
 * Canonical SMS message templates for Kynda Coffee.
 *
 * IMPORTANT: The wording in this module matches the sample messages and
 * disclosures submitted in our Twilio A2P 10DLC campaign registration.
 * Campaign reviewers approve specific message text — do NOT reword these
 * templates casually. If wording changes materially, update the campaign
 * samples in the Twilio Console to match.
 *
 * Approved campaign samples (July 2026 resubmission):
 *  1. "Kynda Coffee: Your order [QR-XXXXXXXXXX-XXXXXX] is confirmed! We're
 *     working on your order now. Track at kyndacoffee.com/track-order
 *     Reply STOP to opt out."
 *  2. "Kynda Coffee: Order [QR-XXXXXXXXXX-XXXXXX] is ready for pickup at
 *     the counter. See you in a sec!"
 *
 * Every message identifies the sender ("Kynda Coffee:") per CTIA guidelines.
 * Transactional status messages intentionally omit STOP instructions to
 * keep texts short — opt-out handling is disclosed at opt-in time and in
 * the welcome message, and Twilio's carrier-level STOP works regardless.
 */

/** One-time welcome text sent the first time a customer consents to SMS. */
export function optInWelcomeSms(): string {
  return "Kynda Coffee: You're signed up for order status texts. Msg frequency varies. Msg&data rates may apply. Reply HELP for help, STOP to cancel.";
}

/** Order confirmation — fired when Stripe payment succeeds. Matches
 *  approved campaign sample message #1 (includes STOP disclosure). */
export function orderConfirmationSms(orderNumber: string): string {
  return `Kynda Coffee: Your order ${orderNumber} is confirmed! We're working on your order now. Track at kyndacoffee.com/track-order Reply STOP to opt out.`;
}

/** "Ready for pickup" — fired on the KDS processing→ready bump.
 *  Counter/table/curbside variants; counter variant matches approved
 *  campaign sample message #2. */
export function orderReadySms(orderNumber: string, mode?: string): string {
  if (mode === "pickup" || mode === "parking") {
    return `Kynda Coffee: Order ${orderNumber} is ready — we're bringing it out to your vehicle now!`;
  }
  if (mode === "table") {
    return `Kynda Coffee: Order ${orderNumber} is ready — we're bringing it to your table!`;
  }
  return `Kynda Coffee: Order ${orderNumber} is ready for pickup at the counter. See you in a sec!`;
}

/** Merch/shipped-order status updates (Shop flow). Only sent to numbers
 *  that explicitly consented. */
export function orderStatusSms(orderNumber: string, status: string): string {
  const messages: Record<string, string> = {
    confirmed: `Kynda Coffee: Your order ${orderNumber} is confirmed! We're working on your order now. Track at kyndacoffee.com/track-order Reply STOP to opt out.`,
    shipped: `Kynda Coffee: Great news! Your order ${orderNumber} has shipped. Track at kyndacoffee.com/track-order`,
    delivered: `Kynda Coffee: Your order ${orderNumber} has been delivered. Enjoy your coffee!`,
    refunded: `Kynda Coffee: Your order ${orderNumber} has been refunded. The funds will appear in 3-5 business days.`,
  };
  return messages[status] ?? `Kynda Coffee: Your order ${orderNumber} status is now: ${status}`;
}
