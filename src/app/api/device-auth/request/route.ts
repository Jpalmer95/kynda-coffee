import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeRole, hasTier } from "@/lib/auth/roles";
import { sendSms } from "@/lib/sms/twilio";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const ADMIN_EMAILS = [
  ...(process.env.ADMIN_EMAILS?.split(",") ?? []),
  ...(process.env.ADMIN_EMAIL?.split(",") ?? []),
]
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function ownerInbox(): string[] {
  if (ADMIN_EMAILS.length) return ADMIN_EMAILS;
  const from = process.env.FROM_EMAIL;
  return from ? [from] : [];
}

/**
 * POST /api/device-auth/request — start a device sign-in for a shared café
 * tablet (KDS, orders screen).
 *
 * Body: { email, device_name }
 *
 * The email must belong to a whitelisted team account (staff tier or above in
 * profiles, or the env admin allowlist). A 6-digit approval code is sent to
 * the OWNER (SMS via OWNER_PHONE when configured, owner email otherwise) —
 * never to the requesting device — so the owner explicitly approves every
 * device. The device gets back a one-time secret it uses to redeem the code.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`device-auth:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many device requests. Please wait a few minutes." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const deviceName = String(body.device_name ?? "").trim().slice(0, 80);

    if (!email || !deviceName) {
      return NextResponse.json(
        { error: "Email and device name are required." },
        { status: 400 }
      );
    }

    // ── Whitelist check: env allowlist OR a staff+ profile ──
    let allowed = ADMIN_EMAILS.includes(email);
    if (!allowed) {
      const { data: profile } = await supabaseAdmin()
        .from("profiles")
        .select("role")
        .eq("email", email)
        .maybeSingle();
      const role = normalizeRole((profile as { role?: string } | null)?.role);
      allowed = hasTier(role, "staff");
    }

    if (!allowed) {
      // Same message as success would imply — don't leak which emails are whitelisted.
      return NextResponse.json(
        { error: "This account is not authorized for device sign-in. Ask the owner to add it under Admin → Team & Access." },
        { status: 403 }
      );
    }

    const approvalCode = crypto.randomInt(100000, 1000000).toString();
    const deviceSecret = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { data: row, error } = await supabaseAdmin()
      .from("device_authorizations")
      .insert({
        device_name: deviceName,
        requested_email: email,
        approval_code: approvalCode,
        device_secret: deviceSecret,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("[device-auth] insert error:", error);
      return NextResponse.json({ error: "Could not start device sign-in." }, { status: 500 });
    }

    // ── Notify the owner with the approval code ──
    const ownerPhone = process.env.OWNER_PHONE?.trim();
    const text = `Kynda device sign-in: "${deviceName}" wants to sign in as ${email}. Approval code: ${approvalCode} (expires in 10 min). Enter it on the device to approve.`;

    let channel: "sms" | "email" | "none" = "none";
    if (ownerPhone) {
      const smsResult = await sendSms({ to: ownerPhone, body: text });
      if (smsResult.ok) {
        channel = "sms";
      } else {
        console.warn(`[device-auth] SMS failed (${smsResult.reason}), trying email fallback`);
      }
    }

    if (channel === "none") {
      const inbox = ownerInbox();
      if (inbox.length) {
        await sendEmail({
          to: inbox,
          subject: `Device sign-in approval code: ${approvalCode}`,
          html: `<div style="font-family:Georgia,serif;color:#2b2b2b"><h2 style="color:#b5572f">Device sign-in request</h2><p><strong>${deviceName}</strong> wants to sign in as <strong>${email}</strong>.</p><p style="font-size:28px;letter-spacing:6px"><strong>${approvalCode}</strong></p><p>Enter this code on the device within 10 minutes to approve it. If you didn't expect this, ignore it.</p></div>`,
        });
        channel = "email";
      }
    }

    return NextResponse.json({
      request_id: row.id,
      device_secret: deviceSecret,
      expires_at: expiresAt,
      notified_via: channel,
    });
  } catch (err) {
    console.error("[device-auth] request error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
