import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CustomerRow = {
  id: string;
  email: string;
  full_name: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  price_cents: number | null;
};

type SubscriptionRow = {
  id: string;
  customer_id: string | null;
  product_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  grind: string | null;
  frequency: string | null;
  next_delivery_at: string | null;
  created_at: string | null;
  cancelled_at: string | null;
  customers?: CustomerRow | CustomerRow[] | null;
  products?: ProductRow | ProductRow[] | null;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("subscriptions")
      .select(`
        id,
        customer_id,
        product_id,
        stripe_subscription_id,
        status,
        grind,
        frequency,
        next_delivery_at,
        created_at,
        cancelled_at,
        customers:customer_id ( id, email, full_name ),
        products:product_id ( id, name, price_cents )
      `)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Admin subscriptions fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    }

    const subscriptions = ((data ?? []) as SubscriptionRow[]).map((subscription) => {
      const customer = firstRelated(subscription.customers);
      const product = firstRelated(subscription.products);

      return {
        id: subscription.id,
        customer_id: subscription.customer_id,
        customer_name: customer?.full_name || "—",
        customer_email: customer?.email || "—",
        plan: product?.name || "Coffee Club",
        product_id: subscription.product_id,
        frequency: subscription.frequency || "monthly",
        amount_cents: product?.price_cents ?? 0,
        status: subscription.status || "active",
        grind: subscription.grind,
        next_billing: subscription.next_delivery_at,
        started: subscription.created_at,
        cancelled_at: subscription.cancelled_at,
        stripe_subscription_id: subscription.stripe_subscription_id,
      };
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Admin subscriptions API error:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body?.id ?? "");
    const requestedStatus = String(body?.status ?? "");
    const allowedStatuses = new Set(["active", "paused", "cancelled", "past_due", "trialing"]);

    if (!id || !allowedStatuses.has(requestedStatus)) {
      return NextResponse.json({ error: "Invalid subscription update" }, { status: 400 });
    }

    const update = {
      status: requestedStatus,
      cancelled_at: requestedStatus === "cancelled" ? new Date().toISOString() : null,
    };

    const { data, error } = await supabaseAdmin()
      .from("subscriptions")
      .update(update)
      .eq("id", id)
      .select("id, status, cancelled_at")
      .single();

    if (error) {
      console.error("Admin subscription update error:", error);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    return NextResponse.json({ subscription: data });
  } catch (error) {
    console.error("Admin subscription PATCH error:", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
