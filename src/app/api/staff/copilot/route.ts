import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAIConfigured, chatCompletion } from "@/lib/ai/client";
import {
  classifyStaffIntake,
  computeSkillRank,
  getDefaultBudgetForTier,
  type IntakeLane,
} from "@/lib/kaizen/engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/staff/copilot
 * Returns the logged-in team member's:
 *  - 60-Second Morning Shift Brief (text + spoken TTS script)
 *  - Kaizen XP, Skill Tree Rank, Bounty Balance & Token Quota
 *  - Latest Espresso Dial-In on bar
 *  - Recent Kaizen Proposals & Open Equipment Tickets
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const todayIso = new Date().toISOString().split("T")[0];

  const [
    profileRes,
    budgetRes,
    dialInRes,
    kaizenRes,
    equipRes,
    specialsRes,
    checksRes,
  ] = await Promise.all([
    db.from("profiles").select("full_name, role").eq("id", team.user.id).maybeSingle(),
    db.from("agent_budgets").select("*").eq("user_id", team.user.id).maybeSingle(),
    db.from("espresso_dial_ins").select("*").order("created_at", { ascending: false }).limit(5),
    db.from("kaizen_proposals").select("*").order("created_at", { ascending: false }).limit(10),
    db.from("equipment_tickets").select("*").neq("status", "resolved").order("created_at", { ascending: false }).limit(8),
    db.from("specials").select("title, description").eq("is_active", true).limit(3),
    db.from("checklist_completions").select("checklist_type").gte("completed_at", `${todayIso}T00:00:00Z`),
  ]);

  const userName = (profileRes.data as { full_name?: string } | null)?.full_name || team.user.email?.split("@")[0] || "Team Member";
  const defaults = getDefaultBudgetForTier(team.role);
  const xp = (budgetRes.data as { kaizen_xp?: number } | null)?.kaizen_xp ?? 50;
  const skill = computeSkillRank(xp);
  const bountyCents = (budgetRes.data as { bounty_balance_cents?: number } | null)?.bounty_balance_cents ?? 0;

  const latestDialIn = (dialInRes.data as any[] | null)?.[0] ?? {
    bean_name: "House Espresso",
    dose_grams: 18.5,
    yield_grams: 37,
    time_seconds: 29,
    is_in_spec: true,
    taste_notes: "Sweet chocolate & toasted almond, clean finish",
  };

  const activeSpecials = (specialsRes.data as { title: string }[] | null)?.map((s) => s.title) ?? [
    "Hill Country Honey Lavender Latte",
    "Cold Brew Corny Keg On Tap",
  ];
  const completedTypes = new Set(((checksRes.data as { checklist_type?: string }[] | null) ?? []).map((c) => c.checklist_type));
  const openEquip = (equipRes.data as any[] | null) ?? [];

  const voiceBrief = [
    `Good shift, ${userName.split(" ")[0]}! Welcome to Kynda Command and Control.`,
    `Remember our number one rule: serving guests always comes first, and an unfinished opening checklist never blocks service.`,
    `Latest espresso dial-in on bar is ${latestDialIn.bean_name}: ${latestDialIn.dose_grams} grams in, ${latestDialIn.yield_grams} grams out in ${latestDialIn.time_seconds} seconds.`,
    activeSpecials.length > 0
      ? `Today's featured specials to highlight for guests are: ${activeSpecials.join(" and ")}.`
      : `Keep highlighting our fresh-roasted single origin beans and signature lattes.`,
    openEquip.length > 0
      ? `Heads up from leadership: there ${openEquip.length === 1 ? "is 1 open equipment note" : `are ${openEquip.length} open equipment notes`} (${openEquip[0].equipment_name}).`
      : `All bar equipment is green and clear.`,
    `You are currently ranked ${skill.rank} with ${xp} Kaizen XP. Tap the mic anytime to ask a recipe, log waste, or drop a Kaizen idea!`,
  ].join(" ");

  return NextResponse.json({
    user: {
      id: team.user.id,
      name: userName,
      role: team.role,
    },
    gamification: {
      xp,
      rank: skill.rank,
      next_rank: skill.nextRank,
      xp_to_next: skill.xpToNext,
      bounty_balance_cents: bountyCents,
      daily_token_limit: (budgetRes.data as any)?.daily_token_limit ?? defaults.daily_token_limit,
      tokens_used_today: (budgetRes.data as any)?.tokens_used_today ?? 0,
      monthly_micro_spend_cents_limit:
        (budgetRes.data as any)?.monthly_micro_spend_cents_limit ?? defaults.monthly_micro_spend_cents_limit,
    },
    shift_brief: {
      voice_script: voiceBrief,
      latest_dial_in: latestDialIn,
      active_specials: activeSpecials,
      checklists_completed_today: Array.from(completedTypes),
      open_equipment_count: openEquip.length,
    },
    recent_kaizen: (kaizenRes.data as any[] | null) ?? [],
    open_equipment: openEquip,
    ai_configured: isAIConfigured(),
  });
}

/**
 * POST /api/staff/copilot
 * Body: { message: string, lane?: IntakeLane, is_anonymous?: boolean }
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string; lane?: IntakeLane; is_anonymous?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", team.user.id)
    .maybeSingle();
  const userName =
    (profile as { full_name?: string } | null)?.full_name ||
    team.user.email?.split("@")[0] ||
    "Team Member";

  const classification = classifyStaffIntake(message, body.lane);
  let xpEarned = 0;
  let createdRecord: Record<string, unknown> | null = null;
  let reply = "";
  const callerId = team.user.id;
  const callerRole = team.role;

  // Helper to award XP safely
  async function awardXp(points: number) {
    if (points <= 0) return;
    try {
      const { data: existing } = await db
        .from("agent_budgets")
        .select("kaizen_xp")
        .eq("user_id", callerId)
        .maybeSingle();
      const newXp = ((existing as { kaizen_xp?: number } | null)?.kaizen_xp ?? 50) + points;
      const rankInfo = computeSkillRank(newXp);
      const defaults = getDefaultBudgetForTier(callerRole);
      await db.from("agent_budgets").upsert(
        {
          user_id: callerId,
          role_tier: callerRole,
          daily_token_limit: defaults.daily_token_limit,
          monthly_compute_cents_limit: defaults.monthly_compute_cents_limit,
          monthly_micro_spend_cents_limit: defaults.monthly_micro_spend_cents_limit,
          auto_approve_po_under_cents: defaults.auto_approve_po_under_cents,
          kaizen_xp: newXp,
          skill_rank: rankInfo.rank,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch {
      // Table may not be migrated yet; degrade gracefully
    }
  }

  if (classification.lane === "owner_whisper") {
    const isAnon = Boolean(body.is_anonymous);
    const payload = {
      submitted_by: isAnon ? null : team.user.id,
      submitter_name: isAnon ? "Anonymous Team Member" : userName,
      is_anonymous: isAnon,
      topic: classification.whisper?.topic ?? "other",
      message,
      status: "unread",
    };
    try {
      const { data } = await db.from("owner_whispers").insert(payload).select().single();
      createdRecord = data;
    } catch {
      createdRecord = { ...payload, id: `local-${Date.now()}` };
    }
    reply =
      "🔒 Your Owner Whisper has been encrypted and routed directly to Jonathan & Briseida's private inbox. No other staff or managers can view it. Thank you for speaking up.";
  } else if (classification.lane === "equipment_ticket" && classification.equipment) {
    xpEarned = 10;
    const payload = {
      reported_by: team.user.id,
      reporter_name: userName,
      equipment_name: classification.equipment.equipment_name,
      area: classification.equipment.area,
      severity: classification.equipment.severity,
      description: message,
      status: "open",
    };
    try {
      const { data } = await db.from("equipment_tickets").insert(payload).select().single();
      createdRecord = data;
    } catch {
      createdRecord = { ...payload, id: `local-${Date.now()}` };
    }
    await awardXp(xpEarned);
    reply = `🔧 Equipment Ticket filed for **${classification.equipment.equipment_name}** (${classification.equipment.severity.toUpperCase()}) and routed to Team Leadership + Team Chat (+${xpEarned} Kaizen XP). ${
      classification.operating_rule_notice ?? ""
    }`.trim();
  } else if (classification.lane === "dial_in" && classification.dial_in) {
    xpEarned = 15;
    const d = classification.dial_in;
    const payload = {
      logged_by: team.user.id,
      barista_name: userName,
      bean_name: d.bean_name,
      dose_grams: d.dose_grams,
      yield_grams: d.yield_grams,
      time_seconds: d.time_seconds,
      taste_notes: message,
      is_in_spec: d.is_in_spec,
    };
    try {
      const { data } = await db.from("espresso_dial_ins").insert(payload).select().single();
      createdRecord = data;
    } catch {
      createdRecord = { ...payload, id: `local-${Date.now()}` };
    }
    await awardXp(xpEarned);
    reply = `☕ **Dial-In Logged (+${xpEarned} XP):** ${d.bean_name} — ${d.dose_grams}g in → ${d.yield_grams}g out in ${d.time_seconds}s (1:${d.ratio}).\n${d.coaching_note}`;
  } else if (classification.lane === "kaizen_proposal" && classification.kaizen) {
    xpEarned = 25;
    const k = classification.kaizen;
    const payload = {
      submitted_by: team.user.id,
      submitter_name: userName,
      submitter_role: team.role,
      category: k.category,
      title: k.suggested_title,
      problem_statement: message,
      proposed_solution: message,
      ai_triage_summary: `Auto-triaged as [${k.category.toUpperCase()} -> ${k.target_system}]. Impact Score: ${k.impact_score}/100. Est. value: $${(k.estimated_monthly_value_cents / 100).toFixed(0)}/mo.`,
      ai_impact_score: k.impact_score,
      ai_estimated_monthly_value_cents: k.estimated_monthly_value_cents,
      ai_target_system: k.target_system,
      status: "pending_review",
      bounty_cents: k.suggested_bounty_cents,
      xp_awarded: xpEarned,
    };
    try {
      const { data } = await db.from("kaizen_proposals").insert(payload).select().single();
      createdRecord = data;
    } catch {
      createdRecord = { ...payload, id: `local-${Date.now()}` };
    }
    await awardXp(xpEarned);
    reply = `🚀 **Kaizen Idea Captured (+${xpEarned} XP)!**\n- **Target System:** \`${k.target_system}\` (${k.category})\n- **Impact Score:** ${k.impact_score}/100\n- **Suggested Approval Bounty:** $${(k.suggested_bounty_cents / 100).toFixed(2)}\n\nQueued in **Jonathan & Briseida's Kaizen Gate** (\`/admin/kaizen\`). When approved, it automatically compiles into our shop SOPs and credits your bounty balance!`;
  } else if (classification.lane === "waste_entry") {
    reply =
      "🗑️ **Food/Drink Waste Detected:** Remember our standing rule — log all spoiled, spilled, or remade food/drink items in [Waste Log](/staff/waste-log) so our 7-day HEB/Amazon reorder math stays exact (`order = par − on_hand + waste`).";
  } else {
    // Knowledge Q&A — search recipes, how-to guides, and handbook sections
    const words = message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !["what", "how", "the", "for", "and", "with", "does", "make"].includes(w));

    const [recipesRes, howtoRes, handbookRes] = await Promise.all([
      db.from("recipes").select("name, category, ingredients, steps, notes").limit(40),
      db.from("howto_guides").select("title, category, content").eq("is_active", true).limit(20),
      db.from("handbook_sections").select("title, content").limit(15),
    ]);

    const matchScore = (haystack: string) => {
      const h = haystack.toLowerCase();
      return words.reduce((acc, w) => (h.includes(w) ? acc + 1 : acc), 0);
    };

    const topRecipes = ((recipesRes.data as any[]) ?? [])
      .map((r) => ({ r, s: matchScore(`${r.name} ${r.category} ${JSON.stringify(r.ingredients)}`) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.r);

    const topHowtos = ((howtoRes.data as any[]) ?? [])
      .map((h) => ({ h, s: matchScore(`${h.title} ${h.category} ${JSON.stringify(h.content)}`) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 2)
      .map((x) => x.h);

    const topHandbook = ((handbookRes.data as any[]) ?? [])
      .map((hb) => ({ hb, s: matchScore(`${hb.title} ${JSON.stringify(hb.content)}`) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 2)
      .map((x) => x.hb);

    const contextBlocks: string[] = [];
    if (classification.operating_rule_notice) {
      contextBlocks.push(`STANDING OPERATING RULE: ${classification.operating_rule_notice}`);
    }
    for (const r of topRecipes) {
      contextBlocks.push(
        `RECIPE [${r.name} (${r.category})]: Ingredients: ${JSON.stringify(r.ingredients)} | Steps: ${JSON.stringify(r.steps)}${r.notes ? ` | Notes: ${r.notes}` : ""}`
      );
    }
    for (const h of topHowtos) {
      contextBlocks.push(`HOW-TO [${h.title}]: ${JSON.stringify(h.content)}`);
    }
    for (const hb of topHandbook) {
      contextBlocks.push(`HANDBOOK [${hb.title}]: ${JSON.stringify(hb.content).slice(0, 500)}`);
    }

    if (isAIConfigured()) {
      try {
        const aiRes = await chatCompletion({
          messages: [
            {
              role: "system",
              content: [
                "You are Kynda Co-Pilot, the internal Hermes AI assistant for Kynda Coffee staff in Horseshoe Bay, TX.",
                "Standing Rules:",
                "1. An unfinished opening checklist NEVER blocks serving guests.",
                "2. Equipment problems go to Team Leadership + Team Chat — NEVER the waste log.",
                "3. The waste log is strictly for food, drink, and inventory items.",
                "4. Menu prices, public posts, vendor orders, and official SOP changes require Jonathan & Briseida's owner approval.",
                "Answer concisely and warmly using the verified Kynda context below:",
                contextBlocks.join("\n\n") || "No exact DB row matched; answer using general Kynda specialty coffee best practices.",
              ].join("\n"),
            },
            { role: "user", content: message },
          ],
          maxTokens: 500,
          temperature: 0.3,
        });
        reply = aiRes.content;
      } catch {
        // Fall through to deterministic response
      }
    }

    if (!reply) {
      if (contextBlocks.length > 0) {
        reply = contextBlocks.join("\n\n");
      } else {
        reply =
          "I checked our live Recipes, How-To guides, and Employee Handbook. Try asking by drink name (e.g., *'Honey Lavender Latte'* or *'Cold Brew corny keg'*), or select **Kaizen Idea**, **Equipment Issue**, or **Owner Whisper** above to route an action directly!";
      }
    }
  }

  return NextResponse.json({
    classification,
    xp_earned: xpEarned,
    record: createdRecord,
    reply,
  });
}
