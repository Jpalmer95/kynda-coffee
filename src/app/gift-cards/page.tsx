"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, Loader2, CheckCircle, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const AMOUNTS = [1500, 2500, 5000, 10000]; // cents

export default function GiftCardsPage() {
  const [amount, setAmount] = useState(2500);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [checkCode, setCheckCode] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    setPurchasing(true);
    try {
      const res = await fetch("/api/gift-cards/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: amount, recipient_email: recipientEmail, message }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast(data.error || "Failed to create gift card", "error");
      }
    } catch {
      toast("Failed to create gift card", "error");
    } finally {
      setPurchasing(false);
    }
  }

  async function handleCheckBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!checkCode.trim()) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/gift-cards/check?code=${encodeURIComponent(checkCode.trim())}`);
      const data = await res.json();
      if (data.gift_card) {
        setBalance(data.gift_card.balance_cents);
      } else {
        toast("Gift card not found", "error");
        setBalance(null);
      }
    } catch {
      toast("Failed to check balance", "error");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <div className="text-center">
          <Gift className="mx-auto h-10 w-10 text-rust" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-espresso">
            Gift Cards
          </h1>
          <p className="mt-3 text-base text-mocha">
            Give the gift of great coffee. Delivered instantly via email.
          </p>
        </div>

        {/* Purchase form */}
        <form onSubmit={handlePurchase} className="mt-10 rounded-2xl border border-latte/20 bg-white p-6 sm:p-8 space-y-5">
          <h2 className="font-heading text-xl font-semibold text-espresso">Purchase a Gift Card</h2>

          <div>
            <label className="mb-2 block text-sm font-medium text-espresso">Amount</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`rounded-xl border-2 px-4 py-3 text-center text-sm font-semibold transition-all ${
                    amount === amt
                      ? "border-rust bg-rust/5 text-rust"
                      : "border-latte/20 text-espresso hover:border-latte/40"
                  }`}
                >
                  ${(amt / 100).toFixed(0)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">Recipient Email</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="friend@email.com"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">Personal Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Happy birthday! Enjoy some amazing coffee."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <button type="submit" disabled={purchasing} className="btn-primary w-full">
            {purchasing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gift className="mr-2 h-4 w-4" />
            )}
            Purchase ${(amount / 100).toFixed(0)} Gift Card
          </button>
        </form>

        {/* Check balance */}
        <form onSubmit={handleCheckBalance} className="mt-6 rounded-2xl border border-latte/20 bg-white p-6 sm:p-8 space-y-4">
          <h2 className="font-heading text-xl font-semibold text-espresso">Check Balance</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={checkCode}
              onChange={(e) => setCheckCode(e.target.value)}
              placeholder="Enter gift card code"
              className="input-field flex-1"
              required
            />
            <button type="submit" disabled={checking} className="btn-secondary whitespace-nowrap">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Check
            </button>
          </div>
          {balance !== null && (
            <div className="flex items-center gap-2 rounded-xl bg-sage/10 p-4 text-sage">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Balance: ${(balance / 100).toFixed(2)}</span>
            </div>
          )}
        </form>

        <div className="mt-8 text-center text-sm text-mocha">
          <p>Gift cards never expire. Redeemable online or in-store.</p>
          <p className="mt-1">
            Questions?{" "}
            <Link href="/contact" className="text-rust hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
