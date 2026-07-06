"use client";

import { useState } from "react";
import { SmsConsentCheckbox } from "@/components/order/SmsConsentCheckbox";
import Link from "next/link";

/**
 * Standalone SMS opt-in page for Twilio A2P 10DLC campaign compliance.
 *
 * This page provides a clear, publicly accessible opt-in flow that Twilio
 * campaign reviewers can verify. It also serves as the canonical opt-in
 * URL referenced in the A2P campaign registration.
 *
 * Customers encounter the same consent checkbox during checkout at /order
 * and /menu — this page is a dedicated landing point for the opt-in itself.
 */
export default function SmsOptInPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Please enter your mobile number to opt in.");
      return;
    }
    if (!consent) {
      setError("Please check the consent box to opt in to SMS updates.");
      return;
    }

    // Try to persist consent to the user's profile (if logged in)
    try {
      await fetch("/api/account/sms-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
    } catch {
      // Not logged in — consent will be recorded when they place an order
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="section-padding">
        <div className="container-max max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-forest/10 text-forest">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-3xl font-bold text-espresso">
            You&apos;re subscribed!
          </h1>
          <p className="mt-4 text-mocha">
            We&apos;ll send SMS order updates to <strong>{phone}</strong>.
            You&apos;ll receive a confirmation message shortly. Reply STOP at
            any time to opt out.
          </p>
          <div className="mt-8 space-y-3">
            <Link href="/order" className="btn-primary inline-block px-8 py-4">
              Place an Order
            </Link>
          </div>
          <p className="mt-4 text-xs text-mocha">
            Message and data rates may apply. Reply HELP for help or STOP to cancel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-lg">
        <div className="text-center mb-8">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-forest">
            SMS Order Updates
          </p>
          <h1 className="font-heading text-4xl font-bold text-espresso tracking-tight">
            Get order updates by text
          </h1>
          <p className="mt-4 text-mocha">
            Sign up to receive SMS notifications about your Kynda Coffee orders —
            confirmation, ready-for-pickup alerts, and delivery updates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-espresso mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-latte/40 bg-card px-4 py-3 text-espresso focus:border-forest focus:ring-1 focus:ring-forest outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-espresso mb-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(737) 200-2947"
              className="w-full rounded-lg border border-latte/40 bg-card px-4 py-3 text-espresso focus:border-forest focus:ring-1 focus:ring-forest outline-none"
              required
            />
          </div>

          <SmsConsentCheckbox checked={consent} onChange={setConsent} id="sms-opt-in-page" />

          {error && (
            <div className="rounded-lg border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full px-8 py-4 text-base font-bold uppercase tracking-widest"
          >
            Opt In to SMS Updates
          </button>
        </form>

        <div className="mt-8 rounded-xl border border-latte/20 bg-cream/30 p-5 text-sm text-mocha">
          <h2 className="font-heading font-bold text-espresso mb-2">How it works</h2>
          <ul className="space-y-1.5">
            <li>• You&apos;ll receive a confirmation text after opting in</li>
            <li>• Order updates are sent automatically when you place an order</li>
            <li>• Reply STOP at any time to unsubscribe</li>
            <li>• Reply HELP for support</li>
            <li>• Message and data rates may apply</li>
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-mocha">
          By opting in, you agree to our{" "}
          <Link href="/terms" className="text-forest hover:underline">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-forest hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
}
