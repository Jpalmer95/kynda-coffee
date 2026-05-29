/**
 * Content moderation client for Kynda Coffee Design Studio.
 *
 * Uses OpenAI Moderation API for text prompts (free, fast).
 * Printful has its own moderation layer that rejects inappropriate
 * designs at production time — this is our first-pass gate.
 *
 * Requires: OPENAI_API_KEY in Coolify env
 */

interface ModerationCategory {
  hate: number;
  "hate/threatening": number;
  harassment: number;
  "harassment/threatening": number;
  "self-harm": number;
  "self-harm/intent": number;
  "self-harm/instructions": number;
  sexual: number;
  "sexual/minors": number;
  violence: number;
  "violence/graphic": number;
}

interface ModerationResult {
  flagged: boolean;
  categories: Partial<ModerationCategory>;
  category_scores: Partial<ModerationCategory>;
}

interface ModerationResponse {
  safe: boolean;
  flagged_categories: string[];
  details?: ModerationResult;
}

const UNSAFE_CATEGORIES = [
  "hate",
  "hate/threatening",
  "harassment/threatening",
  "self-harm",
  "self-harm/intent",
  "self-harm/instructions",
  "sexual/minors",
  "violence/graphic",
] as const;

// Moderate text content (prompts, design names, etc.)
export async function moderateText(input: string): Promise<ModerationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // No key = skip moderation (not ideal for production, but won't block)
    console.warn("[Moderation] OPENAI_API_KEY not set — skipping text moderation");
    return { safe: true, flagged_categories: [] };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input,
      }),
    });

    if (!res.ok) {
      console.error("[Moderation] API error:", res.status, await res.text());
      // Fail open — don't block the user if moderation API is down
      return { safe: true, flagged_categories: [] };
    }

    const data = await res.json();
    const result: ModerationResult = data.results?.[0];

    if (!result) {
      return { safe: true, flagged_categories: [] };
    }

    const flaggedCategories = UNSAFE_CATEGORIES.filter(
      (cat) => (result.category_scores[cat] ?? 0) > 0.5
    );

    return {
      safe: flaggedCategories.length === 0,
      flagged_categories: flaggedCategories,
      details: result,
    };
  } catch (err) {
    console.error("[Moderation] Error:", err);
    // Fail open
    return { safe: true, flagged_categories: [] };
  }
}

// Moderate an image URL using OpenAI vision model
export async function moderateImage(imageUrl: string): Promise<ModerationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("[Moderation] OPENAI_API_KEY not set — skipping image moderation");
    return { safe: true, flagged_categories: [] };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a content safety reviewer. Analyze this image and respond with ONLY a JSON object: {\"safe\": true/false, \"reason\": \"brief reason if unsafe\"}. The image is a design for custom merchandise (t-shirt, mug, etc.). Flag: explicit nudity, graphic violence, hate symbols, illegal content, CSAM. Everything else is acceptable.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "low" },
              },
              {
                type: "text",
                text: "Is this image safe for custom merchandise?",
              },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      console.error("[Moderation] Vision API error:", res.status);
      return { safe: true, flagged_categories: [] };
    }

    const data = await res.json();
    const response = data.choices?.[0]?.message?.content;

    if (response) {
      try {
        // Parse the JSON response — handle markdown code fences
        const cleaned = response.replace(/```json?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return {
          safe: parsed.safe !== false,
          flagged_categories: parsed.safe === false ? [parsed.reason || "flagged"] : [],
        };
      } catch {
        // If we can't parse the response, assume safe
        return { safe: true, flagged_categories: [] };
      }
    }

    return { safe: true, flagged_categories: [] };
  } catch (err) {
    console.error("[Moderation] Vision error:", err);
    return { safe: true, flagged_categories: [] };
  }
}
