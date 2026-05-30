"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Gift, ArrowRight, CheckCircle, Copy, Check } from "lucide-react";

export default function ReferPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const shareUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : "https://kyndacoffee.com"}/shop?ref=${code}`
    : "";

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/referrals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create code");

      setCode(data.code);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-padding">
      <div className="container-max max-w-2xl">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bronze/10">
            <Users className="h-8 w-8 text-forest" />
          </div>
          <h1 className="font-heading text-4xl font-bold text-espresso">Share the Love</h1>
          <p className="mt-3 text-lg text-mocha">
            Invite friends to Kynda. They get 10% off their first order — you earn meaningful rewards.
          </p>
        </div>

        {!success ? (
          <div className="rounded-3xl border border-latte/30 bg-card p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-espresso mb-2">Your email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@coffee.com"
                  className="w-full rounded-2xl border border-latte/50 px-5 py-4 text-lg focus:border-bronze focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-4 text-lg disabled:opacity-60"
              >
                {loading ? "Creating your code..." : "Get My Referral Code"}
                {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
              </button>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            </form>

            <div className="mt-8 border-t pt-6 text-sm text-mocha">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-forest" /> How it works
              </div>
              <ul className="ml-6 list-disc space-y-1">
                <li>New customers get <strong>10% off</strong> their first order</li>
                <li>You earn <strong>$10 store credit</strong> after their first purchase</li>
                <li>Tier bonuses after 5 and 10 successful referrals</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-sage/40 bg-card p-10 text-center">
            <CheckCircle className="mx-auto h-14 w-14 text-sage" />
            <h2 className="mt-4 font-heading text-2xl text-espresso">You&apos;re all set!</h2>
            
            <div className="my-6 rounded-2xl bg-sage/10 p-6">
              <p className="text-sm text-mocha">Your unique referral code</p>
              <p className="font-mono text-4xl font-bold tracking-[4px] text-espresso mt-1">{code}</p>
            </div>

            <p className="text-mocha">Share this code with friends or use the link below:</p>
            <button
              onClick={copyShareUrl}
              className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl bg-latte/10 p-4 text-left font-mono text-sm hover:bg-latte/20 transition"
              title="Click to copy"
            >
              <span className="truncate">{shareUrl}</span>
              {copied ? <Check className="h-4 w-4 flex-shrink-0 text-sage" /> : <Copy className="h-4 w-4 flex-shrink-0 text-mocha" />}
            </button>
            {copied && <p className="mt-1 text-xs text-sage">Copied to clipboard!</p>}

            <div className="mt-8 flex flex-col gap-3 text-left text-sm max-w-xs mx-auto">
              <Link href="/shop" className="btn-primary justify-center">Browse the Shop</Link>
              <Link href="/account" className="text-mocha hover:text-espresso">View your rewards dashboard →</Link>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-mocha">
          Already have an account? <Link href="/account" className="underline">Sign in to manage referrals</Link>
        </p>
      </div>
    </div>
  );
}
