import { formatPrice } from "@/lib/utils";

interface WelcomeEmailProps {
  name: string;
  discountCode?: string;
}

export function welcomeEmailHtml({ name, discountCode }: WelcomeEmailProps): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Kynda Coffee</title>
  <style>
    body { margin: 0; padding: 0; background: #faf7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2c1810; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #2c1810; padding: 40px 30px; text-align: center; }
    .header h1 { color: #faf7f2; margin: 0; font-size: 28px; font-weight: 700; }
    .header p { color: #c4a882; margin: 8px 0 0; font-size: 16px; }
    .content { padding: 40px 30px; }
    .content h2 { font-size: 22px; margin: 0 0 16px; }
    .content p { font-size: 16px; line-height: 1.6; color: #5c3d2e; margin: 0 0 16px; }
    .cta { display: inline-block; background: #c4724e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: 600; margin: 8px 0 24px; }
    .code-box { background: #faf7f2; border: 2px dashed #c4724e; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8b6f4e; margin-bottom: 8px; }
    .code-box .code { font-size: 24px; font-weight: 700; color: #2c1810; font-family: monospace; }
    .footer { padding: 30px; text-align: center; border-top: 1px solid #ede4d5; }
    .footer p { font-size: 13px; color: #8b6f4e; margin: 4px 0; }
    .social { margin: 16px 0; }
    .social a { display: inline-block; margin: 0 8px; color: #c4724e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Kynda</h1>
      <p>Hand-selected organic coffee from the Texas Hill Country</p>
    </div>
    <div class="content">
      <h2>Hi ${name || "there"},</h2>
      <p>Thanks for joining the Kynda Coffee family. You now have access to exclusive roasts, member-only perks, and our Coffee Club subscription.</p>
      ${discountCode ? `
      <div class="code-box">
        <div class="label">Your Welcome Gift</div>
        <div class="code">${discountCode}</div>
        <p style="margin: 8px 0 0; font-size: 14px; color: #8b6f4e;">Use at checkout for 15% off your first order</p>
      </div>
      ` : ""}
      <a href="https://kyndacoffee.com/shop" class="cta">Shop Coffee</a>
      <p style="font-size: 14px; color: #8b6f4e;">Follow us for brewing tips, new arrivals, and behind-the-scenes looks at our roasting process.</p>
    </div>
    <div class="footer">
      <p>Horseshoe Bay, TX</p>
      <p><a href="https://kyndacoffee.com/unsubscribe" style="color: #8b6f4e;">Unsubscribe</a> · <a href="https://kyndacoffee.com/privacy" style="color: #8b6f4e;">Privacy</a></p>
    </div>
  </div>
</body>
</html>`;
}
