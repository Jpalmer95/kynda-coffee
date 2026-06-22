import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildNewsletter } from "@/lib/marketing/newsletter";
import { sendNewsletter } from "@/lib/marketing/newsletter-sender";
import type { Special } from "@/lib/marketing/specials";

export const dynamic = "force-dynamic";

const SELECT =
  "id, subject, preheader, body_html, status, source, segment, special_id, scheduled_at, approved_at, rejection_reason, sent_at, recipients_count, sent_count, failed_count, created_at, updated_at";

/** GET — list newsletters (newest first). */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("newsletters")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Subscriber count for the compose UI.
  const { count } = await getSupabaseAdmin()
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .eq("subscribed", true);

  return NextResponse.json({ newsletters: data ?? [], subscriberCount: count ?? 0 });
}

/**
 * POST — actions:
 *  - { action: "generate" }              build a draft from current specials
 *  - { action: "save", ... }             create/update a draft (id optional)
 *  - { action: "approve", id, scheduled_at? }
 *  - { action: "reject", id, reason? }
 *  - { action: "send", id }              send an approved newsletter now
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = body.action;

  try {
    if (action === "generate") {
      const { data: specials } = await supabase
        .from("specials")
        .select(
          "id, title, subtitle, description, provider_item_id, provider_variation_id, image_url, price_cents, compare_at_cents, badge, cta_label, starts_at, ends_at, is_active, sort_order, marketing_generated"
        )
        .eq("is_active", true);
      const built = buildNewsletter((specials ?? []) as Special[], {
        intro: typeof body.intro === "string" ? body.intro : undefined,
      });
      return NextResponse.json({ draft: built });
    }

    if (action === "save") {
      const subject = typeof body.subject === "string" ? body.subject.trim() : "";
      const body_html = typeof body.body_html === "string" ? body.body_html : "";
      if (!subject || !body_html) {
        return NextResponse.json({ error: "subject and body_html are required" }, { status: 400 });
      }
      const row: Record<string, unknown> = {
        subject,
        preheader: typeof body.preheader === "string" ? body.preheader : null,
        body_html,
        segment: typeof body.segment === "string" ? body.segment : "all",
        special_id: typeof body.special_id === "string" ? body.special_id : null,
        source: typeof body.source === "string" ? body.source : "manual",
        updated_at: new Date().toISOString(),
      };
      const id = typeof body.id === "string" ? body.id : null;
      if (id) {
        const { data, error } = await supabase.from("newsletters").update(row).eq("id", id).select(SELECT).single();
        if (error) throw error;
        return NextResponse.json({ newsletter: data });
      }
      row.created_by = team.user.id;
      row.status = "draft";
      const { data, error } = await supabase.from("newsletters").insert(row).select(SELECT).single();
      if (error) throw error;
      return NextResponse.json({ newsletter: data });
    }

    if (action === "approve") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const { data, error } = await supabase
        .from("newsletters")
        .update({
          status: "approved",
          scheduled_at: typeof body.scheduled_at === "string" ? body.scheduled_at : null,
          approved_by: team.user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .in("status", ["draft", "pending_approval", "rejected"])
        .select(SELECT)
        .single();
      if (error) throw error;
      return NextResponse.json({ newsletter: data });
    }

    if (action === "reject") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const { data, error } = await supabase
        .from("newsletters")
        .update({
          status: "rejected",
          rejection_reason: typeof body.reason === "string" ? body.reason : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(SELECT)
        .single();
      if (error) throw error;
      return NextResponse.json({ newsletter: data });
    }

    if (action === "send") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const result = await sendNewsletter(id);
      if (result.status === "skipped") {
        return NextResponse.json({ error: result.error || "Newsletter must be approved before sending" }, { status: 400 });
      }
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: "Request failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 400 }
    );
  }
}

/** DELETE — remove a newsletter draft by ?id=. */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("newsletters").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
