// Resend email client for transactional & marketing emails
// Docs: https://resend.com/docs

import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Kynda Coffee <hello@kyndacoffee.com>";

/** Send order confirmation email */
export async function sendOrderConfirmation(params: {
  to: string;
  orderNumber: string;
  items: { name: string; quantity: number; price: string }[];
  total: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Order Confirmed — ${params.orderNumber}`,
    html: `
      <h1>Thank you for your order!</h1>
      <p>Order #${params.orderNumber}</p>
      <ul>
        ${params.items.map((i) => `<li>${i.quantity}x ${i.name} — ${i.price}</li>`).join("")}
      </ul>
      <p><strong>Total: ${params.total}</strong></p>
      <p>We'll send tracking info once your order ships.</p>
      <p>— The Kynda Team</p>
    `,
  });
}

/** Send welcome email (first newsletter signup) */
export async function sendWelcomeEmail(to: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Kynda Coffee Mail ☕",
    html: `
      <h1>Welcome to the Kynda family!</h1>
      <p>Here's your 10% off code for your first order: <strong>KYNDA10</strong></p>
      <p>We'll share exclusive deals, new roast releases, and merch drops.</p>
      <p>— The Kynda Team</p>
    `,
  });
}

/** Send shipping notification */
export async function sendShippingNotification(params: {
  to: string;
  orderNumber: string;
  trackingUrl: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Your Kynda order is on its way! — ${params.orderNumber}`,
    html: `
      <h1>Your order has shipped!</h1>
      <p>Order #${params.orderNumber}</p>
      <p><a href="${params.trackingUrl}">Track your package</a></p>
      <p>— The Kynda Team</p>
    `,
  });
}

/** Send abandoned cart reminder */
export async function sendAbandonedCartEmail(params: {
  to: string;
  items: { name: string; price: string }[];
  cartUrl: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: "You left something behind ☕",
    html: `
      <h1>Still thinking it over?</h1>
      <p>Your cart is waiting:</p>
      <ul>
        ${params.items.map((i) => `<li>${i.name} — ${i.price}</li>`).join("")}
      </ul>
      <p><a href="${params.cartUrl}">Complete your order</a></p>
      <p>— The Kynda Team</p>
    `,
  });
}
