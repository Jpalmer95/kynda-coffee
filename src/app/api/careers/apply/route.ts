import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";

const MAX = 5; // max applications per IP per 15 minutes
const WINDOW_MS = 15 * 60 * 1000;

function ownerInbox(): string[] {
  const raw = [
    ...(process.env.ADMIN_EMAILS?.split(",") ?? []),
    ...(process.env.ADMIN_EMAIL?.split(",") ?? []),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (raw.length) return Array.from(new Set(raw));
  const from = process.env.FROM_EMAIL;
  return from ? [from] : [];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`career-apply:${ip}`, MAX, WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many applications. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { opening_id, opening_title, name, email, phone, cover_letter } = body;

    if (!name || !email || !opening_title) {
      return NextResponse.json(
        { error: "Name, email, and position are required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("job_applications").insert({
      opening_id: opening_id || null,
      opening_title,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      cover_letter: cover_letter?.trim() || null,
      status: "new",
    });

    if (error) {
      console.error("[careers/apply] Supabase insert error:", error);
      return NextResponse.json(
        { error: "Could not save your application. Please email hello@kyndacoffee.com directly." },
        { status: 500 }
      );
    }

    // Best-effort owner notification — never block the applicant on email delivery.
    const inbox = ownerInbox();
    if (inbox.length) {
      const html = `
        <div style="font-family:Georgia,serif;color:#2b2b2b">
          <h2 style="color:#b5572f">New job application — ${escapeHtml(opening_title)}</h2>
          <p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;${phone ? ` • ${escapeHtml(phone)}` : ""}</p>
          ${cover_letter ? `<p style="white-space:pre-wrap;border-left:3px solid #e7ddcd;padding-left:12px">${escapeHtml(cover_letter)}</p>` : ""}
          <p style="color:#6f6257;font-size:13px">Review at kyndacoffee.com/admin/careers.</p>
        </div>`;
      sendEmail({
        to: inbox,
        subject: `New application: ${opening_title} — ${name}`,
        html,
      }).catch((e) => console.error("Application notification email failed:", e));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
