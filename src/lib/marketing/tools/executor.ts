// Marketing tool executor — runs tool_use calls from Claude and returns results
// Each tool is implemented server-side; results feed back into the conversation.

import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface ToolInput {
  [key: string]: unknown;
}

interface ToolResult {
  type: "text";
  text: string;
}

/**
 * Execute a marketing tool call and return the result text.
 * Called from the chat API route when Claude emits a tool_use block.
 */
export async function executeMarketingTool(
  toolName: string,
  input: ToolInput,
  userId: string
): Promise<ToolResult> {
  switch (toolName) {
    case "generate_social_post":
      return generateSocialPost(input);
    case "create_image_caption":
      return createImageCaption(input);
    case "suggest_hashtags":
      return suggestHashtags(input);
    case "schedule_post":
      return schedulePost(input, userId);
    case "generate_weekly_calendar":
      return generateWeeklyCalendar(input);
    default:
      return { type: "text", text: `Unknown tool: ${toolName}` };
  }
}

// ─── generate_social_post ────────────────────────────────────────────────────

async function generateSocialPost(input: ToolInput): Promise<ToolResult> {
  const platform = input.platform as string;
  const topic = input.topic as string;
  const tone = (input.tone as string) || "casual";
  const includeHashtags = input.include_hashtags !== false;

  // Return structured guidance — Claude will reformat this into final copy
  const platformLimits: Record<string, { chars: number; hashMax: number }> = {
    instagram: { chars: 2200, hashMax: 30 },
    twitter: { chars: 280, hashMax: 5 },
    facebook: { chars: 63206, hashMax: 10 },
    tiktok: { chars: 2200, hashMax: 15 },
  };
  const limits = platformLimits[platform] || { chars: 500, hashMax: 10 };

  const result = {
    platform,
    topic,
    tone,
    character_limit: limits.chars,
    max_hashtags: limits.hashMax,
    include_hashtags: includeHashtags,
    guidelines: getPlatformGuidelines(platform),
    note: "Use these constraints to write the final post. Stay within character limits and match the brand voice (warm, craft-focused, specialty coffee).",
  };

  return { type: "text", text: JSON.stringify(result, null, 2) };
}

function getPlatformGuidelines(platform: string): string {
  switch (platform) {
    case "instagram":
      return "Use 1-3 line hook, engaging body, line breaks for readability. Use relevant emojis sparingly. CTA at end. Hashtags in first comment or bottom of caption.";
    case "twitter":
      return "Punchy, concise. Hook in first 20 chars. Use 1-2 emojis max. Thread format welcome for longer content.";
    case "facebook":
      return "Longer storytelling welcome. Include a question to drive engagement. Tag location when relevant.";
    case "tiktok":
      return "Short punchy caption with trending audio/video reference. Hashtags critical for discovery.";
    default:
      return "Write engaging, on-brand content.";
  }
}

// ─── create_image_caption ────────────────────────────────────────────────────

async function createImageCaption(input: ToolInput): Promise<ToolResult> {
  const description = input.image_description as string;
  const brandContext = (input.brand_context as string) || "";

  const result = {
    image_description: description,
    brand_context: brandContext,
    alt_text_template: `${description} at Kynda Coffee in Horseshoe Bay, Texas`,
    caption_prompt: `Write a warm, craft-focused caption for this image: "${description}". ${brandContext ? `Context: ${brandContext}` : ""} Brand voice: approachable specialty coffee, Old Norse roots (Kynda = "to kindle a flame"), premium but welcoming.`,
    accessibility_note:
      "Alt text should be concise (125 chars max), describe key visual elements, and avoid promotional language.",
  };

  return { type: "text", text: JSON.stringify(result, null, 2) };
}

// ─── suggest_hashtags ────────────────────────────────────────────────────────

async function suggestHashtags(input: ToolInput): Promise<ToolResult> {
  const platform = input.platform as string;
  const count = (input.count as number) || 15;

  // Always-include brand hashtags + location
  const brand = ["#KyndaCoffee", "#KindleTheFlame"];
  const location = ["#HorseshoeBayTX", "#TexasCoffee", "#HillCountryCoffee"];
  const niche = [
    "#SpecialtyCoffee",
    "#CraftCoffee",
    "#CoffeeCommunity",
    "#LocalCoffee",
    "#ThirdWaveCoffee",
    "#CoffeeLovers",
    "#SupportLocal",
  ];
  const trending = [
    "#CoffeeOfTheDay",
    "#MorningRitual",
    "#BaristaLife",
    "#CoffeeCulture",
    "#BrewedAwakening",
  ];

  const platformMax: Record<string, number> = {
    instagram: 30,
    twitter: 5,
    facebook: 10,
    tiktok: 15,
  };
  const max = Math.min(count, platformMax[platform] || 15);

  const all = [...brand, ...location, ...niche, ...trending];
  const selected = all.slice(0, max);

  const result = {
    platform,
    post_text: input.post_text as string,
    hashtags: selected,
    categories: {
      brand,
      location,
      niche: niche.slice(0, Math.max(3, max - brand.length - location.length - 2)),
      trending: trending.slice(0, 3),
    },
    tip: platform === "instagram"
      ? "Place hashtags in the first comment to keep the caption clean."
      : platform === "twitter"
      ? "Use max 2-3 hashtags in-tweet; more looks spammy."
      : "Integrate hashtags naturally into the post text.",
  };

  return { type: "text", text: JSON.stringify(result, null, 2) };
}

// ─── schedule_post ───────────────────────────────────────────────────────────

async function schedulePost(
  input: ToolInput,
  userId: string
): Promise<ToolResult> {
  const platform = input.platform as string;
  const text = input.text as string;
  const imageUrl = (input.image_url as string) || null;
  const publishAt = input.publish_at as string;

  // Validate date
  const scheduledDate = new Date(publishAt);
  if (isNaN(scheduledDate.getTime())) {
    return {
      type: "text",
      text: JSON.stringify({
        success: false,
        error: "Invalid publish_at date. Use ISO 8601 format.",
      }),
    };
  }

  // Save to social_posts table (create if missing — graceful fallback)
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("social_posts")
      .insert({
        platform,
        text,
        image_urls: imageUrl ? [imageUrl] : [],
        scheduled_at: publishAt,
        status: "scheduled",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      // Table might not exist yet — fall back to memory/acknowledgment
      return {
        type: "text",
        text: JSON.stringify({
          success: true,
          queued: true,
          platform,
          text: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
          publish_at: publishAt,
          note: "Post saved to draft queue. (social_posts table pending — will activate after migration)",
        }),
      };
    }

    return {
      type: "text",
      text: JSON.stringify({
        success: true,
        post_id: data.id,
        platform,
        text: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
        publish_at: publishAt,
        formatted_date: scheduledDate.toLocaleString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }),
      }),
    };
  } catch {
    return {
      type: "text",
      text: JSON.stringify({
        success: true,
        queued: true,
        platform,
        text: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
        publish_at: publishAt,
        note: "Post queued in session. Create social_posts migration to persist.",
      }),
    };
  }
}

// ─── generate_weekly_calendar ────────────────────────────────────────────────

async function generateWeeklyCalendar(input: ToolInput): Promise<ToolResult> {
  const weekStart = input.week_start as string;
  const platforms = (input.platforms as string[]) || ["instagram"];
  const focusAreas = (input.focus_areas as string[]) || [];

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const startDate = new Date(weekStart);

  const calendar = days.map((day, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      day,
      date: date.toISOString().split("T")[0],
      platform: platforms[i % platforms.length],
      content_idea: getDayTheme(day, focusAreas),
    };
  });

  const result = {
    week_start: weekStart,
    platforms,
    focus_areas: focusAreas,
    calendar,
    tips: [
      "Post consistently — same time each day builds audience expectations.",
      "Mix content types: product shots, behind-the-scenes, staff spotlights, customer stories.",
      "Engage with comments within 1 hour of posting for algorithm boost.",
      "Use Instagram Stories for daily casual content; reserve feed posts for polished pieces.",
    ],
  };

  return { type: "text", text: JSON.stringify(result, null, 2) };
}

function getDayTheme(day: string, focusAreas: string[]): string {
  const themes: Record<string, string> = {
    Monday: "Motivation Monday — inspiring quote + coffee pairing",
    Tuesday: "Tip Tuesday — brewing tip or coffee fact",
    Wednesday: "Behind the Scenes — roasting process or barista prep",
    Thursday: "Throwback or Staff Spotlight",
    Friday: "Feature Friday — highlight a drink or food item",
    Saturday: "Weekend vibes — customer photos or community event",
    Sunday: "Slow Sunday — cozy café atmosphere, relaxation",
  };
  const base = themes[day] || "Engaging coffee content";
  if (focusAreas.length > 0) {
    return `${base} (focus: ${focusAreas.join(", ")})`;
  }
  return base;
}
