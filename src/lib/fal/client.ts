// FAL.ai client for AI image generation
// Used by the Design Studio to generate merch designs

const FAL_QUEUE = "https://queue.fal.run";

// Default model. Override with FAL_IMAGE_MODEL env (e.g. "fal-ai/recraft-v3"
// which excels at vector/typography merch art, or "fal-ai/flux-pro/v1.1").
const DEFAULT_MODEL = "fal-ai/flux/dev";

interface GenerationResult {
  images: { url: string; width: number; height: number }[];
}

/** Build the model-specific input payload. */
function buildInput(model: string, prompt: string, width: number, height: number, numImages: number) {
  if (model.includes("recraft")) {
    // Recraft v3: great for flat vector / typography merch designs
    return {
      prompt,
      image_size: { width, height },
      style: "vector_illustration",
    };
  }
  // FLUX family
  return {
    prompt,
    image_size: { width, height },
    num_images: numImages,
    enable_safety_checker: true,
  };
}

/**
 * Generate an image from a text prompt via the FAL queue API.
 *
 * Correct queue flow (https://fal.ai/docs/model-apis/inference/queue):
 *   1. POST  queue.fal.run/{model}                 → { request_id, status_url, response_url }
 *   2. GET   {status_url}                          → { status: IN_QUEUE | IN_PROGRESS | COMPLETED }
 *   3. GET   {response_url} (once COMPLETED)       → model output ({ images: [...] })
 *
 * NOTE: the response endpoint does NOT return a `status` field — polling it
 * and checking `status === "COMPLETED"` never succeeds (the original bug that
 * made every generation "time out").
 */
export async function generateDesign(prompt: string, options?: {
  style_preset?: string;
  width?: number;
  height?: number;
  num_images?: number;
}): Promise<GenerationResult> {
  const { style_preset, width = 1024, height = 1024, num_images = 1 } = options ?? {};
  const model = process.env.FAL_IMAGE_MODEL || DEFAULT_MODEL;

  const fullPrompt = style_preset ? `${prompt}, ${style_preset} style` : prompt;

  // 1) Submit to the queue
  const submitRes = await fetch(`${FAL_QUEUE}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildInput(model, fullPrompt, width, height, num_images)),
  });

  if (!submitRes.ok) {
    const errBody = await submitRes.text().catch(() => "");
    throw new Error(`FAL submit failed: ${submitRes.status} ${errBody.slice(0, 200)}`);
  }

  const submit = await submitRes.json();
  const requestId: string = submit.request_id;
  const statusUrl: string = submit.status_url || `${FAL_QUEUE}/${model}/requests/${requestId}/status`;
  const responseUrl: string = submit.response_url || `${FAL_QUEUE}/${model}/requests/${requestId}`;

  // 2) Poll the STATUS endpoint until COMPLETED (~2s interval, 2 min cap)
  const headers = { Authorization: `Key ${process.env.FAL_KEY}` };
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusRes = await fetch(statusUrl, { headers });
    if (!statusRes.ok) continue; // transient — keep polling

    const status = await statusRes.json();

    if (status.status === "COMPLETED") {
      // 3) Fetch the actual result from the response endpoint
      const resultRes = await fetch(responseUrl, { headers });
      if (!resultRes.ok) {
        throw new Error(`FAL result fetch failed: ${resultRes.status}`);
      }
      const result = await resultRes.json();
      if (!result.images?.length) {
        throw new Error("FAL returned no images");
      }
      return { images: result.images };
    }

    if (status.status === "FAILED" || status.error) {
      throw new Error(`Image generation failed: ${status.error || "unknown error"}`);
    }
  }

  throw new Error("Image generation timed out");
}

/** Style presets for Kynda merch */
export const KYND_STYLE_PRESETS = {
  "coffee-art": "latte art, coffee beans, warm tones, artisan style",
  "nature-texas": "Texas Hill Country, wildflowers, live oaks, rustic",
  "minimal": "clean lines, minimal design, modern typography, simple",
  "vintage": "retro, vintage coffee poster style, distressed texture",
  "abstract": "abstract art, coffee-inspired colors, artistic patterns",
  "typography": "bold typography, coffee quotes, modern lettering",
} as const;
