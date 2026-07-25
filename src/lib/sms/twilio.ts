import twilio from "twilio";
import { orderStatusSms } from "./templates";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const msgServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || !from) return null;
  return {
    client: twilio(sid, token),
    from,
    // When a Messaging Service SID (MG...) is set, Twilio routes through the
    // A2P 10DLC campaign automatically — prefer it over the bare number.
    sender: msgServiceSid || from,
  };
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
    console.warn("[sms] Twilio not configured — skipping SMS");
    return { ok: false as const, reason: "not-configured" };
  }
  try {
    const msg = await cfg.client.messages.create({
      from: cfg.sender,
      to,
      body,
    });
    console.log(`[sms] Twilio sent sid=${msg.sid} to=${to}`);
    return { ok: true as const, sid: msg.sid };
  } catch (err: any) {
    console.error("[sms] Twilio send failed:", err?.message || err);
    return { ok: false as const, reason: "twilio-error", error: err };
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
  // Templates live in ./templates — the canonical source of campaign-approved
  // wording (see that file's header before editing message text).
  const body = orderStatusSms(orderNumber, status);
  await sendSms({ to, body });
}
