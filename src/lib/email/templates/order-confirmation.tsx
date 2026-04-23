interface OrderItem {
  name: string;
  quantity: number;
  price_cents: number;
}

interface OrderConfirmationProps {
  name: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  trackingUrl?: string;
}

export function orderConfirmationHtml({
  name,
  orderNumber,
  items,
  subtotal_cents,
  shipping_cents,
  total_cents,
  trackingUrl,
}: OrderConfirmationProps): string {
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #ede4d5;">
        <p style="margin: 0; font-weight: 600;">${item.name}</p>
        <p style="margin: 2px 0 0; font-size: 13px; color: #8b6f4e;">Qty: ${item.quantity}</p>
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #ede4d5; text-align: right; font-weight: 600;">
        ${fmt(item.price_cents * item.quantity)}
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation — Kynda Coffee</title>
  <style>
    body { margin: 0; padding: 0; background: #faf7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2c1810; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #2c1810; padding: 40px 30px; text-align: center; }
    .header h1 { color: #faf7f2; margin: 0; font-size: 24px; }
    .header p { color: #c4a882; margin: 8px 0 0; font-size: 14px; }
    .content { padding: 40px 30px; }
    .content h2 { font-size: 20px; margin: 0 0 12px; }
    .content p { font-size: 15px; line-height: 1.6; color: #5c3d2e; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .summary { background: #faf7f2; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 15px; }
    .summary-row.total { font-size: 18px; font-weight: 700; border-top: 2px solid #ede4d5; margin-top: 8px; padding-top: 12px; }
    .cta { display: inline-block; background: #c4724e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: 600; }
    .footer { padding: 30px; text-align: center; border-top: 1px solid #ede4d5; }
    .footer p { font-size: 13px; color: #8b6f4e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Your Order</h1>
      <p>Order #${orderNumber}</p>
    </div>
    <div class="content">
      <h2>Hi ${name || "there"},</h2>
      <p>We&apos;ve received your order and are already preparing it with care. Here&apos;s a summary:</p>
      <table>${itemsHtml}</table>
      <div class="summary">
        <div class="summary-row"><span>Subtotal</span><span>${fmt(subtotal_cents)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${shipping_cents === 0 ? "Free" : fmt(shipping_cents)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${fmt(total_cents)}</span></div>
      </div>
      ${trackingUrl ? `<a href="${trackingUrl}" class="cta">Track My Order</a>` : ""}
      <p style="margin-top: 24px; font-size: 14px; color: #8b6f4e;">Questions? Reply to this email or visit our <a href="https://kyndacoffee.com/help" style="color: #c4724e;">Help Center</a>.</p>
    </div>
    <div class="footer">
      <p>Kynda Coffee — Horseshoe Bay, TX</p>
      <p><a href="https://kyndacoffee.com/unsubscribe" style="color: #8b6f4e;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}
