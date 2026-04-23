import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  email: z.string().email(),
  source: z.string().optional().default("website_footer"),
});

export async function POST(req: NextRequest) {
  // Rate limit: 3 subscriptions per IP per hour
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, remaining } = checkRateLimit(`newsletter:${ip}`, 3, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = subscribeSchema.parse(body);

    // Upsert into newsletter_subscribers table
    const { error } = await supabaseAdmin()
      .from("newsletter_subscribers")
      .upsert(
        {
          email: parsed.email.toLowerCase().trim(),
          source: parsed.source,
          subscribed: true,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("Newsletter subscribe error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    console.error("Newsletter error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
