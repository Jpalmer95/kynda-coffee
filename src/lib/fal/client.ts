// FAL.ai client for AI image generation
// Used by the Design Studio to generate merch designs

const FAL_API = "https://queue.fal.run";

interface GenerationResult {
  images: { url: string; width: number; height: number }[];
}

/** Generate an image from a text prompt */
export async function generateDesign(prompt: string, options?: {
  style_preset?: string;
  width?: number;
  height?: number;
  num_images?: number;
}): Promise<GenerationResult> {
  const { style_preset, width = 1024, height = 1024, num_images = 1 } = options ?? {};

  // Submit to FAL queue
  const submitRes = await fetch(`${FAL_API}/fal-ai/flux/dev`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: style_preset ? `${prompt}, ${style_preset} style` : prompt,
      image_size: { width, height },
      num_images,
      enable_safety_checker: true,
    }),
  });

  if (!submitRes.ok) {
    throw new Error(`FAL submit failed: ${submitRes.status}`);
  }

  const { request_id } = await submitRes.json();

  // Poll for result
  let attempts = 0;
  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 2000)); // 2s between polls

    const statusRes = await fetch(`${FAL_API}/fal-ai/flux/dev/requests/${request_id}`, {
      headers: { Authorization: `Key ${process.env.FAL_KEY}` },
    });

    const status = await statusRes.json();

    if (status.status === "COMPLETED") {
      return { images: status.images };
    }

    if (status.status === "FAILED") {
      throw new Error("Image generation failed");
    }

    attempts++;
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
