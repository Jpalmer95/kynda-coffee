import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, email, event_date, guests, details } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin().from("catering_requests").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      event_date: event_date || null,
      guest_count: guests ? Number(guests) : null,
      details: details?.trim() || "",
      status: "pending",
    });

    if (error) {
      console.error("Catering submission error:", error);
      return NextResponse.json(
        { error: "Failed to submit request. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Catering request submitted! We'll be in touch soon." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Catering route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
