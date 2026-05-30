import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { scoreLead, type B2BLeadType } from "@/lib/b2b/leads";

const MAX = 5; // max inquiries per IP per 15 minutes
const WINDOW_MS = 15 * 60 * 1000;

const VALID_TYPES: B2BLeadType[] = ["grocery", "cafe", "office", "restaurant", "event", "hotel", "other"];

/**
 * POST /api/wholesale/inquire
 * Public wholesale partnership inquiry. Creates a scored b2b_lead (source=inbound,
 * status=new) for the owner to review. Inserts via service role (RLS admin-only).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`wholesale-inquire:${ip}`, MAX, WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many inquiries. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const company = String(body.company ?? "").trim();
    const contact_name = body.contact_name ? String(body.contact_name).trim() : null;
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const website = body.website ? String(body.website).trim() : null;
    const location = body.location ? String(body.location).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;
    const rawType = String(body.lead_type ?? "other");
    const lead_type: B2BLeadType = VALID_TYPES.includes(rawType as B2BLeadType)
      ? (rawType as B2BLeadType)
      : "other";
    const est_monthly_value_cents =
      typeof body.est_monthly_value_cents === "number" ? Math.max(0, Math.round(body.est_monthly_value_cents)) : null;

    if (!company || (!email && !phone)) {
      return NextResponse.json(
        { error: "Company name and at least one contact method (email or phone) are required." },
        { status: 400 }
      );
    }

    const { score } = scoreLead({
      company,
      lead_type,
      source: "inbound",
      location,
      website,
      email,
      phone,
      est_monthly_value_cents,
    });

    const { error } = await supabaseAdmin().from("b2b_leads").insert({
      company,
      contact_name,
      email,
      phone,
      website,
      location,
      lead_type,
      source: "inbound",
      status: "new",
      fit_score: score,
      est_monthly_value_cents,
      notes,
    });

    if (error) {
      console.error("[wholesale/inquire] insert error:", error);
      return NextResponse.json(
        { error: "Could not submit your inquiry. Please email wholesale@kyndacoffee.com directly." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
