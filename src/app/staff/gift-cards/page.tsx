import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { normalizeRole, isTeamMember } from "@/lib/auth/roles";
import { Gift } from "lucide-react";
import { GiftCardLookup } from "@/components/staff/GiftCardLookup";

export const dynamic = "force-dynamic";

export const metadata = { title: "Gift Card Lookup | Kynda Coffee Staff" };

export default async function StaffGiftCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !isTeamMember(normalizeRole((profile as any).role))) {
    redirect("/account");
  }

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-forest">
          <Gift className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Staff Tools</span>
        </div>
        <h1 className="mt-2 font-heading text-4xl font-bold text-espresso">Gift Card Lookup</h1>
        <p className="mt-2 text-mocha">
          Check a gift card balance or redeem it for an in-store purchase.
        </p>
      </div>

      <GiftCardLookup />
    </div>
  );
}
