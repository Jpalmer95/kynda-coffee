/**
 * Newsletter sender (Roadmap V2 — Epic 5).
 *
 * DB + Resend glue used by the send cron. Pure copy generation lives in
 * ./newsletter; this file just (a) finds approved newsletters due to send,
 * (b) loads subscribed recipients, (c) personalizes the unsubscribe link per
 * recipient, (d) sends via Resend, (e) records results on the row.
 *
 * Sends are gated: only rows already in status 'approved' are ever sent, and we
 * flip to 'sending' first so a concurrent run can't double-send.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resend } from "@/lib/email/client";
import { personalizeUnsubscribe } from "./newsletter";

const FROM = process.env.NEWSLETTER_FROM || "Kynda Coffee <hello@kyndacoffee.com>";
const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://kyndacoffee.com";

export interface SendResult {
  newsletterId: string;
  recipients: number;
  sent: number;
  failed: number;
  status: "sent" | "failed" | "skipped";
  error?: string;
}

interface Subscriber {
  email: string;
  unsubscribe_token: string;
}

function unsubscribeUrl(token: string): string {
  return `${SITE}/api/newsletter/unsubscribe?t=${encodeURIComponent(token)}`;
}

/** Send one approved newsletter now. Returns a result summary. */
export async function sendNewsletter(newsletterId: string): Promise<SendResult> {
  const supabase = getSupabaseAdmin();

  // Atomically claim the row: only proceed if it is currently 'approved'.
  const { data: claimed, error: claimErr } = await supabase
    .from("newsletters")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", newsletterId)
    .eq("status", "approved")
    .select("id, subject, body_html")
    .single();

  if (claimErr || !claimed) {
    return { newsletterId, recipients: 0, sent: 0, failed: 0, status: "skipped", error: "Not in approved state" };
  }

  // Load active subscribers.
  const { data: subs, error: subErr } = await supabase
    .from("newsletter_subscribers")
    .select("email, unsubscribe_token")
    .eq("subscribed", true);

  if (subErr) {
    await supabase.from("newsletters").update({ status: "failed", error_message: subErr.message, updated_at: new Date().toISOString() }).eq("id", newsletterId);
    return { newsletterId, recipients: 0, sent: 0, failed: 0, status: "failed", error: subErr.message };
  }

  const recipients = (subs ?? []) as Subscriber[];
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const html = personalizeUnsubscribe(claimed.body_html as string, unsubscribeUrl(r.unsubscribe_token));
    try {
      const res = await resend.emails.send({
        from: FROM,
        to: r.email,
        subject: claimed.subject as string,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl(r.unsubscribe_token)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      // resend returns { data, error }
      if ((res as { error?: unknown }).error) failed++;
      else sent++;
    } catch {
      failed++;
    }
  }

  const finalStatus = failed > 0 && sent === 0 ? "failed" : "sent";
  await supabase
    .from("newsletters")
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      recipients_count: recipients.length,
      sent_count: sent,
      failed_count: failed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", newsletterId);

  return { newsletterId, recipients: recipients.length, sent, failed, status: finalStatus };
}

/**
 * Send all approved newsletters whose scheduled_at is null or in the past.
 * Driven by the send cron.
 */
export async function sendDueNewsletters(nowIso = new Date().toISOString()): Promise<SendResult[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("newsletters")
    .select("id, scheduled_at")
    .eq("status", "approved");

  if (error || !data) return [];

  const due = data.filter((n) => !n.scheduled_at || (n.scheduled_at as string) <= nowIso);
  const results: SendResult[] = [];
  for (const n of due) {
    results.push(await sendNewsletter(n.id as string));
  }
  return results;
}
