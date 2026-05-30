/**
 * B2B lead scoring + pipeline helpers (Roadmap V2 — Epic 6).
 *
 * Pure, unit-testable logic for ranking wholesale opportunities. Both the
 * inbound inquiry form and the agentic scout (Hermes cron) score leads with
 * this so the owner sees the highest-fit opportunities first and the scout can
 * threshold which finds are worth surfacing for approval.
 */

export type B2BLeadType = "grocery" | "cafe" | "office" | "restaurant" | "event" | "hotel" | "other";
export type B2BLeadSource = "inbound" | "scout" | "referral" | "manual";
export type B2BLeadStatus = "new" | "approved" | "contacted" | "negotiating" | "won" | "lost" | "rejected";

export interface B2BLeadInput {
  company: string;
  lead_type: B2BLeadType;
  source: B2BLeadSource;
  location?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  est_monthly_value_cents?: number | null;
  notes?: string | null;
}

/** Base fit by lead type — how naturally Kynda's products fit that channel. */
const TYPE_BASE_SCORE: Record<B2BLeadType, number> = {
  grocery: 30, // shelf placement = recurring volume; top strategic goal
  cafe: 28, // wholesale beans to other shops
  hotel: 24,
  restaurant: 22,
  office: 20, // recurring office coffee
  event: 12, // one-off, lower recurring value
  other: 10,
};

/** Horseshoe Bay / Texas Hill Country proximity boosts local fit. */
const LOCAL_KEYWORDS = [
  "horseshoe bay",
  "marble falls",
  "burnet",
  "kingsland",
  "spicewood",
  "lakeway",
  "austin",
  "texas",
  "tx",
];

export interface LeadScore {
  score: number; // 0–100
  factors: string[];
}

/**
 * Score a lead 0–100. Higher = better fit / higher priority.
 * Deterministic so the scout's thresholds are stable and explainable.
 */
export function scoreLead(lead: B2BLeadInput): LeadScore {
  const factors: string[] = [];
  let score = TYPE_BASE_SCORE[lead.lead_type] ?? 10;
  factors.push(`${lead.lead_type} base ${TYPE_BASE_SCORE[lead.lead_type] ?? 10}`);

  // Estimated recurring value: up to +30 (scales to ~$2,000/mo).
  if (lead.est_monthly_value_cents && lead.est_monthly_value_cents > 0) {
    const valuePoints = Math.min(30, Math.round((lead.est_monthly_value_cents / 100 / 2000) * 30));
    score += valuePoints;
    factors.push(`est value +${valuePoints}`);
  }

  // Local proximity: +15.
  const loc = (lead.location ?? "").toLowerCase();
  if (LOCAL_KEYWORDS.some((k) => loc.includes(k))) {
    score += 15;
    factors.push("local +15");
  }

  // Contactability: having a real way to reach them matters for conversion.
  if (lead.email) {
    score += 8;
    factors.push("email +8");
  }
  if (lead.phone) {
    score += 4;
    factors.push("phone +4");
  }
  if (lead.website) {
    score += 3;
    factors.push("website +3");
  }

  // Inbound interest is a strong signal — they came to us.
  if (lead.source === "inbound") {
    score += 12;
    factors.push("inbound +12");
  } else if (lead.source === "referral") {
    score += 10;
    factors.push("referral +10");
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), factors };
}

/**
 * Should the scout surface this lead to the owner for approval?
 * Keeps low-fit noise out of the approval queue.
 */
export function isScoutWorthy(lead: B2BLeadInput, threshold = 45): boolean {
  return scoreLead(lead).score >= threshold;
}

/** Allowed pipeline transitions — keeps the CRM state machine honest. */
export const B2B_TRANSITIONS: Record<B2BLeadStatus, B2BLeadStatus[]> = {
  new: ["approved", "rejected", "lost"],
  approved: ["contacted", "lost", "rejected"],
  contacted: ["negotiating", "won", "lost"],
  negotiating: ["won", "lost"],
  won: [],
  lost: [],
  rejected: [],
};

export function canTransition(from: B2BLeadStatus, to: B2BLeadStatus): boolean {
  return (B2B_TRANSITIONS[from] ?? []).includes(to);
}

/** Group leads into pipeline columns for a Kanban-style admin view. */
export const PIPELINE_STAGES: { key: B2BLeadStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "approved", label: "Approved" },
  { key: "contacted", label: "Contacted" },
  { key: "negotiating", label: "Negotiating" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];
