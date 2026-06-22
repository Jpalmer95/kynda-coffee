/**
 * X/Twitter Algorithm Validator
 *
 * The X recommendation algorithm is open source (https://github.com/x-arch).
 * This module encodes the known ranking signals into a pure, testable validator
 * that scores a draft post and returns actionable feedback.
 *
 * Signal sources (from the open-sourced ranking heavy ranker + heuristics):
 *  - Real-time engagement (replies > retweets > likes in ranking weight)
 *  - Dwell time: longer text posts drive more dwell → positive signal
 *  - Media: images/video boost impressions
 *  - External links: throttled (de-ranks unless the link is to X itself)
 *  - Thread structure: multi-tweet threads get engagement multiplier
 *  - Posting cadence: consistent posting > bursts > silence
 *  - Reply context: replying to larger accounts increases reach
 *  - Negative: spam patterns, repetitive content, excessive hashtags/caps/emoji
 *
 * This is a heuristic approximation, not a reverse-engineered clone. It captures
 * the publicly documented design principles and gives the owner a practical
 * "will this post do well?" gut-check before approving.
 */

export interface XValidationIssue {
  severity: "critical" | "warning" | "info";
  rule: string;
  message: string;
  /** Suggested fix the owner can apply. */
  suggestion?: string;
}

export interface XValidationResult {
  score: number; // 0-100, higher = better predicted reach
  verdict: "excellent" | "good" | "fair" | "poor";
  issues: XValidationIssue[];
  strengths: string[];
  estimatedReachMultiplier: number; // 1.0 = baseline, >1 = boost, <1 = throttle
  characterCount: number;
  hasMedia: boolean;
  hasExternalLink: boolean;
  hashtagCount: number;
}

const MAX_TWEET_CHARS = 280;
const OPTIMAL_LENGTH_MIN = 120;
const OPTIMAL_LENGTH_MAX = 250;

/** Detect external URLs (excludes x.com/twitter.com internal links). */
function findExternalLinks(text: string): string[] {
  const urlRegex = /https?:\/\/(www\.)?([^\s]+)/gi;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(text)) !== null) {
    const host = m[2].toLowerCase();
    if (!host.startsWith("x.com") && !host.startsWith("twitter.com")) {
      matches.push(m[0]);
    }
  }
  return matches;
}

function countHashtags(text: string): number {
  return (text.match(/#[\w]+/g) || []).length;
}

function countEmojis(text: string): number {
  // Basic emoji detection via Unicode ranges
  const emojiRegex = /[\u{1F000}-\u{1FFFF}]/gu;
  return (text.match(emojiRegex) || []).length;
}

function hasExcessiveCaps(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 10) return false;
  const upper = text.replace(/[^A-Z]/g, "").length;
  return upper / letters.length > 0.6;
}

export interface XPostInput {
  text: string;
  hasImage?: boolean;
  hasVideo?: boolean;
  isThread?: boolean;
  isReply?: boolean;
  /** Number of recent posts in the last 24h (for cadence check). */
  recentPostCount24h?: number;
}

/**
 * Validate a draft X/Twitter post against algorithm best practices.
 * Pure function — no side effects, fully testable.
 */
export function validateXPost(input: XPostInput): XValidationResult {
  const text = input.text || "";
  const charCount = text.length;
  const externalLinks = findExternalLinks(text);
  const hashtagCount = countHashtags(text);
  const emojiCount = countEmojis(text);
  const capsIssue = hasExcessiveCaps(text);
  const hasMedia = input.hasImage || input.hasVideo || false;

  const issues: XValidationIssue[] = [];
  const strengths: string[] = [];
  let reachMultiplier = 1.0;

  // ── Character count ───────────────────────────────────────────────────
  if (charCount > MAX_TWEET_CHARS) {
    issues.push({
      severity: "critical",
      rule: "char-limit",
      message: `Post is ${charCount} chars — exceeds the ${MAX_TWEET_CHARS} limit.`,
      suggestion: "Trim to fit, or split into a thread.",
    });
    reachMultiplier *= 0.1; // won't post at all
  } else if (charCount < 20) {
    issues.push({
      severity: "warning",
      rule: "too-short",
      message: "Very short posts get low dwell time.",
      suggestion: "Add context or a hook — aim for 120-250 characters.",
    });
    reachMultiplier *= 0.7;
  } else if (charCount >= OPTIMAL_LENGTH_MIN && charCount <= OPTIMAL_LENGTH_MAX) {
    strengths.push("Optimal length for dwell time (120-250 chars).");
    reachMultiplier *= 1.15;
  }

  // ── External links (algorithm throttle) ──────────────────────────────
  if (externalLinks.length > 0) {
    issues.push({
      severity: "warning",
      rule: "external-link",
      message: `External link${externalLinks.length > 1 ? "s" : ""} detected: X throttles posts with outbound links.`,
      suggestion:
        "Put the link in a reply instead, or use x.com's native link card. Consider 'link in bio' or 'link in reply'.",
    });
    reachMultiplier *= 0.6;
  }

  // ── Media (positive signal) ──────────────────────────────────────────
  if (input.hasVideo) {
    strengths.push("Video attached — major engagement boost.");
    reachMultiplier *= 1.5;
  } else if (input.hasImage) {
    strengths.push("Image attached — boosts impressions and dwell time.");
    reachMultiplier *= 1.25;
  } else if (!input.isReply) {
    issues.push({
      severity: "info",
      rule: "no-media",
      message: "No media attached — posts with images/video perform significantly better.",
      suggestion: "Attach a photo of the product, behind-the-scenes, or a quick video.",
    });
    reachMultiplier *= 0.85;
  }

  // ── Hashtags ──────────────────────────────────────────────────────────
  if (hashtagCount > 3) {
    issues.push({
      severity: "warning",
      rule: "too-many-hashtags",
      message: `${hashtagCount} hashtags — X treats 3+ hashtags as spam-adjacent.`,
      suggestion: "Use 0-2 relevant hashtags max. Hashtags don't boost reach on X.",
    });
    reachMultiplier *= 0.8;
  } else if (hashtagCount === 0 && !input.isReply) {
    strengths.push("No hashtags — clean and natural (X doesn't reward hashtags).");
  }

  // ── Thread structure ─────────────────────────────────────────────────
  if (input.isThread) {
    strengths.push("Thread format — multi-tweet threads get engagement multiplier.");
    reachMultiplier *= 1.2;
  }

  // ── Reply context ────────────────────────────────────────────────────
  if (input.isReply) {
    strengths.push("Reply format — replying to larger accounts increases discovery.");
    reachMultiplier *= 1.1;
  }

  // ── Emoji usage ──────────────────────────────────────────────────────
  if (emojiCount > 5) {
    issues.push({
      severity: "info",
      rule: "emoji-spam",
      message: `${emojiCount} emojis — can read as spammy if excessive.`,
      suggestion: "1-2 emojis feel natural; more than 5 looks automated.",
    });
    reachMultiplier *= 0.9;
  } else if (emojiCount >= 1 && emojiCount <= 2) {
    strengths.push("Natural emoji usage (1-2).");
  }

  // ── Excessive caps ───────────────────────────────────────────────────
  if (capsIssue) {
    issues.push({
      severity: "warning",
      rule: "all-caps",
      message: "High percentage of capital letters — reads as shouting / spam.",
      suggestion: "Use caps sparingly for emphasis only.",
    });
    reachMultiplier *= 0.8;
  }

  // ── Posting cadence ──────────────────────────────────────────────────
  if (input.recentPostCount24h !== undefined) {
    if (input.recentPostCount24h === 0 && !input.isReply) {
      issues.push({
        severity: "info",
        rule: "cold-start",
        message: "No posts in 24h — the algorithm favors accounts that post consistently.",
        suggestion: "Post 2-3 times daily for steady reach.",
      });
    } else if (input.recentPostCount24h > 10) {
      issues.push({
        severity: "warning",
        rule: "over-posting",
        message: `${input.recentPostCount24h} posts in 24h — bursts trigger spam detection.`,
        suggestion: "Space posts at least 2-3 hours apart.",
      });
      reachMultiplier *= 0.75;
    } else if (input.recentPostCount24h >= 2 && input.recentPostCount24h <= 5) {
      strengths.push("Healthy posting cadence (2-5 posts in 24h).");
      reachMultiplier *= 1.1;
    }
  }

  // ── Question / engagement hook ───────────────────────────────────────
  if (/\?$/.test(text.trim()) || /\?\s/.test(text)) {
    strengths.push("Contains a question — drives replies (highest-weighted engagement).");
    reachMultiplier *= 1.1;
  }

  // ── Call to action ───────────────────────────────────────────────────
  const ctaWords = /\b(order|visit|come|try|stop by|link|check|today|now|here)\b/i;
  if (ctaWords.test(text)) {
    strengths.push("Has a call-to-action — improves conversion from reach.");
  }

  // ── Score calculation ────────────────────────────────────────────────
  // Clamp multiplier to reasonable bounds, then convert to 0-100 score.
  const clampedMult = Math.max(0.1, Math.min(2.0, reachMultiplier));
  const score = Math.round(Math.min(100, clampedMult * 50));

  let verdict: XValidationResult["verdict"];
  if (score >= 75) verdict = "excellent";
  else if (score >= 55) verdict = "good";
  else if (score >= 35) verdict = "fair";
  else verdict = "poor";

  return {
    score,
    verdict,
    issues: issues.sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 };
      return rank[a.severity] - rank[b.severity];
    }),
    strengths,
    estimatedReachMultiplier: Math.round(clampedMult * 100) / 100,
    characterCount: charCount,
    hasMedia,
    hasExternalLink: externalLinks.length > 0,
    hashtagCount,
  };
}

// ── General platform validators ─────────────────────────────────────────

export interface PlatformLimits {
  maxChars: number;
  maxHashtags: number;
  maxImages: number;
  supportsVideo: boolean;
}

export const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  twitter: { maxChars: 280, maxHashtags: 3, maxImages: 4, supportsVideo: true },
  instagram: { maxChars: 2200, maxHashtags: 30, maxImages: 10, supportsVideo: true },
  facebook: { maxChars: 63206, maxHashtags: 10, maxImages: 10, supportsVideo: true },
  tiktok: { maxChars: 2200, maxHashtags: 8, maxImages: 0, supportsVideo: true },
  bluesky: { maxChars: 300, maxHashtags: 5, maxImages: 4, supportsVideo: true },
  youtube: { maxChars: 5000, maxHashtags: 15, maxImages: 0, supportsVideo: true },
};

export interface GenericValidationResult {
  valid: boolean;
  issues: { rule: string; message: string; severity: "error" | "warning" }[];
  characterCount: number;
  hashtagCount: number;
}

export function validateGenericPost(
  text: string,
  platform: string,
  hasMedia = false
): GenericValidationResult {
  const limits = PLATFORM_LIMITS[platform];
  if (!limits) {
    return { valid: true, issues: [], characterCount: text.length, hashtagCount: countHashtags(text) };
  }

  const issues: GenericValidationResult["issues"] = [];
  const charCount = text.length;
  const tagCount = countHashtags(text);

  if (charCount > limits.maxChars) {
    issues.push({
      rule: "char-limit",
      message: `${charCount}/${limits.maxChars} characters — exceeds limit.`,
      severity: "error",
    });
  }

  if (tagCount > limits.maxHashtags) {
    issues.push({
      rule: "hashtag-limit",
      message: `${tagCount} hashtags — max ${limits.maxHashtags} recommended for ${platform}.`,
      severity: "warning",
    });
  }

  if (platform === "instagram" && !hasMedia) {
    issues.push({
      rule: "no-media",
      message: "Instagram posts require an image or video.",
      severity: "error",
    });
  }

  if (platform === "tiktok" && !hasMedia) {
    issues.push({
      rule: "no-video",
      message: "TikTok posts require a video.",
      severity: "error",
    });
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    characterCount: charCount,
    hashtagCount: tagCount,
  };
}
