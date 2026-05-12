export function welcomeEmailHtml(data: any) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #3C2F2F;">
      <h1 style="color: #8B5E3C;">Welcome to the Kynda family!</h1>
      
      <p>Hi ${data.name || "Friend"},</p>
      
      <p>We’re excited to have you with us. Here’s your welcome gift:</p>
      
      <div style="margin: 20px 0; padding: 16px; background: #f8f1e9; border-radius: 8px; font-size: 18px; font-weight: 600;">
        Use code <span style="color: #8B5E3C;">KYNDA10</span> for 10% off your first order
      </div>
      
      <p>We'll keep you updated on new roast releases, exclusive merch drops, and seasonal specials.</p>
      
      <p>With appreciation,<br>— The Kynda Team</p>
    </div>
  `;
}