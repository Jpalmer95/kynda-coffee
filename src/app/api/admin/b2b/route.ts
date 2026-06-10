import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  canTransition,
  scoreLead,
  type B2BLeadStatus,
  type B2BLeadType,
  type B2BLeadInput,
} from "@/lib/b2b/leads";

export const dynamic = "force-dynamic";

const LEAD_SELECT =
  "id, company, contact_name, email, phone, website, location, lead_type, source, status, fit_score, est_monthly_value_cents, notes, outreach_sent_at, approved_at, created_at, updated_at";

const LEAD_TYPES = new Set(["grocery", "cafe", "office", "restaurant", "event", "hotel", "other"]);

/**
 * Admin B2B pipeline API (manager+; status transitions enforce the state
 * machine — no outreach without owner approval, guaranteed at the data layer).
 *
 * GET    — all leads (Kanban groups client-side)
 * POST   — create a manual lead (auto-scored)
 * PATCH  — { id, status } move through pipeline | { id, ...fields } edit
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("b2b_leads")
    .select(LEAD_SELECT)
    .order("fit_score", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) {
    console.error("B2B leads fetch error", error);
    return NextResponse.json({ error: "Failed to load leads." }, { status: 500 });
  }
  return NextResponse.json({ leads: data ?? [], viewer_role: team.role });
}

export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const company = String(body.company ?? "").trim();
    if (!company) return NextResponse.json({ error: "Company name required." }, { status: 400 });

    const leadType = (LEAD_TYPES.has(body.lead_type) ? body.lead_type : "other") as B2BLeadType;
    const estValue = Number.isFinite(Number(body.est_monthly_value_cents))
      ? Math.max(0, Math.round(Number(body.est_monthly_value_cents)))
      : null;

    const scoreInput: B2BLeadInput = {
      company,
      lead_type: leadType,
      location: body.location ? String(body.location) : undefined,
      email: body.email ? String(body.email) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      est_monthly_value_cents: estValue ?? undefined,
      source: "manual",
    };
    const score = scoreLead(scoreInput);

    const { data, error } = await supabaseAdmin()
      .from("b2b_leads")
      .insert({
        company: company.slice(0, 120),
        contact_name: (body.contact_name ? String(body.contact_name) : "").slice(0, 80) || null,
        email: (body.email ? String(body.email) : "").slice(0, 120) || null,
        phone: (body.phone ? String(body.phone) : "").slice(0, 30) || null,
        website: (body.website ? String(body.website) : "").slice(0, 200) || null,
        location: (body.location ? String(body.location) : "").slice(0, 120) || null,
        lead_type: leadType,
        source: "manual",
        status: "new",
        fit_score: score.score,
        est_monthly_value_cents: estValue,
        notes: (body.notes ? String(body.notes) : "").slice(0, 1000) || null,
      })
      .select(LEAD_SELECT)
      .single();

    if (error) {
      console.error("B2B lead create error", error);
      return NextResponse.json({ error: "Failed to create lead." }, { status: 500 });
    }
    return NextResponse.json({ lead: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Lead id required." }, { status: 400 });

    const { data: current, error: fetchErr } = await supabaseAdmin()
      .from("b2b_leads")
      .select("id, status")
      .eq("id", id)
      .single();
    if (fetchErr || !current) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Status transition through the state machine
    if (body.status) {
      const nextStatus = String(body.status) as B2BLeadStatus;
      const from = current.status as B2BLeadStatus;
      if (!canTransition(from, nextStatus)) {
        return NextResponse.json(
          { error: `Can't move from '${from}' to '${nextStatus}'. Allowed: ${from === "won" || from === "lost" || from === "rejected" ? "none (terminal)" : ""}` },
          { status: 400 }
        );
      }
      // Approval is owner-meaningful: stamp who/when
      if (nextStatus === "approved") {
        updates.approved_by = team.user.id;
        updates.approved_at = new Date().toISOString();
      }
      if (nextStatus === "contacted") {
        updates.outreach_sent_at = new Date().toISOString();
      }
      updates.status = nextStatus;
    }

    // Editable fields
    for (const k of ["contact_name", "email", "phone", "website", "location", "notes"]) {
      if (k in body) updates[k] = (body[k] ? String(body[k]) : "").slice(0, 1000) || null;
    }
    if ("est_monthly_value_cents" in body) {
      const v = Number(body.est_monthly_value_cents);
      updates.est_monthly_value_cents = Number.isFinite(v) ? Math.max(0, Math.round(v)) : null;
    }

    const { data, error } = await supabaseAdmin()
      .from("b2b_leads")
      .update(updates)
      .eq("id", id)
      .select(LEAD_SELECT)
      .single();

    if (error || !data) return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
    return NextResponse.json({ lead: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
