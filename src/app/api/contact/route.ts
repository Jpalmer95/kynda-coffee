import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Owner notification address(es): ADMIN_EMAILS / ADMIN_EMAIL, else FROM_EMAIL. */
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

export async function POST(req: NextRequest) {
  // Rate limit: 5 submissions per IP per hour
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, remaining } = checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  try {
    const { name, email, message, type = "general" } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim();

    // Store in Supabase contact_submissions table
    const { error } = await supabaseAdmin().from("contact_submissions").insert({
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
      type,
      status: "new",
    });

    if (error) {
      console.error("Contact submission error:", error);
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 500 }
      );
    }

    // Best-effort owner notification — never block the customer on email delivery.
    const inbox = ownerInbox();
    if (inbox.length) {
      const html = `
        <div style="font-family:Georgia,serif;color:#2b2b2b">
          <h2 style="color:#b5572f">New ${escapeHtml(type)} message — Kynda Coffee</h2>
          <p><strong>From:</strong> ${escapeHtml(cleanName)} &lt;${escapeHtml(cleanEmail)}&gt;</p>
          <p style="white-space:pre-wrap;border-left:3px solid #e7ddcd;padding-left:12px">${escapeHtml(cleanMessage)}</p>
          <p style="color:#6f6257;font-size:13px">Reply directly to this email to respond, or manage it in the admin inbox at kyndacoffee.com/admin/inbox.</p>
        </div>`;
      sendEmail({
        to: inbox,
        subject: `New ${type} message from ${cleanName}`,
        html,
      }).catch((e) => console.error("Contact notification email failed:", e));
    }

    return NextResponse.json(
      { success: true, message: "Message sent successfully!" },
      { status: 201 }
    );
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
