import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt || '';
    const style = body.style_preset || '';
    const productType = body.product_type || 'mug';

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const fullPrompt = `${prompt.trim()}${style ? `, ${style}` : ''}, high quality product mockup`;

    // Always return a nice placeholder for now so the Studio works
    return NextResponse.json({
      success: true,
      image_url: `https://picsum.photos/id/1015/1024/1024`,
      prompt: fullPrompt,
      demo: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
