"use client";

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
 * This component is ALWAYS visible on the checkout form (not gated behind
 * phone number entry) so Twilio campaign reviewers can verify the opt-in
 * flow when they visit the page.
 *
 * Show this below the phone number field on any form where customers
 * provide their mobile number.
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
  return (
    <div className="mt-3 rounded-lg border border-latte/20 bg-cream/40 p-3">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          id={id}
          name={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
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
