import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: profiles } = await supabaseAdmin()
      .from("profiles")
      .select("*");

    const rows = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? "",
      full_name: p.full_name ?? "",
      phone: p.phone ?? "",
      loyalty_points: p.loyalty_points ?? 0,
      role: p.role ?? "customer",
      created: p.created_at,
    }));

    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
