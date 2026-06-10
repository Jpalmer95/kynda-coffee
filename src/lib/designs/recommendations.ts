/**
 * Design Studio recommendation + prompt engine (Roadmap V2 — Epic 8).
 *
 * Pure, unit-testable logic for recommending designs and building brand-aware
 * generation prompts. Powers the studio's "recommended for you" packs across
 * Kynda-brand, local Hill Country, trending, and genre themes (funny/cool/
 * sporty/etc.), plus turns a user idea into a high-quality FLUX prompt.
 */

export type DesignTheme =
  | "kynda-brand"
  | "local"
  | "trending"
  | "memes"
  | "seasonal"
  | "funny"
  | "cool"
  | "sporty"
  | "minimal"
  | "nature"
  | "vintage"
  | "typography";

export interface DesignRecommendation {
  theme: DesignTheme;
  label: string;
  /** seed prompts an owner/customer can one-tap generate from */
  prompts: string[];
  description: string;
}

const KYNDA_BRAND_CONTEXT =
  "Kynda Coffee, specialty coffee roaster in Horseshoe Bay Texas Hill Country, warm charcoal and rust palette, artisan, Old Norse heritage (kynda = to kindle a fire)";

/** Curated recommendation packs. Owner-extendable; non-Kynda themes included per owner ask. */
export const DESIGN_RECOMMENDATIONS: DesignRecommendation[] = [
  {
    theme: "kynda-brand",
    label: "Kynda Brand",
    description: "On-brand Kynda Coffee designs — our logo, palette, and Hill Country roots.",
    prompts: [
      "Kynda Coffee logo badge, kindled flame motif, charcoal and rust, clean vector",
      "Hand-drawn coffee cup with rising steam forming a small flame, minimal line art",
      "‘Kindle Your Morning’ bold serif typography with a coffee bean flourish",
    ],
  },
  {
    theme: "local",
    label: "Local Hill Country",
    description: "Horseshoe Bay & Texas Hill Country pride.",
    prompts: [
      "Texas Hill Country sunrise over Lake LBJ, live oaks, warm rustic illustration",
      "Horseshoe Bay map pin with coffee bean, vintage travel-poster style",
      "Bluebonnets and a coffee cup, watercolor Texas spring scene",
    ],
  },
  {
    theme: "trending",
    label: "Trending Now",
    description: "Globally trending styles refreshed for merch.",
    prompts: [
      "Retro 70s groovy coffee lettering, earthy palette, sticker style",
      "Y2K chrome coffee cup, glossy 3D render, playful",
      "Cottagecore coffee morning, soft pastel hand-drawn illustration",
    ],
  },
  {
    theme: "memes",
    label: "Memes",
    description: "Internet-famous coffee energy — meme-style sticker graphics.",
    prompts: [
      "‘This is Fine’ style cartoon dog sipping coffee in a cozy café, meme sticker",
      "Distracted-boyfriend style meme: person ignoring ‘sleep’ to look at ‘one more espresso’, flat cartoon",
      "Grumpy cat face with ‘Mondays Need a Double Shot’ bold meme text, sticker style",
      "Doge-style shiba inu with coffee cup, ‘much caffeine, very wow’ comic sans energy, meme sticker",
    ],
  },
  {
    theme: "seasonal",
    label: "Seasonal",
    description: "Rotating seasonal designs — refreshed for the current season.",
    prompts: [
      "Iced coffee in golden summer light, lake day vibes, retro summer badge",
      "Pumpkin spice latte with autumn leaves, cozy fall illustration",
      "Hot cocoa-style winter coffee mug with snowflakes, festive knit pattern border",
      "Spring bluebonnets wreathing a coffee cup, fresh pastel watercolor",
    ],
  },
  {
    theme: "funny",
    label: "Funny",
    description: "Witty coffee humor.",
    prompts: [
      "‘But First, Coffee’ bold comic lettering with a sleepy cartoon bean",
      "‘Decaf is a Mistake’ tongue-in-cheek vintage badge",
      "Cartoon coffee cup with googly eyes, ‘Espresso Yourself’ pun",
    ],
  },
  {
    theme: "cool",
    label: "Cool / Streetwear",
    description: "Bold streetwear-inspired graphics.",
    prompts: [
      "Streetwear coffee graphic, bold graffiti lettering, high contrast monochrome",
      "Minimal techno coffee bean emblem, neon accents on black",
      "Skate-style coffee cup mascot, thick outlines, sticker bomb",
    ],
  },
  {
    theme: "sporty",
    label: "Sporty",
    description: "Athletic, energetic designs.",
    prompts: [
      "Varsity athletic ‘KYNDA’ collegiate lettering, bold block style",
      "Running silhouette fueled by coffee, dynamic energy lines",
      "Coffee as pre-workout, gym-style bold badge",
    ],
  },
];

export function getRecommendation(theme: DesignTheme): DesignRecommendation | undefined {
  return DESIGN_RECOMMENDATIONS.find((r) => r.theme === theme);
}

/** Quality + safety suffix applied to every generation for print-ready output. */
const PRINT_QUALITY_SUFFIX =
  "high quality, print-ready, centered composition, transparent or clean background, vector-friendly, no watermark, no text artifacts";

export interface BuildPromptOptions {
  /** user's idea / freeform prompt */
  idea: string;
  /** optional theme to bias styling */
  theme?: DesignTheme;
  /** style preset key (KYND_STYLE_PRESETS) or freeform style words */
  style?: string;
  /** if true, weave in Kynda brand context */
  brandAware?: boolean;
}

/**
 * Compose a final generation prompt. Brand-aware mode injects Kynda context;
 * theme adds genre styling; always ends with the print-quality suffix so output
 * is usable on merch.
 */
export function buildGenerationPrompt(opts: BuildPromptOptions): string {
  const parts: string[] = [opts.idea.trim()];
  if (opts.theme) {
    const rec = getRecommendation(opts.theme);
    if (rec && opts.theme !== "kynda-brand") parts.push(`${rec.label.toLowerCase()} style`);
  }
  if (opts.brandAware) parts.push(KYNDA_BRAND_CONTEXT);
  if (opts.style && opts.style.trim()) parts.push(opts.style.trim());
  parts.push(PRINT_QUALITY_SUFFIX);
  // de-dupe and join
  return Array.from(new Set(parts.filter(Boolean))).join(", ");
}

/** Recommend themes for a customer given light signals (brand affinity, season). */
export function recommendThemes(signals?: { brandFan?: boolean; season?: string }): DesignTheme[] {
  const themes: DesignTheme[] = [];
  if (signals?.brandFan) themes.push("kynda-brand");
  themes.push("seasonal", "trending", "memes", "local");
  // seasonal nudge
  const season = (signals?.season ?? "").toLowerCase();
  if (season.includes("fall") || season.includes("winter")) themes.push("vintage");
  themes.push("funny", "cool", "sporty");
  // unique, capped at 8
  return Array.from(new Set(themes)).slice(0, 8);
}
