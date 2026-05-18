"use client";

import { useState } from "react";
import { useCartStore } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";

interface LoyaltyRedemptionProps {
  customerEmail: string;
  subtotalCents: number;
}

export function LoyaltyRedemption({ customerEmail, subtotalCents }: LoyaltyRedemptionProps) {
  const [points, setPoints] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [availablePoints, setAvailablePoints] = useState(0);
  const [maxRedeemable, setMaxRedeemable] = useState(0);

  const { applyLoyalty, removeLoyalty, loyalty_points_used, loyalty_value_cents } = useCartStore();

  async function handleValidate() {
    if (!customerEmail || !points) return;
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/loyalty/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          points_to_redeem: parseInt(points) || 0,
          subtotal_cents: subtotalCents,
        }),
      });
      const data = await res.json();

      if (data.valid) {
        setAvailablePoints(data.points);
        setMaxRedeemable(data.max_redeemable_cents || 0);
        setMessage(`${data.points} points available. Rate: ${data.rate}`);

        if (data.points_used > 0) {
          applyLoyalty(data.points_used, data.redeemable_cents || 0);
          setMessage(`Redeemed ${data.points_used} points for ${formatPrice(data.redeemable_cents || 0)}`);
        }
      } else {
        setMessage(data.message || "Could not validate points");
      }
    } catch (err) {
      setMessage("Failed to check points. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function clearRedemption() {
    removeLoyalty();
    setPoints("");
    setMessage("");
  }

  return (
    <div className="rounded-xl border border-latte/20 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-medium text-espresso">Loyalty Points</span>
        <span className="text-xs px-2 py-0.5 bg-bronze/10 text-forest rounded">100 pts = $5</span>
      </div>

      {loyalty_points_used > 0 ? (
        <div className="flex items-center justify-between text-sm bg-sage/10 border border-sage/30 p-3 rounded-lg">
          <div>
            <span className="font-medium text-sage">Redeemed</span>
            <span className="ml-2 text-sage">{loyalty_points_used} pts → {formatPrice(loyalty_value_cents)}</span>
          </div>
          <button onClick={clearRedemption} className="text-xs underline text-sage">Remove</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Points to redeem"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="input-field text-sm flex-1"
            />
            <button
              onClick={handleValidate}
              disabled={loading || !customerEmail.trim()}
              className="btn-secondary px-4 text-sm"
            >
              {loading ? "Checking..." : "Apply"}
            </button>
          </div>
          {message && <p className="mt-2 text-xs text-mocha">{message}</p>}
          {maxRedeemable > 0 && (
            <p className="text-xs text-mocha mt-1">Max redeemable: {formatPrice(maxRedeemable)}</p>
          )}
        </>
      )}
    </div>
  );
}