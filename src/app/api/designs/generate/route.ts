import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { deductOneCredit } from '@/lib/designs/credits';

export const dynamic = 'force-dynamic';

// POST /api/designs/generate
// - Authenticated or guest (guests limited by rate limit)
// - Checks monthly free + paid credits
// - Calls FAL Flux
// - Saves design for logged-in users
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, style_preset, product_type = 'mug' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    // 1. Credit / rate-limit gate (logged-in users get 10/month free)
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    const isLoggedIn = !!user;

    let creditsLeft = { free: 0, paid: 0 };
    if (isLoggedIn) {
      const deduct = await deductOneCredit();
      if (!deduct.success) {
        return NextResponse.json(
          { error: 'No credits left. Buy more or upload your own design.' },
          { status: 402 }
        );
      }
      creditsLeft = await getUserCreditsForResponse(user.id);
    }

    // 2. Build rich prompt for Flux
    const fullPrompt = buildFluxPrompt(prompt, style_preset, product_type);

    // 3. Call FAL
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json({ error: 'Generation service unavailable' }, { status: 503 });
    }

    const imageUrl = await generateWithFAL(fullPrompt, falKey);

    // 4. Persist design (authenticated only)
    let designId: string | null = null;
    if (isLoggedIn) {
      const { data: saved } = await supabaseAdmin
        .from('saved_designs')
        .insert({
          user_id: user.id,
          prompt: fullPrompt,
          original_image_url: imageUrl,
          product_type,
          layers: JSON.stringify([
            { type: 'generated', url: imageUrl, x: 0.5, y: 0.5, scale: 0.6, rotation: 0 }
          ]),
        })
        .select('id')
        .single();
      designId = saved?.id ?? null;
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      prompt: fullPrompt,
      design_id: designId,
      credits_remaining: creditsLeft,
    });
  } catch (err: any) {
    console.error('Design generation error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}

function buildFluxPrompt(prompt: string, style: string | null, productType: string): string {
  let p = prompt.trim();
  if (style) p += `, ${style}`;
  const hints: Record<string, string> = {
    mug: 'centered on coffee mug, clean white background, high detail, product mockup',
    tshirt: 'graphic t-shirt design, high contrast, bold, apparel print style',
    glass: 'transparent glass cup overlay, elegant, Starbucks-style latte art',
    tote: 'canvas tote bag graphic, minimalist illustration',
  };
  return p + ', ' + (hints[productType] || 'product mockup');
}

async function generateWithFAL(prompt: string, falKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const submit = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1, enable_safety_checker: true }),
    signal: controller.signal,
  });

  if (!submit.ok) throw new Error(`FAL error ${submit.status}`);
  const { request_id } = await submit.json();
  clearTimeout(timeout);

  // Poll
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 2200));
    const statusRes = await fetch(
      `https://queue.fal.run/fal-ai/flux/dev/requests/${request_id}`,
      { headers: { Authorization: `Key ${falKey}` } }
    );
    const st = await statusRes.json();
    if (st.status === 'COMPLETED' && st.images?.[0]?.url) return st.images[0].url;
    if (st.status === 'FAILED') throw new Error('Generation failed');
  }
  throw new Error('Generation timed out');
}

async function getUserCreditsForResponse(userId: string) {
  const { data } = await supabaseAdmin.rpc('get_or_create_monthly_credits', { p_user_id: userId });
  return { free: data?.free_credits_remaining ?? 0, paid: data?.paid_credits_remaining ?? 0 };
}
