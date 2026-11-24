import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { timingSafeStringEqual } from "@/lib/auth/security";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`device-verify:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const requestId = String(body.request_id ?? "");
    const deviceSecret = String(body.device_secret ?? "");
    const code = String(body.code ?? "").trim();

    if (!requestId || !deviceSecret || !code) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data: row, error } = await admin
      .from("device_authorizations")
      .select("id, requested_email, approval_code, device_secret, status, attempts, expires_at")
      .eq("id", requestId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    if (!timingSafeStringEqual(row.device_secret, deviceSecret)) {
      return NextResponse.json({ error: "Invalid device." }, { status: 403 });
    }

    if (row.status !== "pending") {
      return NextResponse.json({ error: "This request is no longer active. Start over." }, { status: 410 });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      await admin.from("device_authorizations").update({ status: "expired" }).eq("id", row.id);
      return NextResponse.json({ error: "Code expired. Start over." }, { status: 410 });
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await admin.from("device_authorizations").update({ status: "denied" }).eq("id", row.id);
      return NextResponse.json({ error: "Too many wrong codes. Start over." }, { status: 403 });
    }

    if (!timingSafeStringEqual(row.approval_code, code)) {
      const nextAttempts = row.attempts + 1;
      await admin
        .from("device_authorizations")
        .update({
          attempts: nextAttempts,
          ...(nextAttempts >= MAX_ATTEMPTS ? { status: "denied" } : {}),
        })
        .eq("id", row.id)
        .eq("status", "pending");
      const left = MAX_ATTEMPTS - nextAttempts;
      return NextResponse.json(
        { error: `Wrong code.${left > 0 ? ` ${left} attempt${left === 1 ? "" : "s"} left.` : ""}` },
        { status: 401 }
      );
    }

    // ── Atomically claim & consume the pending code BEFORE minting a session ──
    const { data: claimed } = await admin
      .from("device_authorizations")
      .update({
        status: "consumed",
        approved_at: new Date().toISOString(),
        approved_by: "owner-code",
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimed) {
      return NextResponse.json({ error: "This request was already used. Start over." }, { status: 410 });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: row.requested_email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[device-auth] generateLink error:", linkError);
      return NextResponse.json({ error: "Could not create session. Try again." }, { status: 500 });
    }

    return NextResponse.json({
      token_hash: linkData.properties.hashed_token,
      email: row.requested_email,
    });
  } catch (err) {
    console.error("[device-auth] verify error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
