export function abandonedCartHtml(data: any) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
      <h1 style="color: #286849;">You left something behind ☕</h1>
      
      <p>Hi there,</p>
      <p>Your cart is still waiting for you at Kynda Coffee.</p>
      
      <div style="margin: 20px 0; padding: 16px; background: #E8F5EE; border-radius: 8px;">
        ${data.items?.map((item: any) => `
          <p style="margin: 4px 0;">${item.quantity || 1}× <strong>${item.name}</strong> — $${((item.price || 0) / 100).toFixed(2)}</p>
        `).join("") || ""}
      </div>
      
      <a href="${data.cartUrl || "https://kyndacoffee.com/shop/cart"}" 
         style="display: inline-block; background: #286849; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: 600;">
        Complete your order
      </a>
      
      <p style="margin-top: 24px; font-size: 13px; color: #5A5A5A;">
        This offer expires soon. Hurry back before your favorites sell out!
      </p>
      
      <p>— The Kynda Team</p>
    </div>
  `;
}