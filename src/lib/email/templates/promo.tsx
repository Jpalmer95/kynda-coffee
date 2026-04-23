interface PromoEmailProps {
  headline: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
  discountCode?: string;
  discountValue?: string;
  imageUrl?: string;
}

export function promoEmailHtml({
  headline,
  bodyText,
  ctaText,
  ctaUrl,
  discountCode,
  discountValue,
  imageUrl,
}: PromoEmailProps): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    body { margin: 0; padding: 0; background: #faf7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2c1810; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #2c1810; padding: 40px 30px; text-align: center; }
    .header h1 { color: #faf7f2; margin: 0; font-size: 26px; }
    .hero { width: 100%; max-height: 300px; object-fit: cover; display: block; }
    .content { padding: 40px 30px; text-align: center; }
    .content h2 { font-size: 24px; margin: 0 0 16px; }
    .content p { font-size: 16px; line-height: 1.6; color: #5c3d2e; margin: 0 0 24px; }
    .code-box { background: #faf7f2; border: 2px dashed #c4724e; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .code-box .code { font-size: 28px; font-weight: 700; font-family: monospace; color: #2c1810; }
    .code-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8b6f4e; margin-bottom: 8px; }
    .cta { display: inline-block; background: #c4724e; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 999px; font-weight: 600; font-size: 16px; }
    .footer { padding: 30px; text-align: center; border-top: 1px solid #ede4d5; }
    .footer p { font-size: 13px; color: #8b6f4e; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Kynda Coffee</h1>
    </div>
    ${imageUrl ? `<img src="${imageUrl}" alt="" class="hero" />` : ""}
    <div class="content">
      <h2>${headline}</h2>
      <p>${bodyText}</p>
      ${discountCode ? `
      <div class="code-box">
        <div class="label">${discountValue || "Use code"}</div>
        <div class="code">${discountCode}</div>
      </div>
      ` : ""}
      <a href="${ctaUrl}" class="cta">${ctaText}</a>
    </div>
    <div class="footer">
      <p>Horseshoe Bay, TX</p>
      <p><a href="https://kyndacoffee.com/unsubscribe" style="color: #8b6f4e;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}
