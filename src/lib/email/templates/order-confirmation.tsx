export function orderConfirmationHtml(data: any) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
      <h1 style="color: #286849;">Thank you for your order!</h1>
      
      <p>Hi ${data.name || "Friend"},</p>
      <p>We've received your order <strong>#${data.orderNumber}</strong>.</p>
      
      <div style="margin: 20px 0; padding: 16px; background: #E8F5EE; border-radius: 8px;">
        ${data.items?.map((item: any) => `
          <p style="margin: 4px 0;">${item.quantity}× ${item.name} – $${((item.price || 0) / 100).toFixed(2)}</p>
        `).join("")}
        
        <p style="margin-top: 12px; font-weight: 600; border-top: 1px solid #B7D4C8; padding-top: 8px;">
          Total: $${(data.total || 0) / 100}
        </p>
      </div>
      
      <p>We'll send tracking info once your order ships.</p>
      <p>— The Kynda Team</p>
    </div>
  `;
}
