/**
 * OpenAI-backed caption generator for the content-drop pipeline.
 *
 * Returns a CaptionFn compatible with buildDraftsFromDrop(). Uses a vision-capable
 * chat model so the dropped image itself informs the copy. Fails soft: any error
 * (no key, network, bad response) throws so the pipeline falls back to its
 * deterministic brand template — captions are never blocking.
 */

import type { CaptionFn, DropPlatform } from "../content-drop";

const BRAND_SYSTEM = `You write social copy for Kynda Coffee, a specialty coffee shop in Horseshoe Bay, Texas.
Voice: warm, grounded, a little poetic but never pretentious. "Kynda" comes from Old Norse "to kindle a fire."
Avoid hashtags (they are added separately). Avoid emoji spam — at most one or two, only if natural.
Write copy that makes a local want to walk in and a traveler want to detour. No fabricated claims.`;

function platformBrief(platform: DropPlatform, maxChars: number): string {
  switch (platform) {
    case "twitter":
      return `Platform: X/Twitter. Keep it under ${Math.min(240, maxChars)} characters, punchy, one idea.`;
    case "instagram":
      return `Platform: Instagram. 2-4 short lines, inviting, scannable. Under ${maxChars} chars.`;
    case "facebook":
      return `Platform: Facebook. Friendly and a touch more informative, 2-3 sentences. Under ${maxChars} chars.`;
    case "tiktok":
      return `Platform: TikTok caption. Casual, hooky, trend-aware. Under ${maxChars} chars.`;
  }
}

export function createOpenAICaptionFn(model = "gpt-4o-mini"): CaptionFn {
  return async ({ platform, rules, input }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const userText = [
      platformBrief(platform, rules.maxChars),
      input.title ? `Featured item: ${input.title}.` : "",
      input.notes ? `Owner notes: ${input.notes}.` : "",
      "Write ONLY the caption text, nothing else.",
    ]
      .filter(Boolean)
      .join("\n");

    const content: Array<Record<string, unknown>> = [{ type: "text", text: userText }];
    if (input.imageUrl) {
      content.push({ type: "image_url", image_url: { url: input.imageUrl } });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: BRAND_SYSTEM },
          { role: "user", content },
        ],
        max_tokens: 320,
        temperature: 0.8,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI caption failed: ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("empty caption");
    return text.trim();
  };
}
