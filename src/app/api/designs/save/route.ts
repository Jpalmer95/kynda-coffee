import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, prompt, image_url, product_type, style, is_public } = body;

  const { data, error } = await supabaseAdmin()
    .from("saved_designs")
    .insert({
      profile_id: user.id,
      name: name || "Untitled Design",
      prompt,
      image_url,
      product_type,
      style,
      is_public: !!is_public,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ design: data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profile_id");
  const publicOnly = searchParams.get("public") === "true";

  let query = supabaseAdmin().from("saved_designs").select("*, profiles(full_name)");

  if (profileId) {
    query = query.eq("profile_id", profileId);
  } else if (publicOnly) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ designs: data ?? [] });
}
