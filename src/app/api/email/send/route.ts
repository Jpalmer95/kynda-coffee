import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "email-send", windowMs: 60_000, maxRequests: 5 });
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { to, subject, html, type } = await req.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject,
      html,
      tags: type ? [{ name: "type", value: type }] : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
