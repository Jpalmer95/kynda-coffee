import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Loyalty earning rate: 10 points per dollar spent
const POINTS_PER_DOLLAR = 10;

export async function POST(req: NextRequest) {
  if (!endpointSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_email;
  if (!email) {
    console.error("No customer email in session", session.id);
    return;
  }

  const metadata = session.metadata ?? {};
  const subtotalCents = parseInt(metadata.subtotal_cents ?? "0", 10);
  const loyaltyPointsRedeemed = parseInt(metadata.loyalty_points_redeemed ?? "0", 10);
  const loyaltyValueCents = parseInt(metadata.loyalty_value_cents ?? "0", 10);

  // Calculate amount paid (after discounts, loyalty, etc.)
  const amountTotalCents = session.amount_total ?? 0;

  // Find or create customer
  let { data: customer } = await supabaseAdmin()
    .from("customers")
    .select("id, loyalty_points, loyalty_tier, total_spent_cents, total_orders")
    .eq("email", email)
    .single();

  if (!customer) {
    const { data: newCustomer } = await supabaseAdmin()
      .from("customers")
      .insert({
        email,
        loyalty_points: 0,
        loyalty_tier: "bronze",
      })
      .select("id, loyalty_points, loyalty_tier, total_spent_cents, total_orders")
      .single();
    customer = newCustomer;
  }

  if (!customer) {
    console.error("Could not find or create customer for loyalty", email);
    return;
  }

  const currentPoints = customer.loyalty_points ?? 0;
  let newPoints = currentPoints;
  const transactions: Array<{ points: number; type: string; description: string }> = [];

  // Deduct redeemed points
  if (loyaltyPointsRedeemed > 0) {
    newPoints -= loyaltyPointsRedeemed;
    transactions.push({
      points: -loyaltyPointsRedeemed,
      type: "redeemed",
      description: `Redeemed ${loyaltyPointsRedeemed} points at checkout`,
    });
  }

  // Award earned points based on amount actually paid (net of discounts)
  // We use amount_total because that's what the customer actually paid
  const earnedPoints = Math.floor((amountTotalCents / 100) * POINTS_PER_DOLLAR);
  if (earnedPoints > 0) {
    newPoints += earnedPoints;
    transactions.push({
      points: earnedPoints,
      type: "earned",
      description: `Earned ${earnedPoints} points from order #${session.id.slice(-8)}`,
    });
  }

  // Update customer
  const newTotalSpent = (customer.total_spent_cents ?? 0) + amountTotalCents;
  const newTotalOrders = (customer.total_orders ?? 0) + 1;

  // Determine tier
  const tier = computeTier(newPoints, newTotalSpent);

  await supabaseAdmin()
    .from("customers")
    .update({
      loyalty_points: newPoints,
      loyalty_tier: tier,
      total_spent_cents: newTotalSpent,
      total_orders: newTotalOrders,
      last_order_at: new Date().toISOString(),
    })
    .eq("id", customer.id);

  // Record transactions
  for (const tx of transactions) {
    await supabaseAdmin().from("loyalty_transactions").insert({
      customer_id: customer.id,
      customer_email: email,
      points: Math.abs(tx.points),
      type: tx.type,
      description: tx.description,
    });
  }

  console.log(`Loyalty updated for ${email}: ${currentPoints} -> ${newPoints} (tier: ${tier})`);
}

function computeTier(points: number, totalSpentCents: number): string {
  // Tier based on total lifetime spend
  const totalSpentDollars = totalSpentCents / 100;
  if (totalSpentDollars >= 500) return "kynda-vip";
  if (totalSpentDollars >= 200) return "gold";
  if (totalSpentDollars >= 75) return "silver";
  return "bronze";
}
