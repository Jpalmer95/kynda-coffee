import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX = 5; // max applications per IP per 15 minutes
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`career-apply:${ip}`, MAX, WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many applications. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { opening_id, opening_title, name, email, phone, cover_letter } = body;

    if (!name || !email || !opening_title) {
      return NextResponse.json(
        { error: "Name, email, and position are required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("job_applications").insert({
      opening_id: opening_id || null,
      opening_title,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      cover_letter: cover_letter?.trim() || null,
      status: "new",
    });

    if (error) {
      console.error("[careers/apply] Supabase insert error:", error);
      return NextResponse.json(
        { error: "Could not save your application. Please email hello@kyndacoffee.com directly." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
