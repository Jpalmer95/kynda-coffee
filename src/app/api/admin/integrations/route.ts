import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";

export const dynamic = "force-dynamic";

const ALLOWED_INTEGRATION_ENV_VARS = new Set([
  "STRIPE_SECRET_KEY",
  "TWILIO_ACCOUNT_SID",
  "RESEND_API_KEY",
  "SQUARE_APPLICATION_ID",
  "PRINTFUL_API_KEY",
]);

export async function GET(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const envVar = searchParams.get("env");

  if (!envVar || !ALLOWED_INTEGRATION_ENV_VARS.has(envVar)) {
    return NextResponse.json({ configured: false });
  }

  // Check if the environment variable is set and non-empty
  const value = process.env[envVar];
  const configured = !!value && value.length > 0 && !value.startsWith("your_");

  return NextResponse.json({ configured });
}
