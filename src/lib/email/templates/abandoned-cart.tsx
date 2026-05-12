export function abandonedCartTemplate(data: any) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #3C2F2F;">
      <h1 style="color: #8B5E3C;">You left something behind ☕</h1>
      
      <p>Hi there,</p>
      <p>Your cart is still waiting for you at Kynda Coffee.</p>
      
      <div style="margin: 20px 0; padding: 16px; background: #f8f1e9; border-radius: 8px;">
        ${data.items?.map((item: any) => `
          <p style="margin: 4px 0;">${item.quantity || 1}× <strong>${item.name}</strong> — $${((item.price || 0) / 100).toFixed(2)}</p>
        `).join("") || ""}
      </div>
      
      <a href="${data.cartUrl || "https://kyndacoffee.com/cart"}" 
         style="display: inline-block; background: #8B5E3C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: 600;">
        Complete your order
      </a>
      
      <p style="margin-top: 24px; font-size: 13px; color: #6B5C4A;">
        This offer expires soon. Hurry back before your favorites sell out!
      </p>
      
      <p>— The Kynda Team</p>
    </div>
  `;
}
