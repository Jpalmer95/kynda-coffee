import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireTier } from "@/lib/auth/team";
import { planMarketingLoop, type RecentPostRef } from "@/lib/marketing/loop";
import type { Special } from "@/lib/marketing/specials";
import { buildDraftText, type DropPlatform } from "@/lib/marketing/content-drop";
import { createOpenAICaptionFn } from "@/lib/marketing/caption/openai";
import { createSocialPost } from "@/lib/marketing/social/publisher";

export const dynamic = "force-dynamic";

/**
 * Weekly Marketing Loop cron (Roadmap V2 — Epic 5).
 *
 * Secured by EITHER:
 *   - CRON_SECRET bearer (Coolify/scheduler)
 *   - X-Agent-Key (Hermes cron)
 *   - Authenticated manager+ session (admin dashboard button)
 *
 * Each cycle:
 *  1. Load active specials + recent post history (for cooldown).
 *  2. planMarketingLoop() picks which specials to campaign and the angle.
 *  3. For each, build platform drafts (content-drop module, OpenAI captions w/
 *     brand fallback) and persist as pending_approval / source=agent.
 *  4. Mark those specials marketing_generated=true.
 *
 * Posts NOTHING publicly — everything lands in the approval queue for the owner.
 */
export async function POST(req: NextRequest) {
  // Accept EITHER a CRON_SECRET bearer (Coolify/scheduler) OR the X-Agent-Key
  // (Hermes cron, same key the daily-sync job already uses) OR an authenticated
  // manager+ session (admin dashboard button). Any one is sufficient.
  const cronSecret = process.env.CRON_SECRET;
  const agentKey = process.env.AGENT_API_KEY;
  const authHeader = req.headers.get("authorization");
  const headerAgentKey = req.headers.get("x-agent-key");

  const cronOk = cronSecret ? authHeader === `Bearer ${cronSecret}` : false;
  const agentOk = agentKey ? headerAgentKey === agentKey : false;

  let sessionOk = false;
  if (!cronOk && !agentOk) {
    const team = await requireTier(req, "manager");
    sessionOk = !!team;
  }

  if (!cronOk && !agentOk && !sessionOk) {
    if (!cronSecret && !agentKey) {
      console.warn("[marketing/loop] neither CRON_SECRET nor AGENT_API_KEY set — refusing. Set one in production.");
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional overrides via body (lookaheadDays/cooldownDays/maxCampaigns/platforms/dryRun).
  let opts: Record<string, unknown> = {};
  try {
    opts = await req.json();
  } catch {
    /* no body is fine */
  }
  const dryRun = opts.dryRun === true;

  const supabase = getSupabaseAdmin();

  const { data: specialsRows, error: sErr } = await supabase
    .from("specials")
    .select(
      "id, title, subtitle, description, provider_item_id, provider_variation_id, image_url, price_cents, compare_at_cents, badge, cta_label, starts_at, ends_at, is_active, sort_order, marketing_generated"
    )
    .eq("is_active", true);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const { data: recentRows, error: rErr } = await supabase
    .from("social_posts")
    .select("special_id, created_at")
    .not("special_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const specials = (specialsRows ?? []) as Special[];
  const recent = (recentRows ?? []) as RecentPostRef[];

  const plan = planMarketingLoop(specials, recent, {
    lookaheadDays: typeof opts.lookaheadDays === "number" ? opts.lookaheadDays : undefined,
    cooldownDays: typeof opts.cooldownDays === "number" ? opts.cooldownDays : undefined,
    maxCampaigns: typeof opts.maxCampaigns === "number" ? opts.maxCampaigns : undefined,
  });

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, planned: plan });
  }

  const captionFn = createOpenAICaptionFn();
  const summary: Array<{ specialId: string; title: string; created: number; angle: string }> = [];

  for (const campaign of plan) {
    const dropInput = {
      imageUrl: campaign.imageUrl || "",
      title: campaign.title,
      notes: campaign.notes,
      specialId: campaign.specialId,
      platforms: campaign.platforms,
    };

    let created = 0;
    for (const platform of campaign.platforms) {
      const text = await buildDraftText(platform as DropPlatform, dropInput, captionFn);
      // Source=agent so the data-layer approval gate forces pending_approval.
      const result = await createSocialPost({
        platform: platform as DropPlatform,
        text,
        image_urls: campaign.imageUrl ? [campaign.imageUrl] : [],
        status: "pending_approval",
        source: "agent",
        special_id: campaign.specialId,
      });
      if ("id" in result) created++;
    }

    if (created > 0) {
      await supabase.from("specials").update({ marketing_generated: true, updated_at: new Date().toISOString() }).eq("id", campaign.specialId);
    }
    summary.push({ specialId: campaign.specialId, title: campaign.title, created, angle: campaign.angle });
  }

  const totalCreated = summary.reduce((n, s) => n + s.created, 0);
  return NextResponse.json({
    ok: true,
    campaigns: summary.length,
    draftsCreated: totalCreated,
    summary,
    message: `Marketing loop drafted ${totalCreated} post(s) across ${summary.length} campaign(s) → approval queue.`,
  });
}
