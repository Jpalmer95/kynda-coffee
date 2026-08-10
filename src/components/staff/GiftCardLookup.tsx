"use client";

/**
 * GiftCardLookup — staff-facing tool to check balance and redeem
 * digital gift cards for in-store purchases. Baristas scan or type
 * the code, see the balance, enter the order amount, and redeem.
 * The remaining balance is shown for the customer.
 */

import { useState } from "react";
import { Gift, Loader2, Search, CheckCircle2, XCircle, DollarSign } from "lucide-react";

interface GiftCard {
  code: string;
  balance_cents: number;
  status: string;
  amount_cents: number;
}

export function GiftCardLookup() {
  const [code, setCode] = useState("");
  const [card, setCard] = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redemption
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; remaining?: number; message: string } | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setCard(null);
    setRedeemResult(null);
    try {
      const res = await fetch(`/api/gift-cards/check?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gift card not found");
        return;
      }
      setCard(data.gift_card);
    } catch {
      setError("Failed to look up gift card");
    } finally {
      setLoading(false);
    }
  }

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    const amountCents = Math.round(parseFloat(redeemAmount) * 100);
    if (!amountCents || amountCents <= 0) {
      setRedeemResult({ success: false, message: "Enter a valid amount" });
      return;
    }
    if (amountCents > card.balance_cents) {
      setRedeemResult({ success: false, message: "Amount exceeds gift card balance" });
      return;
    }
    setRedeeming(true);
    setRedeemResult(null);
    try {
      const res = await fetch("/api/gift-cards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: card.code, amount_cents: amountCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemResult({ success: false, message: data.error || "Redemption failed" });
        return;
      }
      const remaining = data.remaining_balance_cents ?? 0;
      setRedeemResult({
        success: true,
        remaining: remaining,
        message: `Redeemed $${(amountCents / 100).toFixed(2)} successfully!`,
      });
      // Update the displayed balance
      setCard({ ...card, balance_cents: remaining });
      setRedeemAmount("");
    } catch {
      setRedeemResult({ success: false, message: "Redemption failed" });
    } finally {
      setRedeeming(false);
    }
  }

  function reset() {
    setCode("");
    setCard(null);
    setError(null);
    setRedeemAmount("");
    setRedeemResult(null);
  }

  return (
    <div className="space-y-6">
      {/* Lookup form */}
      <form onSubmit={lookup} className="rounded-2xl border border-latte/20 bg-card p-6">
        <label className="block text-sm font-medium text-espresso">
          Gift Card Code
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="KYN-XXXXXXXXXXXX"
                className="w-full rounded-xl border border-latte/30 bg-background py-3 pl-9 pr-3 font-mono text-sm uppercase tracking-wider text-espresso placeholder:normal-case placeholder:tracking-normal placeholder:text-mocha/50 focus:border-forest focus:outline-none"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
              />
            </div>
            <button type="submit" disabled={loading || !code.trim()} className="btn-primary text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <p className="mt-2 text-xs text-mocha">Codes start with KYN- or KYND-. Ask the customer to show their email or gift card page.</p>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Card details */}
      {card && (
        <div className="rounded-2xl border border-latte/20 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.status === "active" ? "bg-forest/10" : "bg-red-100"}`}>
                <Gift className={`h-6 w-6 ${card.status === "active" ? "text-forest" : "text-red-600"}`} />
              </div>
              <div>
                <p className="font-mono text-sm font-bold text-espresso">{card.code}</p>
                <p className="text-xs text-mocha">Status: {card.status}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-mocha">Current Balance</p>
              <p className={`text-2xl font-bold ${card.balance_cents > 0 ? "text-forest" : "text-red-600"}`}>
                ${(card.balance_cents / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Status warnings */}
          {card.status !== "active" && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              This gift card is <strong>{card.status}</strong> and cannot be used.
            </div>
          )}
          {card.balance_cents === 0 && card.status === "active" && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              This gift card has a $0.00 balance — no funds remaining.
            </div>
          )}

          {/* Redeem form */}
          {card.status === "active" && card.balance_cents > 0 && (
            <form onSubmit={redeem} className="mt-4 border-t border-latte/10 pt-4">
              <label className="block text-sm font-medium text-espresso">
                Amount to Redeem (for this order)
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={(card.balance_cents / 100).toFixed(2)}
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-latte/30 bg-background py-3 pl-9 pr-3 text-sm text-espresso focus:border-forest focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={redeeming || !redeemAmount}
                    className="btn-primary text-sm"
                  >
                    {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
                  </button>
                </div>
              </label>

              {/* Quick amount buttons */}
              <div className="mt-2 flex gap-2">
                {[5, 10, card.balance_cents / 100].filter((v, i, arr) => arr.indexOf(v) === i).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRedeemAmount(amt.toFixed(2))}
                    className="rounded-lg border border-latte/30 px-3 py-1.5 text-xs text-mocha hover:border-forest/40 hover:text-forest"
                  >
                    {amt === card.balance_cents / 100 ? "Full Balance" : `$${amt}`}
                  </button>
                ))}
              </div>
            </form>
          )}

          {/* Redeem result */}
          {redeemResult && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              redeemResult.success
                ? "border-green-300 bg-green-50 text-green-700"
                : "border-red-300 bg-red-50 text-red-700"
            }`}>
              {redeemResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              <div>
                <p className="font-medium">{redeemResult.message}</p>
                {redeemResult.remaining !== undefined && (
                  <p className="text-xs">Remaining balance: ${(redeemResult.remaining / 100).toFixed(2)}</p>
                )}
              </div>
            </div>
          )}

          {/* New lookup button */}
          <button onClick={reset} className="mt-4 text-sm text-mocha hover:text-forest hover:underline">
            Look up another gift card
          </button>
        </div>
      )}
    </div>
  );
}
