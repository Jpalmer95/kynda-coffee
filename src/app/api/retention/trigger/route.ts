import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendRetentionEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { trigger } = await req.json();

    if (trigger === "abandoned-cart") {
      // Find carts abandoned > 1 hour (simplified — in production use a proper cart table)
      return NextResponse.json({ status: "ok", note: "Cart abandoned trigger fired" });
    }

    if (trigger === "win-back") {
      const { data: lapsed } = await supabaseAdmin()
        .from("customer_metrics")
        .select("profile_id, days_since_last_visit, lifetime_value_cents")
        .in("segment", ["lapsed", "at-risk"])
        .limit(50);

      if (!lapsed || lapsed.length === 0) {
        return NextResponse.json({ sent: 0 });
      }

      let sent = 0;
      for (const row of lapsed) {
        const { data: profile } = await supabaseAdmin()
          .from("profiles")
          .select("email, full_name")
          .eq("id", row.profile_id)
          .maybeSingle();

        if (!profile?.email) continue;

        // Check suppression / cooldown
        const { data: recent } = await supabaseAdmin()
          .from("customer_events")
          .select("id")
          .eq("profile_id", row.profile_id)
          .eq("trigger_name", "win-back")
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .limit(1);

        if (recent && recent.length > 0) continue;

        await sendRetentionEmail({
          to: profile.email,
          template: "win-back",
          variables: {
            name: profile.full_name || "Friend",
            days: String(row.days_since_last_visit || 30),
          },
        });

        await supabaseAdmin().from("customer_events").insert({
          profile_id: row.profile_id,
          email: profile.email,
          event_type: "email_sent",
          trigger_name: "win-back",
          status: "sent",
          sent_at: new Date().toISOString(),
        } as any);

        sent++;
      }
      return NextResponse.json({ sent });
    }

    if (trigger === "birthday") {
      // Placeholder: requires dob field on profiles
      return NextResponse.json({ sent: 0, note: "Birthday trigger requires dob field" });
    }

    return NextResponse.json({ error: "Unknown trigger" }, { status: 400 });
  } catch (err) {
    console.error("Retention trigger error:", err);
    return NextResponse.json({ error: "Trigger failed" }, { status: 500 });
  }
}
