"use client";

import { useState } from "react";
import { Repeat, Calendar, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SubscriptionPanelProps {
  productId: string;
  productName: string;
  priceCents: number;
  selectedGrind?: string | null;
  email: string;
}

const FREQUENCIES = [
  { value: "weekly", label: "Weekly", discount: 0.05 },
  { value: "biweekly", label: "Bi-Weekly", discount: 0.08 },
  { value: "monthly", label: "Monthly", discount: 0.10 },
];

export function SubscriptionPanel({
  productId,
  productName,
  priceCents,
  selectedGrind,
  email,
}: SubscriptionPanelProps) {
  const [frequency, setFrequency] = useState("monthly");
  const [loading, setLoading] = useState(false);

  const selectedFreq = FREQUENCIES.find((f) => f.value === frequency)!;
  const discountedPriceCents = Math.round(priceCents * (1 - selectedFreq.discount));

  async function handleSubscribe() {
    if (!email) {
      alert("Please enter your email in the cart before subscribing.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          email,
          frequency,
          grind: selectedGrind || undefined,
          success_url: `${window.location.origin}/account/subscriptions?success=true`,
          cancel_url: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start subscription.");
      }
    } catch {
      alert("Failed to start subscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-sage/30 bg-sage/5 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-forest" />
        <span className="font-medium text-espresso">Subscribe & Save</span>
        <span className="ml-auto text-xs font-semibold text-forest bg-sage/20 px-2 py-0.5 rounded">
          Save up to 10%
        </span>
      </div>

      <div className="space-y-2">
        {FREQUENCIES.map((freq) => (
          <label
            key={freq.value}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
              frequency === freq.value
                ? "border-forest bg-white"
                : "border-latte/20 bg-card hover:bg-latte/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="frequency"
                value={freq.value}
                checked={frequency === freq.value}
                onChange={() => setFrequency(freq.value)}
                className="h-4 w-4 accent-forest"
              />
              <div>
                <p className="text-sm font-medium text-espresso">{freq.label}</p>
                <p className="text-xs text-mocha">
                  {Math.round(freq.discount * 100)}% off
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-espresso">
              {formatPrice(Math.round(priceCents * (1 - freq.discount)))}/delivery
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="btn-primary w-full mt-4 py-3 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting subscription...
          </>
        ) : (
          <>
            <Calendar className="h-4 w-4" />
            Subscribe — {formatPrice(discountedPriceCents)}/{selectedFreq.label.toLowerCase()}
          </>
        )}
      </button>
      <p className="mt-2 text-[10px] text-mocha text-center">
        You&apos;ll be redirected to Stripe to set up recurring billing. Cancel anytime.
      </p>
    </div>
  );
}
