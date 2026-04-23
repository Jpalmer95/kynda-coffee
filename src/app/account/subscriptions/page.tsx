import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Repeat, Coffee, Calendar, Truck, Sparkles, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("customer_email", user.email)
    .order("created_at", { ascending: false })
    .limit(10);

  const hasActive = subscriptions?.some((s) => s.status === "active");

  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
          Coffee Club
        </h1>
        <p className="mt-1 text-sm text-mocha">
          Manage your bean subscriptions and delivery schedule
        </p>

        {/* Subscription Cards */}
        {(!subscriptions || subscriptions.length === 0) ? (
          <div className="mt-8 rounded-2xl border border-latte/20 bg-white py-16 text-center">
            <Coffee className="mx-auto h-12 w-12 text-latte" aria-hidden="true" />
            <p className="mt-4 text-lg font-medium text-espresso">
              No active subscriptions
            </p>
            <p className="mt-1 text-sm text-mocha max-w-sm mx-auto">
              Join the Coffee Club and get fresh roasted beans delivered to your door on your schedule.
            </p>
            <Link href="/shop" className="btn-primary mt-6 inline-flex">
              Browse Subscriptions
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className={`rounded-xl border p-4 sm:p-5 transition-shadow hover:shadow-md ${
                  sub.status === "active"
                    ? "border-sage/30 bg-green-50/30"
                    : "border-latte/20 bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-base font-semibold text-espresso">
                        {sub.plan_name || "Coffee Club"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          sub.status === "active"
                            ? "bg-sage/20 text-sage"
                            : sub.status === "cancelled"
                            ? "bg-latte/20 text-mocha"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {sub.status === "active"
                          ? "Active"
                          : sub.status === "cancelled"
                          ? "Cancelled"
                          : "Paused"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-mocha">
                      Started {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-heading text-lg font-bold text-espresso">
                      {formatPrice(sub.price_cents)}/mo
                    </p>
                    <p className="text-xs text-mocha capitalize">
                      {sub.interval || "monthly"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-latte/10 pt-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-mocha" aria-hidden="true" />
                    <span className="text-sm text-mocha">
                      Next: {sub.next_delivery_date
                        ? new Date(sub.next_delivery_date).toLocaleDateString()
                        : "TBD"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-mocha" aria-hidden="true" />
                    <span className="text-sm text-mocha">
                      {sub.shipping_address?.city || "Standard shipping"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-mocha" aria-hidden="true" />
                    <span className="text-sm text-mocha capitalize">
                      {sub.frequency || "Monthly"}
                    </span>
                  </div>
                </div>

                {sub.status === "active" && (
                  <div className="mt-4 flex items-center gap-3 border-t border-latte/10 pt-4">
                    <button className="text-sm font-medium text-rust hover:underline">
                      Pause Subscription
                    </button>
                    <span className="text-latte">|</span>
                    <button className="text-sm font-medium text-mocha hover:text-rust transition-colors">
                      Update Preferences
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Perks */}
        {!hasActive && (
          <div className="mt-8 rounded-2xl border border-latte/20 bg-gradient-to-br from-cream to-white p-6 sm:p-8">
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Coffee Club Perks
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-rust/10">
                  <Sparkles className="h-5 w-5 text-rust" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-espresso">15% Off Every Order</p>
                  <p className="text-sm text-mocha">
                    Members save on every bag of beans
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-rust/10">
                  <Truck className="h-5 w-5 text-rust" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-espresso">Free Shipping</p>
                  <p className="text-sm text-mocha">
                    Always included, no minimums
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-rust/10">
                  <Calendar className="h-5 w-5 text-rust" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-espresso">Flexible Schedule</p>
                  <p className="text-sm text-mocha">
                    Weekly, bi-weekly, or monthly
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-rust/10">
                  <Coffee className="h-5 w-5 text-rust" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-espresso">First Access</p>
                  <p className="text-sm text-mocha">
                    Try new roasts before anyone else
                  </p>
                </div>
              </div>
            </div>
            <Link
              href="/shop"
              className="btn-accent mt-6 inline-flex w-full sm:w-auto justify-center"
            >
              Join the Coffee Club
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
