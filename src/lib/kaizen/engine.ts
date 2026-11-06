/**
 * Kynda Command & Control — Decentralized Kaizen RSI Pure Engine
 *
 * Pure, deterministic business logic (zero DB/network side effects) for:
 *  1. Smart Staff Intake Routing (enforcing Kynda Operating Rules:
 *     equipment -> leadership/chat, never waste log; food/drink -> waste log;
 *     sensitive concerns -> owner_whisper; ideas -> kaizen_proposal; dial-in -> telemetry).
 *  2. Kaizen Impact Scoring, Target-System Classification & Bounty Calculation.
 *  3. 5-Tier RBAC Spending/Token Budget & Sacred Owner Gate Enforcement.
 *  4. Barista Skill-Tree XP & Rank Progression.
 *  5. Predictive Schedule Surge & Labor Forecaster (Hill Country seasonality + weather).
 *  6. Theoretical vs. Actual Shrinkage / Loss Prevention Mass-Balance Detector.
 *  7. Module 0: "Kynda Co-Pilot & Kaizen Quickstart" canonical training module seed.
 */

import type { RoleTier } from "@/lib/auth/roles";

export type IntakeLane =
  | "kaizen_proposal"
  | "equipment_ticket"
  | "waste_entry"
  | "owner_whisper"
  | "dial_in"
  | "knowledge_qa";

export type KaizenCategory =
  | "process"
  | "recipe"
  | "inventory"
  | "marketing"
  | "customer_experience"
  | "cost_saving"
  | "layout"
  | "orbital_rd";

export type KaizenTargetSystem =
  | "checklists"
  | "recipes"
  | "howto_guides"
  | "ingredient_pars"
  | "handbook_sections"
  | "marketing"
  | "general";

export type SkillRank =
  | "Apprentice"
  | "Barista"
  | "Dial-In Specialist"
  | "Shift Maestro"
  | "Kaizen Architect";

export interface ParsedDialIn {
  bean_name: string;
  dose_grams: number;
  yield_grams: number;
  time_seconds: number;
  ratio: number;
  is_in_spec: boolean;
  coaching_note: string;
}

export interface IntakeClassification {
  lane: IntakeLane;
  confidence: "high" | "medium";
  operating_rule_notice?: string;
  kaizen?: {
    category: KaizenCategory;
    target_system: KaizenTargetSystem;
    impact_score: number;
    suggested_bounty_cents: number;
    estimated_monthly_value_cents: number;
    suggested_title: string;
  };
  equipment?: {
    equipment_name: string;
    area:
      | "espresso_bar"
      | "cold_brew_keg"
      | "grinder"
      | "refrigeration"
      | "dish_plumbing"
      | "pos_kds"
      | "hvac_lighting"
      | "other";
    severity: "low" | "degraded" | "urgent_down";
  };
  dial_in?: ParsedDialIn;
  whisper?: {
    topic: "culture" | "safety" | "scheduling" | "management" | "idea" | "other";
  };
}

const EQUIPMENT_KEYWORDS: {
  pattern: RegExp;
  name: string;
  area: NonNullable<IntakeClassification["equipment"]>["area"];
}[] = [
  { pattern: /\b(espresso machine|grouphead|steam wand|boiler|portafilter|gasket)\b/i, name: "Espresso Machine", area: "espresso_bar" },
  { pattern: /\b(grinder|burr|mazzer|mahlk[oö]nig)\b/i, name: "Espresso / Batch Grinder", area: "grinder" },
  { pattern: /\b(kegerator|corny keg|o-ring|nitro tap|cold brew tap|co2|regulator)\b/i, name: "Cold Brew Kegerator", area: "cold_brew_keg" },
  { pattern: /\b(fridge|refrigerator|cooler|ice machine|freezer)\b/i, name: "Refrigeration / Ice Machine", area: "refrigeration" },
  { pattern: /\b(sink|drain|plumbing|dishwasher|water filter|ro system|leak|leaking)\b/i, name: "Plumbing / Dish Station", area: "dish_plumbing" },
  { pattern: /\b(kds|ipad|tablet|printer|thermal printer|square register|card reader)\b/i, name: "POS / KDS / Printer", area: "pos_kds" },
  { pattern: /\b(ac|hvac|thermostat|heater|umbrella|patio light)\b/i, name: "HVAC / Facility", area: "hvac_lighting" },
];

const EQUIPMENT_FAILURE_VERBS =
  /\b(broken|leaking|leak|jammed|won't turn on|not working|making a noise|error|clogged|pressure drop|failing|warm temp|blinking|stuck|issue|problem|fix|repair)\b/i;

const WASTE_KEYWORDS =
  /\b(spilled|expired|spoiled|burnt|dropped|wasted|sour milk|moldy|stale|over-prepared|log.*waste|waste log)\b/i;

const WHISPER_KEYWORDS =
  /\b(private|confidential|whisper|anonymous|only for jonathan|only for briseida|harassment|uncomfortable|hostile|unfair|safety concern|feeling overwhelmed)\b/i;

const KAIZEN_KEYWORDS =
  /\b(kaizen|idea|suggestion|we should|what if we|could we|improve|faster way|save time|save money|keep running out|stockout|par level|move the|reorganize)\b/i;

/**
 * Parse a barista's morning espresso dial-in text, e.g.:
 * "Dial-in: Ethiopia 18.5g in, 37g out in 29s" or "18g dose 36g yield 28 seconds"
 */
export function parseEspressoDialIn(text: string): ParsedDialIn | null {
  const lower = text.toLowerCase();
  const hasDialCue =
    /\b(dial[- ]?in|shot|espresso|extraction|grams? in|dose|yield)\b/.test(lower);
  if (!hasDialCue) return null;

  const doseMatch =
    text.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:in|dose)/i) ||
    text.match(/dose[:\s]+(\d+(?:\.\d+)?)\s*g?/i);
  const yieldMatch =
    text.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:out|yield)/i) ||
    text.match(/yield[:\s]+(\d+(?:\.\d+)?)\s*g?/i);
  const timeMatch =
    text.match(/(\d{2})\s*(?:s|sec|seconds)\b/i) ||
    text.match(/in\s+(\d{2})\s*(?:s|sec|seconds)/i);

  if (!doseMatch || !yieldMatch || !timeMatch) return null;

  const dose = Number(doseMatch[1]);
  const yieldG = Number(yieldMatch[1]);
  const timeSec = Number(timeMatch[1]);
  if (dose <= 0 || yieldG <= 0 || timeSec <= 0) return null;

  const ratio = Number((yieldG / dose).toFixed(2));
  const ratioOk = ratio >= 1.75 && ratio <= 2.35;
  const timeOk = timeSec >= 24 && timeSec <= 34;
  const isInSpec = ratioOk && timeOk;

  let beanName = "House Espresso";
  if (/\bethiopia\b/i.test(text)) beanName = "Ethiopia Single Origin";
  else if (/\bcolombia\b/i.test(text)) beanName = "Colombia Single Origin";
  else if (/\bdecaf\b/i.test(text)) beanName = "Decaf Espresso";

  let coaching = `In spec (1:${ratio} in ${timeSec}s). Ready for service!`;
  if (!timeOk && timeSec < 24) {
    coaching = `Fast shot (${timeSec}s, 1:${ratio}) — adjust grinder 1–2 clicks FINER to avoid sour/under-extracted espresso.`;
  } else if (!timeOk && timeSec > 34) {
    coaching = `Slow/choked shot (${timeSec}s, 1:${ratio}) — adjust grinder 1–2 clicks COARSER to avoid bitter channeling.`;
  } else if (!ratioOk) {
    coaching = `Ratio 1:${ratio} is outside the 1:1.8–1:2.2 sweet spot — check scale tare and programmable volumetric stop.`;
  }

  return {
    bean_name: beanName,
    dose_grams: dose,
    yield_grams: yieldG,
    time_seconds: timeSec,
    ratio,
    is_in_spec: isInSpec,
    coaching_note: coaching,
  };
}

/**
 * Score a Kaizen proposal and map it to the right target system & bounty tier.
 */
export function evaluateKaizenProposal(text: string): NonNullable<IntakeClassification["kaizen"]> {
  const lower = text.toLowerCase();

  let category: KaizenCategory = "process";
  let targetSystem: KaizenTargetSystem = "general";

  if (/\b(par|stockout|run out|heb|amazon|order|inventory|gallon|syrup|cups|lids)\b/.test(lower)) {
    category = "inventory";
    targetSystem = "ingredient_pars";
  } else if (/\b(recipe|pump|sweet|latte|cold brew|matcha|chai|foam|ratio|ounces|oz)\b/.test(lower)) {
    category = "recipe";
    targetSystem = "recipes";
  } else if (/\b(opening|closing|mid-shift|checklist|duty|duties|restock)\b/.test(lower)) {
    category = "process";
    targetSystem = "checklists";
  } else if (/\b(clean|keg|how to|maintenance|step|o-ring|filter|calibrate)\b/.test(lower)) {
    category = "process";
    targetSystem = "howto_guides";
  } else if (/\b(tiktok|instagram|reel|post|special|promo|marketing|sign|photo)\b/.test(lower)) {
    category = "marketing";
    targetSystem = "marketing";
  } else if (/\b(policy|handbook|uniform|shift swap|onboarding)\b/.test(lower)) {
    category = "process";
    targetSystem = "handbook_sections";
  } else if (/\b(moon|orbital|zero-g|microgravity|closed-loop|xr|vr)\b/.test(lower)) {
    category = "orbital_rd";
    targetSystem = "general";
  } else if (/\b(save|waste|cost|cheaper|margin|shrink)\b/.test(lower)) {
    category = "cost_saving";
    targetSystem = "ingredient_pars";
  } else if (/\b(station|counter|layout|shelf|under the|reach)\b/.test(lower)) {
    category = "layout";
    targetSystem = "howto_guides";
  }

  // Compute heuristic impact score (40..95)
  let score = 55;
  if (/\b(every saturday|every day|rush|bottleneck|stockout|sell out|sold out)\b/.test(lower)) score += 18;
  if (/\b(save|waste|cost|margin|revenue|upsell)\b/.test(lower)) score += 12;
  if (/\d+/.test(lower)) score += 8; // quantified observation
  if (text.trim().length > 80) score += 5;
  score = Math.min(95, Math.max(40, score));

  const suggestedBountyCents =
    score >= 85 ? 2500 : score >= 70 ? 1500 : 500;
  const estimatedMonthlyValueCents =
    score >= 85 ? 45000 : score >= 70 ? 20000 : 7500;

  const cleanSentence = text.trim().split(/[.!?]/)[0]?.trim() || "Kaizen Improvement";
  const suggestedTitle =
    cleanSentence.length > 68 ? `${cleanSentence.slice(0, 65)}...` : cleanSentence;

  return {
    category,
    target_system: targetSystem,
    impact_score: score,
    suggested_bounty_cents: suggestedBountyCents,
    estimated_monthly_value_cents: estimatedMonthlyValueCents,
    suggested_title: suggestedTitle,
  };
}

/**
 * Classify any decentralized team intake while strictly enforcing Kynda Operating Rules:
 *  - Rule 1: Opening checklist never blocks serving guests.
 *  - Rule 2: Equipment problems go to Team Leadership + Team Chat — NOT the waste log.
 *  - Rule 3: Waste log is strictly for food, drink, and items.
 */
export function classifyStaffIntake(
  text: string,
  explicitLane?: IntakeLane
): IntakeClassification {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Check if user is talking about equipment
  const matchedEquip = EQUIPMENT_KEYWORDS.find((k) => k.pattern.test(trimmed));
  const isEquipProblem =
    Boolean(matchedEquip && EQUIPMENT_FAILURE_VERBS.test(trimmed)) ||
    explicitLane === "equipment_ticket";

  // Standing Rule Enforcement: if someone tries to put an equipment problem into the Waste Log!
  const mentionsWasteLog = /\bwaste(\s+log)?\b/i.test(trimmed);
  if (matchedEquip && EQUIPMENT_FAILURE_VERBS.test(trimmed) && (mentionsWasteLog || explicitLane === "waste_entry")) {
    return {
      lane: "equipment_ticket",
      confidence: "high",
      operating_rule_notice:
        "Kynda Operating Rule: The Waste Log is strictly for food, drink, and inventory items. Equipment issues are automatically routed to Team Leadership + Team Chat so they get fixed fast!",
      equipment: {
        equipment_name: matchedEquip.name,
        area: matchedEquip.area,
        severity: /\b(down|dead|won't turn on|flooding|burst)\b/i.test(trimmed)
          ? "urgent_down"
          : "degraded",
      },
    };
  }

  if (explicitLane === "owner_whisper" || WHISPER_KEYWORDS.test(lower)) {
    let topic: NonNullable<IntakeClassification["whisper"]>["topic"] = "other";
    if (/\bsafe|hazard|burn|slip|lock\b/i.test(lower)) topic = "safety";
    else if (/\bschedule|shift|hours\b/i.test(lower)) topic = "scheduling";
    else if (/\bmanager|lead|unfair\b/i.test(lower)) topic = "management";
    else if (/\bculture|team|vibe|morale\b/i.test(lower)) topic = "culture";
    return {
      lane: "owner_whisper",
      confidence: "high",
      whisper: { topic },
    };
  }

  const dialIn = parseEspressoDialIn(trimmed);
  if (explicitLane === "dial_in" || dialIn) {
    return {
      lane: "dial_in",
      confidence: "high",
      dial_in:
        dialIn ?? {
          bean_name: "House Espresso",
          dose_grams: 18.5,
          yield_grams: 37,
          time_seconds: 29,
          ratio: 2.0,
          is_in_spec: true,
          coaching_note: "Logged default 18.5g -> 37g in 29s spec.",
        },
    };
  }

  if (isEquipProblem) {
    return {
      lane: "equipment_ticket",
      confidence: "high",
      operating_rule_notice:
        "Routed to Team Leadership + Team Chat (per Kynda Operating Rules, equipment issues never go in the Waste Log).",
      equipment: {
        equipment_name: matchedEquip?.name ?? "Shop Equipment",
        area: matchedEquip?.area ?? "other",
        severity: /\b(down|dead|won't turn on|flooding|burst|urgent)\b/i.test(trimmed)
          ? "urgent_down"
          : "degraded",
      },
    };
  }

  if (explicitLane === "waste_entry" || (WASTE_KEYWORDS.test(lower) && !KAIZEN_KEYWORDS.test(lower))) {
    return {
      lane: "waste_entry",
      confidence: "high",
    };
  }

  if (explicitLane === "kaizen_proposal" || KAIZEN_KEYWORDS.test(lower)) {
    return {
      lane: "kaizen_proposal",
      confidence: "high",
      kaizen: evaluateKaizenProposal(trimmed),
    };
  }

  // Check if they ask whether an unfinished opening checklist blocks serving customers
  if (/\b(opening checklist|checklist).*(block|serve|customer|guest|wait)\b/i.test(lower)) {
    return {
      lane: "knowledge_qa",
      confidence: "high",
      operating_rule_notice:
        "Kynda Operating Rule: An unfinished opening checklist NEVER blocks serving guests. Serve guests first; complete the checklist around service.",
    };
  }

  return {
    lane: "knowledge_qa",
    confidence: "medium",
  };
}

/**
 * Compute Barista Skill Rank from accumulated Kaizen & Training XP.
 */
export function computeSkillRank(xp: number): {
  rank: SkillRank;
  nextRank: SkillRank | null;
  xpToNext: number;
} {
  const safeXp = Math.max(0, Math.floor(xp));
  if (safeXp >= 1000) {
    return { rank: "Kaizen Architect", nextRank: null, xpToNext: 0 };
  }
  if (safeXp >= 600) {
    return { rank: "Shift Maestro", nextRank: "Kaizen Architect", xpToNext: 1000 - safeXp };
  }
  if (safeXp >= 300) {
    return { rank: "Dial-In Specialist", nextRank: "Shift Maestro", xpToNext: 600 - safeXp };
  }
  if (safeXp >= 100) {
    return { rank: "Barista", nextRank: "Dial-In Specialist", xpToNext: 300 - safeXp };
  }
  return { rank: "Apprentice", nextRank: "Barista", xpToNext: 100 - safeXp };
}

/**
 * Default budget profile per RoleTier.
 */
export function getDefaultBudgetForTier(tier: RoleTier) {
  switch (tier) {
    case "owner":
      return {
        role_tier: "owner" as const,
        daily_token_limit: 500000,
        monthly_compute_cents_limit: 10000,
        monthly_micro_spend_cents_limit: 500000,
        auto_approve_po_under_cents: 500000,
      };
    case "manager":
      return {
        role_tier: "manager" as const,
        daily_token_limit: 100000,
        monthly_compute_cents_limit: 1500, // $15/mo AI compute
        monthly_micro_spend_cents_limit: 15000, // $150/mo shop emergency micro-spend
        auto_approve_po_under_cents: 10000, // Auto-approve emergency supply POs up to $100
      };
    case "staff":
      return {
        role_tier: "staff" as const,
        daily_token_limit: 25000,
        monthly_compute_cents_limit: 300, // $3/mo cloud AI (with local fallback)
        monthly_micro_spend_cents_limit: 0,
        auto_approve_po_under_cents: 0,
      };
    default:
      return {
        role_tier: "customer" as const,
        daily_token_limit: 5000,
        monthly_compute_cents_limit: 0, // BYOC
        monthly_micro_spend_cents_limit: 0,
        auto_approve_po_under_cents: 0,
      };
  }
}

export type GuardedActionType =
  | "approve_kaizen_or_compile_sop"
  | "publish_marketing_or_change_price"
  | "read_owner_whispers"
  | "micro_spend_purchase"
  | "submit_kaizen_or_waste";

/**
 * Enforce the Dual-Owner Sacred Gate (Jonathan & Briseida) + Manager Micro-Spend rails.
 */
export function evaluateTierAction(params: {
  role: RoleTier;
  action: GuardedActionType;
  amountCents?: number;
  remainingMicroSpendCents?: number;
  autoApproveUnderCents?: number;
}): { allowed: boolean; requiresOwnerGate: boolean; reason: string } {
  const { role, action, amountCents = 0 } = params;

  if (
    action === "approve_kaizen_or_compile_sop" ||
    action === "publish_marketing_or_change_price" ||
    action === "read_owner_whispers"
  ) {
    if (role === "owner") {
      return {
        allowed: true,
        requiresOwnerGate: false,
        reason: "Co-Owner (Jonathan / Briseida) root authority verified.",
      };
    }
    return {
      allowed: false,
      requiresOwnerGate: true,
      reason:
        "Sacred Gate: Trajectory, SOP compilation, pricing, public publishing, and Owner Whispers require Jonathan or Briseida's explicit approval.",
    };
  }

  if (action === "micro_spend_purchase") {
    if (role === "owner") {
      return { allowed: true, requiresOwnerGate: false, reason: "Owner spend authorized." };
    }
    if (role === "manager") {
      const defaults = getDefaultBudgetForTier("manager");
      const cap = params.autoApproveUnderCents ?? defaults.auto_approve_po_under_cents;
      const rem = params.remainingMicroSpendCents ?? defaults.monthly_micro_spend_cents_limit;
      if (amountCents <= cap && amountCents <= rem) {
        return {
          allowed: true,
          requiresOwnerGate: false,
          reason: `Auto-approved within Manager micro-budget ($${(amountCents / 100).toFixed(2)} <= $${(cap / 100).toFixed(2)} cap).`,
        };
      }
      return {
        allowed: false,
        requiresOwnerGate: true,
        reason: `Purchase of $${(amountCents / 100).toFixed(2)} exceeds Manager auto-approval limit ($${(cap / 100).toFixed(2)}) or monthly remaining budget ($${(rem / 100).toFixed(2)}). Queued for Jonathan & Briseida.`,
      };
    }
    return {
      allowed: false,
      requiresOwnerGate: true,
      reason: "Staff tier cannot authorize purchases directly; routed to Manager/Owner PO queue.",
    };
  }

  // submit_kaizen_or_waste
  if (role === "owner" || role === "manager" || role === "staff") {
    return { allowed: true, requiresOwnerGate: false, reason: "Team intake permitted." };
  }
  return { allowed: false, requiresOwnerGate: true, reason: "Authentication required." };
}

/**
 * Predictive Schedule Surge & Labor Forecaster
 * Combines Hill Country / Horseshoe Bay seasonality + weather + special events.
 */
export interface SurgeForecastInput {
  dateIso: string; // YYYY-MM-DD
  baselineDailyRevenueCents: number;
  tempHighF: number;
  weatherCondition: "sunny" | "cloudy" | "rain" | "cold_snap";
  isHolidayOrLakeEvent?: boolean;
  isGrandOpeningWindow?: boolean; // 4909 RM 2147 Winter 2026
}

export interface ShiftBlockRecommendation {
  block: "Morning Rush (7am–11am)" | "Midday Flow (11am–2pm)" | "Afternoon / Close (2pm–5pm)";
  recommendedBaristas: number;
  projectedOrders: number;
  focusNote: string;
}

export interface SurgeForecastResult {
  dateIso: string;
  demandMultiplier: number;
  projectedRevenueCents: number;
  icedDrinkSharePct: number;
  targetLaborBudgetCents: number; // ~28% target labor ratio
  shifts: ShiftBlockRecommendation[];
  prepAlerts: string[];
}

export function forecastShiftDemand(input: SurgeForecastInput): SurgeForecastResult {
  const dt = new Date(`${input.dateIso}T12:00:00Z`);
  const dayOfWeek = dt.getUTCDay(); // 0=Sun .. 6=Sat
  const month = dt.getUTCMonth() + 1; // 1..12

  // Day-of-week weight (Horseshoe Bay weekend lake traffic spikes Fri/Sat/Sun)
  const dowWeights: Record<number, number> = {
    0: 1.22, // Sunday
    1: 0.85, // Monday
    2: 0.82, // Tuesday
    3: 0.88, // Wednesday
    4: 0.95, // Thursday
    5: 1.18, // Friday
    6: 1.35, // Saturday
  };
  let mult = dowWeights[dayOfWeek] ?? 1.0;

  // Hill Country Seasonality (Summer lake season May-Aug + Nov-Dec holidays)
  if (month >= 5 && month <= 8) mult *= 1.18;
  else if (month === 11 || month === 12) mult *= 1.15;

  // Weather modifier
  if (input.weatherCondition === "sunny" && input.tempHighF >= 82) {
    mult *= 1.14;
  } else if (input.weatherCondition === "rain") {
    mult *= 0.86;
  } else if (input.weatherCondition === "cold_snap") {
    mult *= 0.92;
  }

  if (input.isHolidayOrLakeEvent) mult *= 1.25;
  if (input.isGrandOpeningWindow) mult *= 1.35;

  const demandMultiplier = Number(mult.toFixed(2));
  const projectedRevenueCents = Math.round(input.baselineDailyRevenueCents * demandMultiplier);
  const targetLaborBudgetCents = Math.round(projectedRevenueCents * 0.28);

  const icedDrinkSharePct =
    input.tempHighF >= 85
      ? 74
      : input.tempHighF >= 72
      ? 58
      : input.tempHighF <= 50
      ? 28
      : 45;

  const avgTicketCents = 850;
  const totalOrders = Math.max(20, Math.round(projectedRevenueCents / avgTicketCents));
  const morningOrders = Math.round(totalOrders * 0.52);
  const middayOrders = Math.round(totalOrders * 0.28);
  const afternoonOrders = Math.max(5, totalOrders - morningOrders - middayOrders);

  const morningBaristas = morningOrders >= 95 ? 4 : morningOrders >= 60 ? 3 : 2;
  const middayBaristas = middayOrders >= 55 ? 3 : 2;
  const afternoonBaristas = afternoonOrders >= 45 ? 2 : 1;

  const prepAlerts: string[] = [];
  if (icedDrinkSharePct >= 65) {
    prepAlerts.push(
      `High Iced Demand (${icedDrinkSharePct}%): Check Cold Brew Corny Kegs (+1 spare keg) & 16oz Iced Cups/Oat Milk par.`
    );
  }
  if (input.tempHighF <= 55) {
    prepAlerts.push(
      "Warm Drink Surge: Pre-stage extra Whole Milk, 12oz Hot Cups/Sleeves, and Pastry case warmers."
    );
  }
  if (demandMultiplier >= 1.3) {
    prepAlerts.push(
      `Surge Day (${demandMultiplier}x baseline): Schedule ${morningBaristas} baristas for 7am–11am rush; assign dedicated expeditor/runner.`
    );
  }

  return {
    dateIso: input.dateIso,
    demandMultiplier,
    projectedRevenueCents,
    icedDrinkSharePct,
    targetLaborBudgetCents,
    shifts: [
      {
        block: "Morning Rush (7am–11am)",
        recommendedBaristas: morningBaristas,
        projectedOrders: morningOrders,
        focusNote:
          morningBaristas >= 3
            ? "Dedicated Espresso Bar + Cold Bar/KDS Expeditor"
            : "Standard 2-person bar + register flow",
      },
      {
        block: "Midday Flow (11am–2pm)",
        recommendedBaristas: middayBaristas,
        projectedOrders: middayOrders,
        focusNote: "Lunch panini/pastry restock + mid-shift checklist + media content drop",
      },
      {
        block: "Afternoon / Close (2pm–5pm)",
        recommendedBaristas: afternoonBaristas,
        projectedOrders: afternoonOrders,
        focusNote: "Cold brew batch prep + par count + closing sanitization checklist",
      },
    ],
    prepAlerts,
  };
}

/**
 * Loss, Theft & Shrinkage Mass-Balance Detector
 * Compares Theoretical Usage (POS sales × recipe spec) + Logged Waste
 * against Actual Inventory Depletion (Start + Received - End Par Count).
 */
export interface ShrinkageItemInput {
  ingredientName: string;
  unit: string;
  unitCostCents: number;
  theoreticalUsedQty: number;
  loggedWasteQty: number;
  actualDepletedQty: number;
}

export interface ShrinkageAnomaly {
  ingredientName: string;
  unaccountedQty: number;
  unit: string;
  unaccountedLossCents: number;
  variancePct: number;
  severity: "critical" | "warning";
  hypothesis: string;
}

export function detectShrinkageAnomalies(items: ShrinkageItemInput[]): ShrinkageAnomaly[] {
  const anomalies: ShrinkageAnomaly[] = [];

  for (const item of items) {
    const expected = item.theoreticalUsedQty + item.loggedWasteQty;
    const unaccounted = Number((item.actualDepletedQty - expected).toFixed(2));
    if (unaccounted <= 0 || expected <= 0) continue;

    const variancePct = Number(((unaccounted / expected) * 100).toFixed(1));
    const lossCents = Math.round(unaccounted * item.unitCostCents);

    if (variancePct >= 12 && lossCents >= 500) {
      const severity = variancePct >= 25 || lossCents >= 2500 ? "critical" : "warning";
      anomalies.push({
        ingredientName: item.ingredientName,
        unaccountedQty: unaccounted,
        unit: item.unit,
        unaccountedLossCents: lossCents,
        variancePct,
        severity,
        hypothesis:
          variancePct >= 25
            ? `Unlogged waste, over-pouring, or inventory shrink (${unaccounted} ${item.unit} missing vs POS+Waste log). Audit bar jiggers/spouts & closing par count.`
            : `Moderate variance (+${variancePct}% above recipe spec). Remind team to log all spills/remakes in /staff/waste-log.`,
      });
    }
  }

  return anomalies.sort((a, b) => b.unaccountedLossCents - a.unaccountedLossCents);
}

/**
 * Canonical Module 0 Training Quickstart ("Zero-to-Agent in 10 Minutes")
 * Automatically injected into `/training` so even a brand-new hire who has
 * never touched AI is comfortable in 10 minutes.
 */
export const KYNDA_CO_PILOT_QUICKSTART_MODULE = {
  id: "module-0-kynda-copilot-kaizen",
  title: "Module 0: Kynda Co-Pilot & Kaizen Quickstart (10-Min Guide)",
  description:
    "New to AI? Learn how to use the Kynda Staff Co-Pilot, Voice Walkie-Talkie, Kaizen Idea Bounties, and the 3 Golden Shop Rules in 10 minutes.",
  category: "onboarding",
  order_index: 0,
  is_required: true,
  updated_at: "2026-11-06T00:00:00.000Z",
  content: `# Welcome to Kynda Command & Control (Kaizen RSI)

You do **not** need any "AI experience" to use Kynda's system. Think of **Kynda Co-Pilot** (\`/staff/copilot\`) as a smart walkie-talkie and digital notebook that hates paperwork as much as you do.

## The 3 Golden Rules at the Bar

1. **Talk to it like a coworker, not a computer:** Tap the microphone button (or type in plain English or Spanish). Ask *"How many pumps of vanilla go in a 16oz iced latte?"* or say *"Morning dial-in: Ethiopia 18.5g in, 37g out in 29 seconds."*
2. **You CANNOT accidentally break the business:** Menu prices, public social media posts, vendor orders, and official handbook/recipe updates are locked behind **Jonathan & Briseida's Approval Gate**. Explore and submit ideas freely!
3. **Right Lane, Right Action (Standing Kynda Rules):**
   - **Opening Checklist:** An unfinished opening checklist **NEVER blocks serving guests**. Serve guests first; finish the checklist around service.
   - **Waste Log (\`/staff/waste-log\`):** Strictly for **food, drink, and inventory items** (spilled milk, expired pastries, remade drinks).
   - **Equipment Problems:** If a grinder, steam wand, kegerator, or fridge acts up, report it to **Team Leadership + Team Chat** (or the Equipment tab in \`/staff/copilot\`) — **NEVER put equipment issues in the Waste Log!**
   - **Kaizen Ideas ($5–$50 Bounties):** Spot a way to make a station faster, save stockouts, or delight guests? Submit a **Kaizen Idea** in \`/staff/copilot\`. When Jonathan & Briseida approve it into our SOPs, you earn **Kaizen XP + a real payout bounty**!
   - **Owner Whisper (🔒 Private):** Need to share a sensitive concern, safety note, or private feedback? Use **Owner Whisper** — it is encrypted and visible **only** to Jonathan and Briseida.

## Your 10-Minute First-Shift Drill

1. **Minute 1–3 (Voice Brief):** Open \`/staff/copilot\` and tap **"Play 60s Shift Brief"** to hear today's weather surge forecast, active specials, and espresso dial-in status.
2. **Minute 3–6 (Ask a Recipe / How-To):** Ask Co-Pilot: *"How do we clean the espresso machine and load a Cold Brew corny keg?"*
3. **Minute 6–10 (Submit Your First Kaizen):** Spot one tiny thing that could be clearer for the next new hire and submit it under **Kaizen Idea** to earn your first **+25 Kaizen XP** toward **Barista → Dial-In Specialist → Shift Maestro → Kaizen Architect**!`,
};
