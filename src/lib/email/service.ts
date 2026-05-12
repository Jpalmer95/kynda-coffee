import { resend } from "./client";
import { abandonedCartHtml } from "./templates/abandoned-cart";
import { welcomeEmailHtml } from "./templates/welcome";
import { orderConfirmationHtml } from "./templates/order-confirmation";
import { shippingNotificationHtml } from "./templates/shipping";

export type EmailTemplate =
  | "abandoned-cart"
  | "welcome"
  | "order-confirmation"
  | "shipping-notification"
  | "review-request"
  | "win-back";

interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  data?: any;
  subject?: string;
}

/**
 * Centralized email sender for Kynda Coffee.
 * All transactional and marketing emails should go through this helper.
 */
export async function sendEmail({ to, template, data = {}, subject }: SendEmailOptions) {
  let html: string;
  let finalSubject = subject;

  switch (template) {
    case "abandoned-cart":
      html = abandonedCartHtml(data);
      finalSubject = subject || "You left something in your cart ☕";
      break;
    case "welcome":
      html = welcomeEmailHtml(data);
      finalSubject = subject || "Welcome to the Kynda family!";
      break;
    case "order-confirmation":
      html = orderConfirmationHtml(data);
      finalSubject = subject || `Order Confirmed — #${data.orderNumber}`;
      break;
    case "shipping-notification":
      html = shippingNotificationHtml(data);
      finalSubject = subject || `Your order is on its way! — #${data.orderNumber}`;
      break;
    case "review-request":
      html = `<p>Hi ${data.name || "Friend"},</p>
              <p>Thanks for your recent order! Would you mind leaving a quick review?</p>
              <a href="${data.reviewUrl}">Leave a Review</a>`;
      finalSubject = subject || "How was your Kynda experience?";
      break;
    case "win-back":
      html = `<p>Hi ${data.name || "Friend"},</p>
              <p>We miss you! It's been ${data.days || 30} days since your last visit.</p>
              <p>Here's 15% off your next order: <strong>KYNDA15</strong></p>`;
      finalSubject = subject || "We miss you at Kynda ☕";
      break;
    default:
      throw new Error(`Unknown email template: ${template}`);
  }

  try {
    const result = await resend.emails.send({
      from: "Kynda Coffee <hello@kyndacoffee.com>",
      to,
      subject: finalSubject,
      html,
    });
    return { success: true, result };
  } catch (error) {
    console.error(`Email send failed (${template}):`, error);
    return { success: false, error };
  }
}
