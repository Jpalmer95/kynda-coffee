import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Loyalty earning rate: 1 point per dollar spent
const POINTS_PER_DOLLAR = 1;

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
    if (session.mode === "subscription") {
      await handleSubscriptionCheckoutCompleted(session);
    } else {
      await handleCheckoutCompleted(session);
    }
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription") {
      await handleSubscriptionCheckoutCompleted(session);
    } else {
      await handleCheckoutCompleted(session);
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    await handleInvoicePaymentSucceeded(invoice);
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    await handleSubscriptionUpdated(subscription);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await handleSubscriptionDeleted(subscription);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Wallet payments (Apple Pay / Google Pay / Link) deliver the verified
  // email/name/phone via customer_details rather than the top-level
  // customer_email field, so prefer that.
  const details = session.customer_details;
  const email = session.customer_email || details?.email || null;
  if (!email) {
    console.error("No customer email in session", session.id);
    return;
  }

  // ── Mark the matching café / QR / menu order as PAID ──
  // Online orders are created `unpaid` then sent to Stripe. On successful
  // payment we flip the order to paid and backfill the customer's verified
  // name + phone from Stripe (these arrive automatically with Apple/Google
  // Pay, so the customer never had to type them up front).
  try {
    const db = supabaseAdmin();
    const { data: pendingOrder } = await db
      .from("orders")
      .select("id, fulfillment_metadata")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    if (pendingOrder) {
      const fm = (pendingOrder.fulfillment_metadata as Record<string, unknown>) || {};
      const verifiedName = details?.name?.trim();
      const verifiedPhone = details?.phone?.trim();
      await db
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "stripe",
          paid_at: new Date().toISOString(),
          status: "confirmed",
          email,
          fulfillment_metadata: {
            ...fm,
            ...(verifiedName ? { customer_name: verifiedName } : {}),
            ...(verifiedPhone ? { customer_phone: verifiedPhone } : {}),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", pendingOrder.id);
      console.log(`[Stripe Webhook] Marked order ${pendingOrder.id} paid (session ${session.id})`);
    }
  } catch (orderErr) {
    console.error("[Stripe Webhook] Failed to mark order paid", orderErr);
    // Non-fatal — payment succeeded; admin can reconcile manually.
  }

  const metadata = session.metadata ?? {};
  const subtotalCents = parseInt(metadata.subtotal_cents ?? "0", 10);
  const loyaltyPointsRedeemed = parseInt(metadata.loyalty_points_redeemed ?? "0", 10);
  const loyaltyValueCents = parseInt(metadata.loyalty_value_cents ?? "0", 10);

  // ── Printful merch order confirmation ──
  // If this checkout came from the merch checkout flow, confirm the draft
  // Printful order now that payment has succeeded.
  const printfulDraftId = metadata.printful_draft_id;
  if (printfulDraftId) {
    try {
      const { confirmOrder } = await import("@/lib/printful/client");
      await confirmOrder(Number(printfulDraftId));
      console.log(`[Stripe Webhook] Confirmed Printful order ${printfulDraftId}`);

      // Update order record if we have one
      const kyndaOrderId = metadata.kynda_order_id;
      if (kyndaOrderId) {
        const db = supabaseAdmin();
        const { data: existing } = await db
          .from("orders")
          .select("metadata")
          .eq("id", kyndaOrderId)
          .maybeSingle();
        if (existing) {
          await db
            .from("orders")
            .update({
              fulfillment_status: "processing",
              payment_status: "paid",
              paid_at: new Date().toISOString(),
              metadata: {
                ...((existing.metadata as Record<string, unknown>) || {}),
                printful_order_id: Number(printfulDraftId),
                confirmed_at: new Date().toISOString(),
              },
            })
            .eq("id", kyndaOrderId);
        }
      }

      // Send order confirmation email for merch orders
      try {
        const { sendEmail } = await import("@/lib/email/service");
        await sendEmail({
          to: email,
          subject: "Your Kynda merch order is confirmed! 🎨",
          template: "order-confirmation",
          data: {
            customer_name: metadata.customer_name || email.split("@")[0],
            order_type: "merch",
            printful_order_id: printfulDraftId,
          },
        });
      } catch (emailErr) {
        console.warn("[Stripe Webhook] Merch confirmation email failed:", emailErr);
      }
    } catch (pfErr: any) {
      console.error("[Stripe Webhook] Printful confirmation failed:", pfErr.message);
      // Non-fatal — order is paid, we can confirm manually from admin
    }
  }

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

async function handleSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_email;
  const metadata = session.metadata ?? {};
  const subscriptionId = session.subscription as string;

  if (!email || !subscriptionId) {
    console.error("Missing email or subscription id", session.id);
    return;
  }

  // Find or create customer
  let { data: customer } = await supabaseAdmin()
    .from("customers")
    .select("id")
    .eq("email", email)
    .single();

  if (!customer) {
    const { data: newCustomer } = await supabaseAdmin()
      .from("customers")
      .insert({ email })
      .select("id")
      .single();
    customer = newCustomer;
  }

  if (!customer) {
    console.error("Could not find/create customer for subscription", email);
    return;
  }

  // Insert subscription record
  const productId = metadata.kynda_product_id;
  const frequency = metadata.frequency || "monthly";
  const grind = metadata.grind || null;

  await supabaseAdmin()
    .from("subscriptions")
    .insert({
      customer_id: customer.id,
      product_id: productId,
      stripe_subscription_id: subscriptionId,
      status: "active",
      grind,
      frequency,
      next_delivery_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

  console.log(`Subscription created for ${email}: ${subscriptionId}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Update next delivery date based on invoice period end
  const periodEnd = invoice.lines?.data[0]?.period?.end;
  if (periodEnd) {
    await supabaseAdmin()
      .from("subscriptions")
      .update({
        next_delivery_at: new Date(periodEnd * 1000).toISOString(),
        status: "active",
      })
      .eq("stripe_subscription_id", subscriptionId);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const statusMap: Record<string, string> = {
    active: "active",
    paused: "paused",
    canceled: "cancelled",
    unpaid: "past_due",
    trialing: "trialing",
  };

  const mappedStatus = statusMap[subscription.status] || subscription.status;

  await supabaseAdmin()
    .from("subscriptions")
    .update({
      status: mappedStatus,
      cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin()
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

function computeTier(points: number, totalSpentCents: number): string {
  // Tier based on total lifetime spend
  const totalSpentDollars = totalSpentCents / 100;
  if (totalSpentDollars >= 500) return "kynda-vip";
  if (totalSpentDollars >= 200) return "gold";
  if (totalSpentDollars >= 75) return "silver";
  return "bronze";
}
