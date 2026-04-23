import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || "hello@kyndacoffee.com";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  if (!resendClient) {
    resendClient = new Resend(resendApiKey);
  }
  return resendClient;
}

export async function sendEmail({
  to,
  subject,
  html,
  tags,
}: {
  to: string | string[];
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
}) {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: `Kynda Coffee <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      tags,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: String(err) };
  }
}
