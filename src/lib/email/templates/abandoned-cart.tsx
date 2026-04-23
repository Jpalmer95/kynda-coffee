interface AbandonedCartItem {
  name: string;
  image?: string;
  price_cents: number;
  quantity: number;
}

interface AbandonedCartProps {
  name: string;
  items: AbandonedCartItem[];
  cartUrl: string;
  discountCode?: string;
}

export function abandonedCartHtml({ name, items, cartUrl, discountCode }: AbandonedCartProps): string {
  const totalCents = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
  const total = `$${(totalCents / 100).toFixed(2)}`;

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #ede4d5;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.image ? `<img src="${item.image}" alt="" style="width: 64px; height: 64px; border-radius: 8px; object-fit: cover;" />` : ""}
          <div>
            <p style="margin: 0; font-weight: 600; color: #2c1810;">${item.name}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #8b6f4e;">Qty: ${item.quantity}</p>
          </div>
        </div>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #ede4d5; text-align: right; font-weight: 600;">
        $${(item.price_cents / 100).toFixed(2)}
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You left something behind</title>
  <style>
    body { margin: 0; padding: 0; background: #faf7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2c1810; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #2c1810; padding: 40px 30px; text-align: center; }
    .header h1 { color: #faf7f2; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .content h2 { font-size: 20px; margin: 0 0 12px; }
    .content p { font-size: 16px; line-height: 1.6; color: #5c3d2e; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .cta { display: inline-block; background: #c4724e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: 600; }
    .code-box { background: #faf7f2; border: 2px dashed #c4724e; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }
    .code-box .code { font-size: 20px; font-weight: 700; font-family: monospace; }
    .footer { padding: 30px; text-align: center; border-top: 1px solid #ede4d5; }
    .footer p { font-size: 13px; color: #8b6f4e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your cart is waiting</h1>
    </div>
    <div class="content">
      <h2>Hi ${name || "there"},</h2>
      <p>You left some great coffee in your cart. Complete your order while supplies last.</p>
      <table>${itemsHtml}</table>
      <p style="text-align: right; font-size: 18px; font-weight: 700;">Total: ${total}</p>
      ${discountCode ? `
      <div class="code-box">
        <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; color: #8b6f4e;">Complete your order with</p>
        <div class="code">${discountCode}</div>
        <p style="margin: 4px 0 0; font-size: 14px; color: #8b6f4e;">Free shipping on us</p>
      </div>
      ` : ""}
      <a href="${cartUrl}" class="cta">Complete My Order</a>
    </div>
    <div class="footer">
      <p><a href="https://kyndacoffee.com/unsubscribe" style="color: #8b6f4e;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}
