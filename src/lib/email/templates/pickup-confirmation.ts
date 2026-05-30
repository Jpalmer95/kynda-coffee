/**
 * Pickup / in-store order confirmation email (Roadmap V2 — Epic 9).
 *
 * Pure HTML builder for orders placed via /api/orders/submit (QR / café / pickup
 * / curbside / dine-in), where copy should be pickup-oriented — NOT the
 * shipping-oriented shop template. No DB/network; the route passes order data in.
 */

export interface PickupConfirmationItem {
  name: string;
  quantity: number;
  total_cents: number;
}

export interface PickupConfirmationData {
  name?: string;
  orderNumber: string;
  items: PickupConfirmationItem[];
  totalCents: number;
  /** Human label for the fulfillment mode, e.g. "Curbside pickup". */
  fulfillmentLabel?: string;
  /** Whether the customer still owes payment at the counter. */
  payAtCounter?: boolean;
  notes?: string;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const C = { charcoal: "#2b2b2b", rust: "#b5572f", cream: "#f6f1e7", mocha: "#6f6257", line: "#e7ddcd" };

/** Subject line for a pickup confirmation. */
export function pickupConfirmationSubject(orderNumber: string): string {
  return `Order received — #${orderNumber} · Kynda Coffee`;
}

export function pickupConfirmationHtml(data: PickupConfirmationData): string {
  const rows = (data.items || [])
    .map(
      (i) =>
        `<tr><td style="padding:4px 0;color:${C.charcoal}">${i.quantity}× ${esc(i.name)}</td>` +
        `<td style="padding:4px 0;text-align:right;color:${C.charcoal}">$${((i.total_cents || 0) / 100).toFixed(2)}</td></tr>`
    )
    .join("");

  const fulfillment = data.fulfillmentLabel
    ? `<p style="margin:0 0 4px;color:${C.rust};font-weight:600">${esc(data.fulfillmentLabel)}</p>`
    : "";

  const payLine = data.payAtCounter
    ? `<p style="margin:12px 0 0;color:${C.mocha};font-size:14px">Please pay at the counter when you arrive (unless a team member tells you otherwise).</p>`
    : `<p style="margin:12px 0 0;color:${C.mocha};font-size:14px">You're all set — payment received. Just come grab it.</p>`;

  const notes = data.notes
    ? `<p style="margin:12px 0 0;color:${C.mocha};font-size:14px"><strong>Notes:</strong> ${esc(data.notes)}</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${C.cream};font-family:Georgia,'Times New Roman',serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background:${C.cream}">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:${C.charcoal};padding:24px 28px;text-align:center">
          <h1 style="margin:0;color:${C.cream};font-size:22px;letter-spacing:1px">Kynda Coffee</h1>
        </td></tr>
        <tr><td style="padding:28px">
          <h2 style="margin:0 0 6px;color:${C.charcoal};font-size:20px">Thanks, ${esc(data.name || "friend")} — we've got your order!</h2>
          <p style="margin:0 0 16px;color:${C.mocha};font-size:15px">Order <strong>#${esc(data.orderNumber)}</strong></p>
          ${fulfillment}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border-top:1px solid ${C.line};border-bottom:1px solid ${C.line}">
            ${rows}
          </table>
          <p style="margin:8px 0 0;text-align:right;font-weight:700;color:${C.charcoal};font-size:16px">Total: $${((data.totalCents || 0) / 100).toFixed(2)}</p>
          ${payLine}
          ${notes}
          <p style="margin:20px 0 0;color:${C.mocha};font-size:13px">4315 FM 2147, Horseshoe Bay, TX 78657 · We'll have it ready soon. ☕</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
