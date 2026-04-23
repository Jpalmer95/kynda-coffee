import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return null;
  return { client: twilio(sid, token), from };
}

export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  const cfg = getClient();
  if (!cfg) {
    console.warn("Twilio not configured — skipping SMS");
    return;
  }
  try {
    await cfg.client.messages.create({
      from: cfg.from,
      to,
      body,
    });
  } catch (err) {
    console.error("Failed to send SMS:", err);
  }
}

export async function sendOrderStatusSms({
  to,
  orderNumber,
  status,
}: {
  to: string;
  orderNumber: string;
  status: string;
}) {
  const messages: Record<string, string> = {
    confirmed: `Kynda Coffee: Your order ${orderNumber} is confirmed! We're roasting your beans now. Track at kyndacoffee.com/track-order`,
    shipped: `Kynda Coffee: Great news! Your order ${orderNumber} has shipped. Track at kyndacoffee.com/track-order`,
    delivered: `Kynda Coffee: Your order ${orderNumber} has been delivered. Enjoy your coffee!`,
    refunded: `Kynda Coffee: Your order ${orderNumber} has been refunded. The funds will appear in 3-5 business days.`,
  };

  const body = messages[status] ?? `Kynda Coffee: Your order ${orderNumber} status is now: ${status}`;
  await sendSms({ to, body });
}
