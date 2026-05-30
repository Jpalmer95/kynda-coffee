/**
 * Marketing Loop Planner (Roadmap V2 — Epic 5).
 *
 * Pure planning logic for the weekly autonomous marketing cron. Given the current
 * specials and a summary of recent posting activity, it decides WHICH specials
 * deserve a campaign this cycle and on which platforms — without posting anything.
 *
 * The cron route turns each plan item into content-drop drafts (pending_approval,
 * source=agent) so the owner still approves everything. This module is the "what
 * to talk about and when" brain; it holds no DB/network and is fully testable.
 *
 * Rules of restraint (so the agent never spams):
 *  - Only LIVE specials, plus specials STARTING within `lookaheadDays`.
 *  - Skip any special already marketed (`marketing_generated`) unless it's newly
 *    live and hasn't been posted in `cooldownDays`.
 *  - Skip a special if a post referencing it was created within `cooldownDays`.
 *  - Cap the cycle at `maxCampaigns` to keep volume sane.
 *  - A special starting soon (not yet live) gets a "teaser" angle; a live one with
 *    a discount gets a "deal" angle; otherwise a "feature" angle.
 */

import type { Special } from "./specials";
import { isSpecialLive, discountPct } from "./specials";

export type CampaignAngle = "teaser" | "deal" | "feature";
export type LoopPlatform = "instagram" | "facebook" | "twitter" | "tiktok";

export interface RecentPostRef {
  special_id: string | null;
  created_at: string; // ISO
}

export interface MarketingLoopConfig {
  /** How many days ahead to surface upcoming (not-yet-live) specials. Default 7. */
  lookaheadDays?: number;
  /** Don't re-market a special posted within this many days. Default 10. */
  cooldownDays?: number;
  /** Max campaigns proposed per cycle. Default 3. */
  maxCampaigns?: number;
  /** Platforms each campaign targets. Default all four. */
  platforms?: LoopPlatform[];
}

export interface PlannedCampaign {
  specialId: string;
  title: string;
  angle: CampaignAngle;
  platforms: LoopPlatform[];
  imageUrl: string | null;
  /** Owner-notes seed handed to the caption step. */
  notes: string;
  reason: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PLATFORMS: LoopPlatform[] = ["instagram", "facebook", "twitter", "tiktok"];

function startsWithin(special: Special, nowMs: number, days: number): boolean {
  if (!special.starts_at) return false;
  const start = new Date(special.starts_at).getTime();
  if (Number.isNaN(start)) return false;
  return start > nowMs && start - nowMs <= days * DAY_MS;
}

function recentlyPosted(specialId: string, recent: RecentPostRef[], nowMs: number, cooldownDays: number): boolean {
  const cutoff = nowMs - cooldownDays * DAY_MS;
  return recent.some((r) => r.special_id === specialId && new Date(r.created_at).getTime() >= cutoff);
}

function angleFor(special: Special, live: boolean): CampaignAngle {
  if (!live) return "teaser";
  if (discountPct(special) != null) return "deal";
  return "feature";
}

function notesFor(special: Special, angle: CampaignAngle): string {
  const bits = [special.subtitle, special.description].filter(Boolean) as string[];
  const base = bits.join(" — ");
  switch (angle) {
    case "teaser": {
      const when = special.starts_at ? new Date(special.starts_at).toLocaleDateString() : "soon";
      return [`Coming ${when}.`, base].filter(Boolean).join(" ");
    }
    case "deal": {
      const pct = discountPct(special);
      return [pct ? `${pct}% off — limited time.` : "Limited-time deal.", base].filter(Boolean).join(" ");
    }
    default:
      return base || special.title;
  }
}

/**
 * Build this cycle's campaign plan. Deterministic and side-effect free.
 * `specials` should be the full active set (is_active=true); we filter further.
 */
export function planMarketingLoop(
  specials: Special[],
  recent: RecentPostRef[] = [],
  config: MarketingLoopConfig = {},
  nowMs = Date.now()
): PlannedCampaign[] {
  const lookaheadDays = config.lookaheadDays ?? 7;
  const cooldownDays = config.cooldownDays ?? 10;
  const maxCampaigns = config.maxCampaigns ?? 3;
  const platforms = config.platforms?.length ? config.platforms : DEFAULT_PLATFORMS;

  const candidates: PlannedCampaign[] = [];

  for (const s of specials) {
    if (!s.is_active) continue;

    const live = isSpecialLive(s, nowMs);
    const upcoming = startsWithin(s, nowMs, lookaheadDays);
    if (!live && !upcoming) continue;

    if (recentlyPosted(s.id, recent, nowMs, cooldownDays)) continue;
    // Already marketed and not a fresh window → skip to avoid repeats.
    if (s.marketing_generated && !upcoming) continue;

    const angle = angleFor(s, live);
    candidates.push({
      specialId: s.id,
      title: s.title,
      angle,
      platforms: [...platforms],
      imageUrl: s.image_url,
      notes: notesFor(s, angle),
      reason: live
        ? angle === "deal"
          ? "Live special with an active discount"
          : "Live special not yet marketed this cycle"
        : "Upcoming special — teaser window",
    });
  }

  // Priority: deals first, then teasers (time-sensitive), then features; stable by sort_order via input order.
  const rank: Record<CampaignAngle, number> = { deal: 0, teaser: 1, feature: 2 };
  candidates.sort((a, b) => rank[a.angle] - rank[b.angle]);

  return candidates.slice(0, maxCampaigns);
}
