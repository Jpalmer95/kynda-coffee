import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

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
    const { name, email, event_date, guests, details } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin().from("catering_requests").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      event_date: event_date || null,
      guest_count: guests ? Number(guests) : null,
      details: details?.trim() || "",
      status: "new",
    });

    if (error) {
      console.error("Catering submission error:", error);
      return NextResponse.json(
        { error: "Failed to submit request. Please try again later." },
        { status: 500 }
      );
    }

    // Best-effort owner notification — never block the customer on email delivery.
    const inbox = ownerInbox();
    if (inbox.length) {
      const html = `
        <div style="font-family:Georgia,serif;color:#2b2b2b">
          <h2 style="color:#b5572f">New catering request — Kynda Coffee</h2>
          <p><strong>${escapeHtml(name.trim())}</strong> &lt;${escapeHtml(email.trim())}&gt;</p>
          <p>${event_date ? `Event date: ${escapeHtml(String(event_date))}<br/>` : ""}${guests ? `Guests: ${escapeHtml(String(guests))}` : ""}</p>
          ${details ? `<p style="white-space:pre-wrap;border-left:3px solid #e7ddcd;padding-left:12px">${escapeHtml(String(details))}</p>` : ""}
          <p style="color:#6f6257;font-size:13px">Manage it in the admin inbox at kyndacoffee.com/admin/inbox.</p>
        </div>`;
      sendEmail({
        to: inbox,
        subject: `New catering request from ${name.trim()}`,
        html,
      }).catch((e) => console.error("Catering notification email failed:", e));
    }

    return NextResponse.json(
      { success: true, message: "Catering request submitted! We'll be in touch soon." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Catering route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
