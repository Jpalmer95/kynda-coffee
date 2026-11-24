import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { generateSecureCode } from "@/lib/auth/security";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, { identifier: "gift-card-create", windowMs: 60_000, maxRequests: 5 });
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
      );
    }
    const body = await req.json();
    const { amount_cents, recipient_email, message } = body;

    if (
      typeof amount_cents !== "number" ||
      !Number.isInteger(amount_cents) ||
      amount_cents < 500 ||
      amount_cents > 50000
    ) {
      return NextResponse.json(
        { error: "Gift card amount must be a whole-cent amount between $5 and $500" },
        { status: 400 }
      );
    }

    const cleanRecipientEmail =
      typeof recipient_email === "string" && recipient_email.trim()
        ? recipient_email.trim().slice(0, 160)
        : null;
    if (cleanRecipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipientEmail)) {
      return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 });
    }
    const cleanMessage =
      typeof message === "string" && message.trim() ? message.trim().slice(0, 500) : null;

    const code = generateSecureCode("KYN-", 12);
    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://kyndacoffee.com";

    // Created as pending_payment; the Stripe webhook flips it to active when
    // checkout completes, so an abandoned checkout never yields a spendable card.
    const { data: giftCard, error } = await supabaseAdmin()
      .from("gift_cards")
      .insert({
        code,
        amount_cents,
        balance_cents: amount_cents,
        recipient_email: cleanRecipientEmail,
        message: cleanMessage,
        status: "pending_payment",
      })
      .select()
      .single();

    if (error || !giftCard) {
      console.error("Gift card create error:", error);
      return NextResponse.json({ error: "Failed to create gift card" }, { status: 500 });
    }

    const stripeClient = stripe();
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Kynda Coffee Gift Card — $${(amount_cents / 100).toFixed(0)}`,
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/gift-cards/success?code=${code}`,
      cancel_url: `${siteUrl}/gift-cards?canceled=true`,
      metadata: {
        gift_card_id: giftCard.id,
        code,
      },
    });

    await supabaseAdmin()
      .from("gift_cards")
      .update({ stripe_payment_intent_id: session.payment_intent as string })
      .eq("id", giftCard.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Gift card creation error:", err);
    return NextResponse.json({ error: "Failed to create gift card" }, { status: 500 });
  }
}
