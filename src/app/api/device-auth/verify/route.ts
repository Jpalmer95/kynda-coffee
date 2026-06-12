import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

/**
 * POST /api/device-auth/verify — redeem an owner-approval code on the device.
 *
 * Body: { request_id, device_secret, code }
 *
 * On success returns a one-time Supabase token_hash; the device's browser
 * client calls auth.verifyOtp({ token_hash, type: 'email' }) to mint a real,
 * persistent session for the shared account — no email inbox needed on the
 * tablet, and the session refreshes itself like any normal login.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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

    if (row.device_secret !== deviceSecret) {
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

    if (row.approval_code !== code) {
      await admin
        .from("device_authorizations")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      const left = MAX_ATTEMPTS - row.attempts - 1;
      return NextResponse.json(
        { error: `Wrong code.${left > 0 ? ` ${left} attempt${left === 1 ? "" : "s"} left.` : ""}` },
        { status: 401 }
      );
    }

    // ── Code correct: consume it and mint a one-time login token ──
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: row.requested_email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[device-auth] generateLink error:", linkError);
      return NextResponse.json({ error: "Could not create session. Try again." }, { status: 500 });
    }

    await admin
      .from("device_authorizations")
      .update({
        status: "consumed",
        approved_at: new Date().toISOString(),
        approved_by: "owner-code",
      })
      .eq("id", row.id);

    return NextResponse.json({
      token_hash: linkData.properties.hashed_token,
      email: row.requested_email,
    });
  } catch (err) {
    console.error("[device-auth] verify error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
