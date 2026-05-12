export function welcomeEmailHtml(data: any) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
      <h1 style="color: #286849;">Welcome to the Kynda family!</h1>
      
      <p>Hi ${data.name || "Friend"},</p>
      
      <p>We're excited to have you with us. Here's your welcome gift:</p>
      
      <div style="margin: 20px 0; padding: 16px; background: #E8F5EE; border-radius: 8px; font-size: 18px; font-weight: 600;">
        Use code <span style="color: #286849;">KYNDA10</span> for 10% off your first order
      </div>
      
      <p>We'll keep you updated on new roast releases, exclusive merch drops, and seasonal specials.</p>
      
      <p>With appreciation,<br>— The Kynda Team</p>
    </div>
  `;
}