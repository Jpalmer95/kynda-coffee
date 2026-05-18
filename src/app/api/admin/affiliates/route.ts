import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CustomerRow = {
  id: string;
  email: string;
  full_name: string | null;
  referral_code: string | null;
  total_referral_earnings_cents: number | null;
};

type ReferralRow = {
  id: string;
  referrer_id: string | null;
  status: string | null;
  reward_amount_cents: number | null;
  reward_issued: boolean | null;
};

type PayoutRow = {
  id: string;
  customer_id: string | null;
  amount_cents: number | null;
  status: string | null;
};

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: customers, error: customersError } = await supabaseAdmin()
      .from("customers")
      .select("id, email, full_name, referral_code, total_referral_earnings_cents")
      .not("referral_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (customersError) {
      console.error("Affiliates customers fetch error:", customersError);
      return NextResponse.json({ error: "Failed to fetch affiliates" }, { status: 500 });
    }

    const customerIds = ((customers ?? []) as CustomerRow[]).map((customer) => customer.id);

    const [{ data: referrals, error: referralsError }, { data: payouts, error: payoutsError }] =
      await Promise.all([
        customerIds.length > 0
          ? supabaseAdmin()
              .from("referrals")
              .select("id, referrer_id, status, reward_amount_cents, reward_issued")
              .in("referrer_id", customerIds)
          : Promise.resolve({ data: [] as ReferralRow[], error: null }),
        customerIds.length > 0
          ? supabaseAdmin()
              .from("affiliate_payouts")
              .select("id, customer_id, amount_cents, status")
              .in("customer_id", customerIds)
          : Promise.resolve({ data: [] as PayoutRow[], error: null }),
      ]);

    if (referralsError) {
      console.error("Affiliates referrals fetch error:", referralsError);
    }
    if (payoutsError) {
      console.error("Affiliates payouts fetch error:", payoutsError);
    }

    const referralsByCustomer = new Map<string, ReferralRow[]>();
    ((referrals ?? []) as ReferralRow[]).forEach((referral) => {
      if (!referral.referrer_id) return;
      const rows = referralsByCustomer.get(referral.referrer_id) ?? [];
      rows.push(referral);
      referralsByCustomer.set(referral.referrer_id, rows);
    });

    const payoutsByCustomer = new Map<string, PayoutRow[]>();
    ((payouts ?? []) as PayoutRow[]).forEach((payout) => {
      if (!payout.customer_id) return;
      const rows = payoutsByCustomer.get(payout.customer_id) ?? [];
      rows.push(payout);
      payoutsByCustomer.set(payout.customer_id, rows);
    });

    const affiliates = ((customers ?? []) as CustomerRow[]).map((customer) => {
      const customerReferrals = referralsByCustomer.get(customer.id) ?? [];
      const customerPayouts = payoutsByCustomer.get(customer.id) ?? [];
      const completedReferrals = customerReferrals.filter((referral) =>
        ["completed", "rewarded"].includes(referral.status ?? "")
      );
      const earnedFromReferrals = customerReferrals.reduce(
        (sum, referral) => sum + (referral.reward_amount_cents ?? 0),
        0
      );
      const fallbackEarned = customer.total_referral_earnings_cents ?? 0;
      const totalEarned = Math.max(earnedFromReferrals, fallbackEarned);
      const pendingPayouts = customerPayouts
        .filter((payout) => payout.status === "pending")
        .reduce((sum, payout) => sum + (payout.amount_cents ?? 0), 0);
      const paidPayouts = customerPayouts
        .filter((payout) => payout.status === "paid")
        .reduce((sum, payout) => sum + (payout.amount_cents ?? 0), 0);

      return {
        id: customer.id,
        name: customer.full_name,
        email: customer.email,
        code: customer.referral_code,
        total_referrals: completedReferrals.length,
        pending_referrals: customerReferrals.filter((referral) => referral.status === "pending").length,
        total_earned_cents: totalEarned,
        pending_payouts_cents: pendingPayouts,
        paid_payouts_cents: paidPayouts,
      };
    });

    return NextResponse.json({ affiliates });
  } catch (error) {
    console.error("Affiliates API error:", error);
    return NextResponse.json({ error: "Failed to fetch affiliates" }, { status: 500 });
  }
}
