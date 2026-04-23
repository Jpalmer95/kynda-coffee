import Link from "next/link";
import { Star, Truck, Coffee, Gift, Crown, Zap } from "lucide-react";

export const metadata = {
  title: "Kynda Rewards — Earn Stars with Every Purchase",
  description: "Join the Kynda Rewards program and earn stars on every order. Redeem for free coffee, merch, and exclusive perks.",
};

const TIERS = [
  {
    name: "Bronze",
    stars: 0,
    perks: ["Earn 1 star per $1 spent", "Birthday reward", "Exclusive member offers"],
    color: "from-amber-700 to-amber-900",
    icon: Star,
  },
  {
    name: "Silver",
    stars: 200,
    perks: ["All Bronze perks", "Free shipping on orders $35+", "Early access to new roasts", "5% off all coffee beans"],
    color: "from-slate-400 to-slate-600",
    icon: Zap,
  },
  {
    name: "Gold",
    stars: 500,
    perks: ["All Silver perks", "Free shipping on all orders", "10% off all coffee beans", "Quarterly free merch item"],
    color: "from-yellow-500 to-amber-600",
    icon: Crown,
  },
  {
    name: "Kynda VIP",
    stars: 1000,
    perks: ["All Gold perks", "15% off everything", "Priority customer support", "Invitation to exclusive tastings", "Free monthly coffee bag"],
    color: "from-rust to-red-800",
    icon: Coffee,
  },
];

const REDEMPTIONS = [
  { stars: 50, reward: "Free espresso shot" },
  { stars: 100, reward: "$5 off any order" },
  { stars: 200, reward: "Free bag of coffee beans" },
  { stars: 300, reward: "Free Kynda mug" },
  { stars: 500, reward: "$25 gift card" },
  { stars: 1000, reward: "Free Coffee Club month" },
];

export default function RewardsPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-4xl">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rust to-amber-700">
            <Star className="h-8 w-8 text-white" fill="white" />
          </div>
          <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-espresso">
            Kynda Rewards
          </h1>
          <p className="mt-2 text-base sm:text-lg text-mocha max-w-xl mx-auto">
            Earn stars on every order and unlock exclusive perks, free coffee, and VIP experiences.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/shop" className="btn-primary w-full sm:w-auto">
              Start Earning Stars
            </Link>
            <Link href="/account" className="btn-secondary w-full sm:w-auto">
              Check My Balance
            </Link>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-12 sm:mt-16">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-espresso text-center">
            How It Works
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-latte/20 bg-white p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Coffee className="h-6 w-6 text-rust" />
              </div>
              <h3 className="mt-3 font-medium text-espresso">Shop & Earn</h3>
              <p className="mt-1 text-sm text-mocha">
                Earn 1 star for every dollar you spend on coffee, merch, and subscriptions.
              </p>
            </div>
            <div className="rounded-2xl border border-latte/20 bg-white p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Star className="h-6 w-6 text-rust" />
              </div>
              <h3 className="mt-3 font-medium text-espresso">Level Up</h3>
              <p className="mt-1 text-sm text-mocha">
                Reach new tiers as you collect stars. Each tier unlocks bigger perks.
              </p>
            </div>
            <div className="rounded-2xl border border-latte/20 bg-white p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Gift className="h-6 w-6 text-rust" />
              </div>
              <h3 className="mt-3 font-medium text-espresso">Redeem</h3>
              <p className="mt-1 text-sm text-mocha">
                Cash in your stars for free drinks, discounts, merch, and exclusive experiences.
              </p>
            </div>
          </div>
        </div>

        {/* Tiers */}
        <div className="mt-12 sm:mt-16">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-espresso text-center">
            Rewards Tiers
          </h2>
          <div className="mt-6 space-y-4">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl border border-latte/20 bg-white p-5 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tier.color}`}
                  >
                    <tier.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-lg font-semibold text-espresso">
                        {tier.name}
                      </h3>
                      <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs font-medium text-mocha">
                        {tier.stars}+ stars
                      </span>
                    </div>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {tier.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-2 text-sm text-mocha">
                          <Star className="h-3 w-3 text-rust flex-shrink-0" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Redemption Table */}
        <div className="mt-12 sm:mt-16">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-espresso text-center">
            Redeem Your Stars
          </h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-latte/20 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-espresso">Stars</th>
                  <th className="px-4 py-3 font-medium text-espresso">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {REDEMPTIONS.map((r) => (
                  <tr key={r.stars} className="hover:bg-cream/30">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rust/10 px-2 py-0.5 text-xs font-medium text-rust">
                        <Star className="h-3 w-3" fill="currentColor" />
                        {r.stars}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-espresso">{r.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="rounded-2xl bg-espresso p-6 sm:p-10">
            <Truck className="mx-auto h-8 w-8 text-rust" />
            <h2 className="mt-4 font-heading text-xl sm:text-2xl font-bold text-cream">
              Ready to Start Earning?
            </h2>
            <p className="mt-2 text-sm text-latte/70 max-w-md mx-auto">
              Create an account and your first order will automatically earn stars. No signup needed for the rewards program.
            </p>
            <Link href="/shop" className="btn-accent mt-6 inline-flex">
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
