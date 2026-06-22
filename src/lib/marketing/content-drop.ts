/**
 * Content-Drop Pipeline (Roadmap V2 — Epic 5).
 *
 * The owner "drops" a product/feature image (and optional context). This module
 * turns that drop into platform-specific draft social posts that land in the
 * marketing APPROVAL QUEUE (status=pending_approval, source=content_drop) — never
 * auto-published. The owner reviews + approves; the publisher cron does the rest.
 *
 * Caption generation is structured so the AI step is optional: callers pass an
 * async `captionFn` (OpenAI-backed in production). When none is given we fall
 * back to a deterministic, brand-aware template so the pipeline is fully testable
 * and degrades gracefully when no AI key is configured.
 *
 * Pure logic only — no DB or network here. The API route persists the drafts via
 * the existing publisher.createPost() so the approval gate is enforced one place.
 */

export type DropPlatform = "instagram" | "twitter" | "facebook" | "tiktok" | "bluesky";

export interface ContentDropInput {
  imageUrl: string;
  /** Short product/feature name, e.g. "Lavender Honey Latte". */
  title?: string;
  /** Optional owner notes / talking points to weave into copy. */
  notes?: string;
  /** Link a special so the drop references the current promo. */
  specialId?: string;
  /** Which platforms to draft for. Defaults to all four. */
  platforms?: DropPlatform[];
  /** Optional hashtag seeds (without '#'); brand tags are always appended. */
  hashtags?: string[];
}

export interface PlatformCopyRules {
  platform: DropPlatform;
  /** Hard character ceiling for the post body (excludes nothing — caller trims). */
  maxChars: number;
  /** Max number of hashtags that read well on this platform. */
  maxHashtags: number;
  /** Whether emojis tend to perform well / are on-brand here. */
  emojiFriendly: boolean;
}

export const PLATFORM_COPY_RULES: Record<DropPlatform, PlatformCopyRules> = {
  instagram: { platform: "instagram", maxChars: 2200, maxHashtags: 12, emojiFriendly: true },
  facebook: { platform: "facebook", maxChars: 2000, maxHashtags: 4, emojiFriendly: true },
  twitter: { platform: "twitter", maxChars: 280, maxHashtags: 3, emojiFriendly: true },
  tiktok: { platform: "tiktok", maxChars: 2200, maxHashtags: 8, emojiFriendly: true },
  bluesky: { platform: "bluesky", maxChars: 300, maxHashtags: 3, emojiFriendly: true },
};

/** Always-on brand hashtags (deduped against caller seeds, case-insensitive). */
export const BRAND_HASHTAGS = ["KyndaCoffee", "HorseshoeBayTX", "SpecialtyCoffee"];

const ALL_PLATFORMS: DropPlatform[] = ["instagram", "facebook", "twitter", "tiktok", "bluesky"];

/** Caption function contract — production passes an OpenAI-backed impl. */
export type CaptionFn = (args: {
  platform: DropPlatform;
  rules: PlatformCopyRules;
  input: ContentDropInput;
}) => Promise<string>;

function normalizeTag(t: string): string {
  return t.replace(/[^a-z0-9]/gi, "");
}

/** Merge brand + seed hashtags, dedupe (case-insensitive), cap to platform max. */
export function buildHashtags(seeds: string[] = [], maxHashtags = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...seeds, ...BRAND_HASHTAGS]) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= maxHashtags) break;
  }
  return out;
}

/**
 * Deterministic brand-aware fallback caption. Used when no AI captionFn is
 * supplied (no key / tests). Voice: warm, grounded, Old-Norse "kindle a fire"
 * roots, Horseshoe Bay TX. Kept short for X, fuller for IG/FB.
 */
export function fallbackCaption(args: {
  platform: DropPlatform;
  rules: PlatformCopyRules;
  input: ContentDropInput;
}): string {
  const { platform, input } = args;
  const subject = input.title?.trim() || "Something new at Kynda";
  const note = input.notes?.trim();

  if (platform === "twitter" || platform === "bluesky") {
    const base = note ? `${subject} — ${note}` : `${subject}, fresh on the bar.`;
    return base;
  }

  const lines: string[] = [];
  lines.push(`✨ ${subject}`);
  if (note) lines.push(note);
  lines.push(
    "Crafted with care in Horseshoe Bay, TX — come let us kindle your morning. ☕"
  );
  return lines.join("\n\n");
}

/** Assemble final post text = caption + a blank line + hashtags, trimmed to max. */
export function composePostText(
  caption: string,
  hashtags: string[],
  maxChars: number
): string {
  const tagLine = hashtags.map((h) => `#${h}`).join(" ");
  let body = caption.trim();
  const withTags = tagLine ? `${body}\n\n${tagLine}` : body;
  if (withTags.length <= maxChars) return withTags;

  // Too long: drop hashtags first, then hard-trim the caption with an ellipsis.
  if (body.length <= maxChars) return body;
  return body.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…";
}

export interface DraftPost {
  platform: DropPlatform;
  text: string;
  image_urls: string[];
  source: "content_drop";
  status: "pending_approval";
  special_id?: string;
}

/**
 * Build just the post body for one platform (caption + hashtags, trimmed).
 * Shared by the content-drop pipeline and the marketing-loop cron so both
 * compose copy identically. Falls back to the brand template on any caption error.
 */
export async function buildDraftText(
  platform: DropPlatform,
  input: ContentDropInput,
  captionFn?: CaptionFn
): Promise<string> {
  const rules = PLATFORM_COPY_RULES[platform];
  let caption: string;
  try {
    caption = captionFn
      ? await captionFn({ platform, rules, input })
      : fallbackCaption({ platform, rules, input });
    if (!caption || !caption.trim()) {
      caption = fallbackCaption({ platform, rules, input });
    }
  } catch {
    caption = fallbackCaption({ platform, rules, input });
  }
  const hashtags = buildHashtags(input.hashtags, rules.maxHashtags);
  return composePostText(caption, hashtags, rules.maxChars);
}

/**
 * Turn one content drop into N platform-specific draft posts, ready to persist
 * via publisher.createPost(). Every draft is pending_approval + source=content_drop
 * so the approval gate is honored. `captionFn` is awaited per platform; on any
 * caption error we fall back to the deterministic template (never throw the batch).
 */
export async function buildDraftsFromDrop(
  input: ContentDropInput,
  captionFn?: CaptionFn
): Promise<DraftPost[]> {
  if (!input.imageUrl || !input.imageUrl.trim()) {
    throw new Error("content drop requires an imageUrl");
  }
  const platforms = input.platforms?.length ? input.platforms : ALL_PLATFORMS;
  const drafts: DraftPost[] = [];

  for (const platform of platforms) {
    const text = await buildDraftText(platform, input, captionFn);

    drafts.push({
      platform,
      text,
      image_urls: [input.imageUrl],
      source: "content_drop",
      status: "pending_approval",
      ...(input.specialId ? { special_id: input.specialId } : {}),
    });
  }

  return drafts;
}
