import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "push-subscribe", windowMs: 60_000, maxRequests: 10 });
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { subscription } = await req.json();
    if (!subscription?.endpoint || typeof subscription.endpoint !== "string") {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Derive user_id strictly from authenticated session (never trust body.user_id)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Upsert push subscription
    const { error } = await supabaseAdmin()
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          user_id: user?.id ?? null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("Push subscription error:", error);
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
