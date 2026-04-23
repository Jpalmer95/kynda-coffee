"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gift, CheckCircle, Copy } from "lucide-react";
import { useState } from "react";

export default function GiftCardSuccessPage() {
  const params = useSearchParams();
  const code = params.get("code");
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/10">
          <CheckCircle className="h-8 w-8 text-sage" />
        </div>
        <h1 className="mt-4 font-heading text-2xl sm:text-3xl font-bold text-espresso">
          Gift Card Purchased!
        </h1>
        <p className="mt-2 text-mocha">
          Your gift card has been created and emailed to the recipient.
        </p>

        {code && (
          <div className="mt-6 rounded-xl border-2 border-dashed border-latte/30 bg-white p-5">
            <p className="text-sm text-mocha mb-2">Gift Card Code</p>
            <div className="flex items-center justify-center gap-3">
              <code className="rounded-lg bg-cream px-4 py-2 text-lg font-mono font-bold text-espresso tracking-wider">
                {code}
              </code>
              <button
                onClick={copyCode}
                className="rounded-lg p-2 hover:bg-latte/10 transition-colors"
                aria-label="Copy code"
              >
                {copied ? (
                  <CheckCircle className="h-5 w-5 text-sage" />
                ) : (
                  <Copy className="h-5 w-5 text-mocha" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/shop" className="btn-primary w-full sm:w-auto">
            <Gift className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
          <Link href="/gift-cards" className="btn-secondary w-full sm:w-auto">
            Buy Another
          </Link>
        </div>
      </div>
    </section>
  );
}
