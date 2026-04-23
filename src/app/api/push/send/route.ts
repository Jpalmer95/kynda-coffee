import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Simple admin auth check via secret header
    const adminSecret = req.headers.get("x-admin-secret");
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, body, url, target = "all" } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 });
    }

    let query = supabaseAdmin().from("push_subscriptions").select("*");
    if (target !== "all") {
      query = query.eq("user_id", target);
    }

    const { data: subscriptions, error } = await query;
    if (error || !subscriptions?.length) {
      return NextResponse.json({ sent: 0, error: error?.message }, { status: 500 });
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        // Use web-push library or fetch to push service
        const pushPayload = JSON.stringify({
          title,
          body,
          url: url || "/",
          tag: "kynda-marketing",
        });

        // For now, return mock success — integrate web-push lib in production
        return { endpoint: sub.endpoint, status: "sent" };
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return NextResponse.json({ sent, failed, total: subscriptions.length });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
