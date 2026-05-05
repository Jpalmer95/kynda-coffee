import { Resend } from "resend";

type RetentionTemplate = "win-back" | "abandoned-cart" | "birthday";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendOrderConfirmation({
  to,
  orderNumber,
  items,
  total,
  shippingAddress,
}: {
  to: string;
  orderNumber: string;
  items: { product_name: string; quantity: number; total_cents: number }[];
  total: number;
  shippingAddress?: any;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }

  const itemRows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e0d8;">${item.product_name} × ${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e0d8;text-align:right;">$${(item.total_cents / 100).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const addressBlock = shippingAddress
    ? `<p style="margin:4px 0 0;color:#5a4d3b;">
        ${shippingAddress.line1}${shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""}<br/>
        ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}
       </p>`
    : "";

  try {
    await resend.emails.send({
      from: "Kynda Coffee <orders@kyndacoffee.com>",
      to,
      subject: `Order confirmed — ${orderNumber}`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin:0;padding:0;background:#f6f2ec;font-family:Georgia,serif;color:#2a1e14; }
    .wrap { max-width:520px;margin:0 auto;padding:24px 16px; }
    .card { background:#fff;border-radius:16px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.04); }
    h1 { font-size:22px;margin:0 0 8px; }
    .muted { color:#7a6e5e;font-size:13px; }
    .btn { display:inline-block;padding:12px 20px;background:#b85c38;color:#fff;text-decoration:none;border-radius:10px;font-weight:600; }
    table { width:100%;border-collapse:collapse;font-size:14px; }
    .total { font-size:16px;font-weight:700;border-top:2px solid #2a1e14; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Thank you for your order!</h1>
      <p class="muted">Order ${orderNumber}</p>
      <p style="margin-top:16px;">We received your order and are roasting your beans now. You'll get a shipping notification once it leaves our roastery.</p>
      <table style="margin-top:20px;">
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr class="total">
            <td style="padding-top:12px;">Total</td>
            <td style="padding-top:12px;text-align:right;">$${(total / 100).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      ${addressBlock}
      <div style="margin-top:24px;text-align:center;">
        <a href="https://kyndacoffee.com/track-order" class="btn">Track Your Order</a>
      </div>
      <p style="margin-top:20px;font-size:12px;color:#9a8e7e;text-align:center;">
        Questions? Reply to this email or visit <a href="https://kyndacoffee.com/help" style="color:#b85c38;">Help Center</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("Failed to send order confirmation:", err);
  }
}

export async function sendShippingNotification({
  to,
  orderNumber,
  trackingUrl,
}: {
  to: string;
  orderNumber: string;
  trackingUrl?: string;
}) {
  const resend = getResend();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: "Kynda Coffee <orders@kyndacoffee.com>",
      to,
      subject: `Your order is on the way — ${orderNumber}`,
      html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f2ec;font-family:Georgia,serif;color:#2a1e14;">
<div style="max-width:520px;margin:0 auto;padding:24px 16px;">
<div style="background:#fff;border-radius:16px;padding:28px;">
  <h1 style="font-size:22px;margin:0 0 8px;">Your order is on the way!</h1>
  <p style="color:#7a6e5e;font-size:13px;">Order ${orderNumber}</p>
  <p style="margin-top:16px;">Your coffee has shipped and is heading your way. Freshness guaranteed.</p>
  ${trackingUrl ? `<div style="margin-top:24px;text-align:center;"><a href="${trackingUrl}" style="display:inline-block;padding:12px 20px;background:#b85c38;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Track Shipment</a></div>` : ""}
</div></div></body></html>`,
    });
  } catch (err) {
    console.error("Failed to send shipping notification:", err);
  }
}

export async function sendRetentionEmail({
  to,
  template,
  variables = {},
}: {
  to: string;
  template: RetentionTemplate;
  variables?: Record<string, string>;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping retention email");
    return;
  }

  const name = variables.name || "Friend";
  const days = variables.days || "30";
  const templateConfig: Record<RetentionTemplate, { subject: string; heading: string; body: string; cta: string }> = {
    "win-back": {
      subject: "We saved you a fresh cup at Kynda",
      heading: `We miss you, ${name}`,
      body: `It has been about ${days} days since your last visit. Come back for organic specialty coffee, scratch kitchen favorites, and new seasonal drinks.`,
      cta: "Order Ahead",
    },
    "abandoned-cart": {
      subject: "Still thinking it over? Your Kynda cart is waiting",
      heading: "Your cart is still here",
      body: "Finish your order whenever you are ready. Fresh coffee is worth coming back for.",
      cta: "Return to Cart",
    },
    birthday: {
      subject: "Happy birthday from Kynda Coffee",
      heading: `Happy birthday, ${name}`,
      body: "We hope your day is full of good people, good food, and great coffee.",
      cta: "Visit Kynda",
    },
  };

  const config = templateConfig[template];

  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL || "Kynda Coffee <orders@kyndacoffee.com>",
      to,
      subject: config.subject,
      html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f2ec;font-family:Georgia,serif;color:#2a1e14;">
<div style="max-width:520px;margin:0 auto;padding:24px 16px;">
<div style="background:#fff;border-radius:16px;padding:28px;">
  <h1 style="font-size:22px;margin:0 0 8px;">${config.heading}</h1>
  <p style="margin-top:16px;line-height:1.55;">${config.body}</p>
  <div style="margin-top:24px;text-align:center;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://kynda.167.99.125.127.sslip.io"}/shop" style="display:inline-block;padding:12px 20px;background:#b85c38;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">${config.cta}</a>
  </div>
</div></div></body></html>`,
    });
  } catch (err) {
    console.error("Failed to send retention email:", err);
  }
}
