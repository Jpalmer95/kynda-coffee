/**
 * Configurable Vision Language Model (VLM) provider for image analysis.
 *
 * Supports three provider types:
 * 1. "huggingface" — HF inference router (OpenAI-compatible), free tier available
 * 2. "local" — Local LM Studio / Ollama / any OpenAI-compatible local server
 * 3. "custom" — Any OpenAI-compatible API endpoint
 *
 * Config is stored in store_settings.settings_json.vlm
 * Falls back to env vars (HF_TOKEN, VLM_*) if no DB config.
 */

export interface VlmConfig {
  provider: "huggingface" | "local" | "custom";
  model: string;
  api_base: string;
  api_key: string;
}

/** Default config — tries HF first, falls back to local LM Studio. */
export function getDefaultVlmConfig(): VlmConfig {
  // Check for local LM Studio (common dev setup)
  const localUrl = process.env.LM_STUDIO_URL || "http://127.0.0.1:1234/v1";
  const hfToken = process.env.HF_TOKEN;

  if (hfToken) {
    return {
      provider: "huggingface",
      model: "Qwen/Qwen3-VL-8B-Instruct",
      api_base: "https://router.huggingface.co/v1",
      api_key: hfToken,
    };
  }

  // Fall back to local LM Studio (works when at home)
  return {
    provider: "local",
    model: "qwen3-vl-8b-instruct",
    api_base: localUrl,
    api_key: "lm-studio",
  };
}

/** Popular VLM models available on HF inference providers. */
export const HF_VLM_MODELS = [
  { id: "Qwen/Qwen3-VL-8B-Instruct", label: "Qwen3 VL 8B (Novita, free-friendly)" },
  { id: "Qwen/Qwen3-VL-30B-A3B-Instruct", label: "Qwen3 VL 30B MoE (Novita)" },
  { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", label: "Llama 4 Scout 17B (Groq)" },
  { id: "google/gemma-3-12b-it", label: "Gemma 3 12B (Featherless)" },
  { id: "google/gemma-3-4b-it", label: "Gemma 3 4B (Featherless, lightweight)" },
  { id: "moonshotai/Kimi-K2.5", label: "Kimi K2.5 (Novita, large)" },
];

/**
 * Fetch the VLM config from the DB settings, falling back to env defaults.
 * Accepts the supabaseAdmin client to avoid circular imports.
 */
export async function getVlmConfig(
  db: ReturnType<typeof import("@/lib/supabase/admin").supabaseAdmin>
): Promise<VlmConfig> {
  try {
    const { data } = await db
      .from("store_settings")
      .select("settings_json")
      .eq("id", 1)
      .single();

    const vlm = (data?.settings_json as Record<string, unknown>)?.vlm;
    if (vlm && typeof vlm === "object") {
      const cfg = vlm as Record<string, string>;
      if (cfg.provider && cfg.model && cfg.api_base) {
        return {
          provider: cfg.provider as VlmConfig["provider"],
          model: cfg.model,
          api_base: cfg.api_base,
          api_key: cfg.api_key || "",
        };
      }
    }
  } catch {
    // DB may not have settings yet
  }

  return getDefaultVlmConfig();
}

export interface AltTextResult {
  alt_text: string;
  descriptive_caption: string;
  subjects: string[];
  colors: string[];
  setting: string;
  suggested_hashtags: string[];
  brightness: string;
  quality_notes: string;
}

const FALLBACK: AltTextResult = {
  alt_text: "Marketing image",
  descriptive_caption: "",
  subjects: [],
  colors: [],
  setting: "unknown",
  suggested_hashtags: [],
  brightness: "normal",
  quality_notes: "AI analysis unavailable",
};

const ALT_TEXT_PROMPT = `Analyze this marketing image for Kynda Coffee (a specialty coffee shop in Horseshoe Bay, Texas). Return ONLY a JSON object with exactly these fields, no markdown, no explanation:

{
  "alt_text": "Concise alt text for accessibility (max 125 characters, describe key visual elements only, no promotional language)",
  "descriptive_caption": "A 1-2 sentence engaging description suitable for social media captions. Warm, craft-focused tone.",
  "subjects": ["list of key subjects/objects visible in the image"],
  "colors": ["dominant colors in the image"],
  "setting": "indoor/outdoor/studio/etc",
  "suggested_hashtags": ["5-8 relevant hashtags for this specific image content"],
  "brightness": "dark/normal/bright",
  "quality_notes": "any quality observations (sharp, blurry, well-lit, etc.)"
}`;

/**
 * Call a vision-language model via OpenAI-compatible chat completions API.
 * Works with Hugging Face router, LM Studio, Ollama, OpenAI, etc.
 */
export async function generateAltText(
  config: VlmConfig,
  imageUrl: string
): Promise<AltTextResult> {
  const response = await fetch(`${config.api_base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + config.api_key,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ALT_TEXT_PROMPT },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new VlmError(response.status, errText, config.provider);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";

  // Parse JSON from the response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AltTextResult;
    }
  } catch {
    // fall through to fallback
  }

  return {
    ...FALLBACK,
    alt_text: text.slice(0, 125) || FALLBACK.alt_text,
    descriptive_caption: text.slice(0, 300),
  };
}

/** Custom error class with provider info for better messages. */
export class VlmError extends Error {
  status: number;
  provider: string;
  constructor(status: number, body: string, provider: string) {
    super(`VLM ${status} from ${provider}: ${body.slice(0, 200)}`);
    this.status = status;
    this.provider = provider;
  }
}
