import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const envVar = searchParams.get("env");

  if (!envVar) {
    return NextResponse.json({ configured: false });
  }

  // Check if the environment variable is set and non-empty
  const value = process.env[envVar];
  const configured = !!value && value.length > 0 && !value.startsWith("your_");

  return NextResponse.json({ configured });
}
