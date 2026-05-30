/**
 * Newsletter builder (Roadmap V2 — Epic 5).
 *
 * Pure, testable helpers that turn the current specials into a branded HTML
 * newsletter. No DB/network here — the API/cron pass in the data and persist the
 * result into the `newsletters` table (which carries the same approval gate as
 * social posts: draft -> pending_approval -> approved -> sending -> sent).
 *
 * Every rendered email includes a one-click unsubscribe link built from the
 * subscriber's stable `unsubscribe_token` (CAN-SPAM compliance).
 */

import type { Special } from "./specials";
import { activeSpecials, discountPct } from "./specials";

const BRAND = {
  name: "Kynda Coffee",
  tagline: "Kindling something good in Horseshoe Bay, TX",
  site: "https://kyndacoffee.com",
  charcoal: "#2b2b2b",
  rust: "#b5572f",
  cream: "#f6f1e7",
  mocha: "#6f6257",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(cents: number | null | undefined): string | null {
  return cents == null ? null : `$${(cents / 100).toFixed(2)}`;
}

/** A subject + preheader derived from the live specials (or a sensible default). */
export function newsletterSubject(specials: Special[], nowMs = Date.now()): { subject: string; preheader: string } {
  const live = activeSpecials(specials, nowMs);
  const monthName = new Date(nowMs).toLocaleString("en-US", { month: "long" });
  if (live.length === 0) {
    return {
      subject: `What's brewing at ${BRAND.name} this ${monthName}`,
      preheader: "Fresh roasts, warm mornings, and a seat saved for you.",
    };
  }
  const headliner = live[0];
  const deal = discountPct(headliner);
  const subject = deal
    ? `${headliner.title} — ${deal}% off this ${monthName} ☕`
    : `New this ${monthName}: ${headliner.title} ☕`;
  const others = live.length - 1;
  const preheader =
    others > 0
      ? `${headliner.subtitle || "Our newest special"} — plus ${others} more reason${others > 1 ? "s" : ""} to stop by.`
      : headliner.subtitle || "Our newest special, made with care.";
  return { subject, preheader };
}

function renderSpecialCard(s: Special): string {
  const price = money(s.price_cents);
  const compare = money(s.compare_at_cents);
  const badge = s.badge ? `<span style="background:${BRAND.rust};color:#fff;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600">${esc(s.badge)}</span>` : "";
  const img = s.image_url
    ? `<img src="${esc(s.image_url)}" alt="${esc(s.title)}" width="540" style="width:100%;max-width:540px;border-radius:12px;display:block;margin-bottom:12px" />`
    : "";
  const priceLine = price
    ? `<p style="margin:6px 0;color:${BRAND.charcoal};font-size:16px"><strong>${price}</strong>${compare ? ` <span style="color:${BRAND.mocha};text-decoration:line-through;font-size:14px">${compare}</span>` : ""}</p>`
    : "";
  const desc = s.description ? `<p style="margin:6px 0;color:${BRAND.mocha};font-size:15px;line-height:1.5">${esc(s.description)}</p>` : "";
  const cta = s.cta_label || "Order now";
  return `
    <div style="margin:0 0 28px">
      ${img}
      <div style="margin-bottom:6px">${badge}</div>
      <h2 style="margin:4px 0;color:${BRAND.charcoal};font-size:20px">${esc(s.title)}</h2>
      ${s.subtitle ? `<p style="margin:2px 0;color:${BRAND.rust};font-size:15px;font-weight:600">${esc(s.subtitle)}</p>` : ""}
      ${priceLine}
      ${desc}
      <a href="${BRAND.site}/menu" style="display:inline-block;margin-top:8px;background:${BRAND.charcoal};color:#fff;text-decoration:none;border-radius:8px;padding:10px 18px;font-size:15px">${esc(cta)}</a>
    </div>`;
}

export interface NewsletterContent {
  subject: string;
  preheader: string;
  bodyHtml: string;
}

/**
 * Build the full newsletter content from specials. `unsubscribeUrlTemplate` must
 * contain the literal token `{{UNSUBSCRIBE_URL}}` which the send step replaces
 * per-recipient; we keep it as a placeholder so the stored body is recipient-agnostic.
 */
export function buildNewsletter(
  specials: Special[],
  opts: { nowMs?: number; intro?: string } = {}
): NewsletterContent {
  const nowMs = opts.nowMs ?? Date.now();
  const live = activeSpecials(specials, nowMs);
  const { subject, preheader } = newsletterSubject(specials, nowMs);

  const intro =
    opts.intro ||
    (live.length > 0
      ? "Here's what's fresh on the bar this month. Come let us kindle your morning."
      : "We're roasting, baking, and saving you a seat. Here's a little hello from the shop.");

  const cards = live.length > 0 ? live.map(renderSpecialCard).join("\n") : "";

  const bodyHtml = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BRAND.cream};font-family:Georgia,'Times New Roman',serif">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:24px 0">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
          <tr><td style="background:${BRAND.charcoal};padding:28px 32px;text-align:center">
            <h1 style="margin:0;color:${BRAND.cream};font-size:26px;letter-spacing:1px">${BRAND.name}</h1>
            <p style="margin:6px 0 0;color:#c9b8a3;font-size:14px">${BRAND.tagline}</p>
          </td></tr>
          <tr><td style="padding:32px">
            <p style="margin:0 0 22px;color:${BRAND.mocha};font-size:16px;line-height:1.6">${esc(intro)}</p>
            ${cards}
            <hr style="border:none;border-top:1px solid #e7ddcd;margin:24px 0" />
            <p style="text-align:center;margin:0 0 4px">
              <a href="${BRAND.site}/menu" style="color:${BRAND.rust};font-weight:600;text-decoration:none">See the full menu →</a>
            </p>
          </td></tr>
          <tr><td style="background:${BRAND.cream};padding:20px 32px;text-align:center">
            <p style="margin:0;color:${BRAND.mocha};font-size:12px;line-height:1.5">
              ${BRAND.name} · 4315 FM 2147, Horseshoe Bay, TX 78657<br/>
              You're receiving this because you subscribed at kyndacoffee.com.<br/>
              <a href="{{UNSUBSCRIBE_URL}}" style="color:${BRAND.mocha};text-decoration:underline">Unsubscribe</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, preheader, bodyHtml };
}

/** Replace the per-recipient unsubscribe placeholder in a stored body. */
export function personalizeUnsubscribe(bodyHtml: string, unsubscribeUrl: string): string {
  return bodyHtml.split("{{UNSUBSCRIBE_URL}}").join(unsubscribeUrl);
}
