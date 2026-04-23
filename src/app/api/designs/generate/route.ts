import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/designs/generate — Generate an AI design image
export async function POST(req: NextRequest) {
  // Rate limit: 10 generations per IP per hour
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, remaining } = checkRateLimit(`designs:${ip}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Generation limit reached. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  try {
    const body = await req.json();
    const { prompt, style_preset, product_type } = body;

    if (!prompt || typeof prompt !== "string" || prompt.length < 3) {
      return NextResponse.json(
        { error: "Prompt is required (min 3 chars)" },
        { status: 400 }
      );
    }

    // Build the full prompt with style and product context
    let fullPrompt = prompt;
    if (style_preset) {
      fullPrompt += `, ${style_preset} style`;
    }

    // Add product-specific framing
    const productContexts: Record<string, string> = {
      mug: "designed for a coffee mug, centered composition, square format",
      tshirt: "designed for a t-shirt print, graphic design, bold colors, centered",
      glass: "designed for a glass cup, elegant, transparent background friendly",
      tote: "designed for a tote bag, graphic illustration style",
      hat: "designed for an embroidered hat patch, simple, bold",
      sticker: "designed for a die-cut sticker, vector art style, bold outlines",
    };

    if (product_type && productContexts[product_type]) {
      fullPrompt += `, ${productContexts[product_type]}`;
    }

    // Submit to FAL.ai FLUX model
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: "FAL_KEY not configured" },
        { status: 500 }
      );
    }

    let imageUrl: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s max

      // Submit generation request
      const submitRes = await fetch("https://queue.fal.run/fal-ai/flux/dev", {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          image_size: "square_hd",
          num_images: 1,
          enable_safety_checker: true,
        }),
        signal: controller.signal,
      });

      if (!submitRes.ok) {
        const err = await submitRes.text();
        console.error("FAL submit error:", submitRes.status, err);
        clearTimeout(timeout);
        throw new Error(`FAL API error: ${submitRes.status}`);
      }

      const { request_id } = await submitRes.json();
      clearTimeout(timeout);

      // Poll for result (up to 30 seconds)
      let attempts = 0;
      while (attempts < 15 && !imageUrl) {
        await new Promise((r) => setTimeout(r, 2000));

        const statusRes = await fetch(
          `https://queue.fal.run/fal-ai/flux/dev/requests/${request_id}`,
          {
            headers: { Authorization: `Key ${falKey}` },
          }
        );

        const status = await statusRes.json();

        if (status.status === "COMPLETED" && status.images?.[0]?.url) {
          imageUrl = status.images[0].url;
        } else if (status.status === "FAILED") {
          throw new Error("Generation failed on FAL");
        }

        attempts++;
      }
    } catch (falError) {
      console.error("FAL generation error:", falError);
      // Fall through to demo mode
    }

    // Demo fallback — generate a placeholder SVG with the prompt text
    if (!imageUrl) {
      const encodedPrompt = encodeURIComponent(prompt.slice(0, 50));
      const colors = ["c4724e", "2c1810", "8b6f4e", "a8b5a0", "c4a882"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const bg = "faf7f2";
      
      imageUrl = `https://placehold.co/1024x1024/${color}/${bg}?text=${encodedPrompt}&font=playfair-display`;
    }

    return NextResponse.json({
      image_url: imageUrl,
      prompt: fullPrompt,
      demo_mode: !process.env.FAL_KEY,
    });
  } catch (err) {
    console.error("Design generation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
