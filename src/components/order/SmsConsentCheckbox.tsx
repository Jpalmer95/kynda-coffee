"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * SMS consent checkbox + legal disclaimers for A2P 10DLC compliance.
 *
 * Twilio A2P campaign review requires:
 * - Checkbox actively selected by the user (NOT pre-checked)
 * - Clear description of what type of messages they'll receive
 * - Message frequency information
 * - "Message and data rates may apply" disclosure
 * - HELP and STOP instructions
 * - Links to Terms of Service and Privacy Policy
 *
 * Smart behavior for returning customers:
 * - If logged-in user previously consented, checkbox is pre-checked
 *   and a compact note replaces the full legal text (cleaner UX)
 * - If not logged in or hasn't consented before, shows full consent
 *   language with unchecked box (active consent required)
 * - Customers can revoke at any time via /account/notifications or
 *   by replying STOP to any SMS (Twilio webhook auto-updates profile)
 */
export function SmsConsentCheckbox({
  checked,
  onChange,
  id = "sms-consent",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  const [hasStoredConsent, setHasStoredConsent] = useState(false);
  const [checkedStored, setCheckedStored] = useState(false);

  // Check if the logged-in user has previously consented to SMS.
  // If so, we auto-check the box and show a compact note instead of the
  // full legal text. This keeps the checkout flow clean for repeat customers.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/sms-consent", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.sms_opt_in === true) {
          setHasStoredConsent(true);
          setCheckedStored(true);
          onChange(true);
        }
      })
      .catch(() => {
        // Not logged in or error — show full consent flow (default)
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user toggles the checkbox, persist to their profile if logged in
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    onChange(next);
    // Best-effort persist to profile (fires only if logged in)
    if (next !== hasStoredConsent) {
      fetch("/api/account/sms-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: next }),
      }).catch(() => {});
      if (next) setHasStoredConsent(true);
    }
  }

  // Compact view for returning consented customers
  if (hasStoredConsent && checked) {
    return (
      <div className="mt-3 rounded-lg border border-forest/20 bg-forest/5 p-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            id={id}
            name={id}
            checked={checked}
            onChange={handleChange}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-latte/40 text-forest focus:ring-forest"
          />
          <span className="text-xs leading-relaxed text-mocha">
            <span className="font-semibold text-espresso">
              SMS updates enabled
            </span>{" "}
            — You&apos;ll receive order status texts (confirmation, ready-for-pickup).
            Message and data rates may apply. Reply STOP to cancel.{" "}
            <Link
              href="/account/notifications"
              className="text-forest hover:underline"
            >
              Manage preferences
            </Link>
          </span>
        </label>
      </div>
    );
  }

  // Full consent view for first-time customers or those who haven't opted in
  return (
    <div className="mt-3 rounded-lg border border-latte/20 bg-cream/40 p-3">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          id={id}
          name={id}
          checked={checked}
          onChange={handleChange}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-latte/40 text-forest focus:ring-forest"
        />
        <span className="text-xs leading-relaxed text-mocha">
          Yes, send me SMS order status updates (confirmation, ready-for-pickup,
          and shipping notifications). Message frequency varies based on order
          activity. Message and data rates may apply. Reply HELP for help or
          STOP to cancel at any time. See our{" "}
          <Link href="/terms" className="text-forest hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-forest hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
    </div>
  );
}
