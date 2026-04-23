import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "KYN-";
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount_cents, recipient_email, message } = body;

    if (!amount_cents || amount_cents < 500) {
      return NextResponse.json({ error: "Minimum gift card amount is $5" }, { status: 400 });
    }

    const code = generateCode();

    const { data: giftCard, error } = await supabaseAdmin()
      .from("gift_cards")
      .insert({
        code,
        amount_cents,
        balance_cents: amount_cents,
        recipient_email,
        message,
        status: "active",
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
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/gift-cards/success?code=${code}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/gift-cards?canceled=true`,
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
