export function shippingNotificationHtml(data: any) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
      <h1 style="color: #286849;">Your order is on its way!</h1>
      
      <p>Hi ${data.name || "Friend"},</p>
      <p>Order <strong>#${data.orderNumber}</strong> has been shipped.</p>
      
      ${data.trackingUrl ? `
        <a href="${data.trackingUrl}" 
           style="display: inline-block; background: #286849; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: 600; margin: 16px 0;">
          Track your package
        </a>
      ` : ""}
      
      <p>Thank you for choosing Kynda Coffee.</p>
      <p>— The Kynda Team</p>
    </div>
  `;
}
