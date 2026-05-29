"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [verifying, setVerifying] = useState(true);
  const [data, setData] = useState<{
    email?: string;
    amount?: number;
    order_id?: string;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setVerifying(false);
      return;
    }
    fetch(`/api/checkout/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        setData({
          email: d.session?.customer_email,
          amount: d.session?.amount_total,
          order_id: d.session?.id,
        });
        setVerifying(false);
      })
      .catch(() => setVerifying(false));
  }, [sessionId]);

  if (verifying) {
    return (
      <div className="text-center py-20">
        <Package size={40} className="mx-auto text-mocha animate-pulse mb-4" />
        <p className="text-mocha">Confirming your order...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <CheckCircle size={64} className="mx-auto text-green-600 mb-6" />

      <h1 className="font-heading text-4xl sm:text-5xl font-bold text-espresso">
        Order Confirmed!
      </h1>

      <p className="mt-4 text-lg text-mocha max-w-md mx-auto">
        Your custom merch is being prepared. You'll receive a shipping
        notification via email once it's on the way.
      </p>

      {data?.email && (
        <p className="mt-2 text-sm text-mocha">
          Confirmation sent to <span className="font-medium text-espresso">{data.email}</span>
        </p>
      )}

      {data?.amount && (
        <p className="mt-1 text-sm text-mocha">
          Total charged:{" "}
          <span className="font-medium text-espresso">
            ${(data.amount / 100).toFixed(2)}
          </span>
        </p>
      )}

      <div className="mt-10 space-y-3">
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest text-white font-medium hover:bg-forest/90 transition"
        >
          <Package size={18} />
          Create Another Design
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mt-12 bg-card rounded-xl p-6 border border-latte/20 text-left">
        <h3 className="font-semibold mb-3">What happens next?</h3>
        <ol className="space-y-2 text-sm text-mocha">
          <li className="flex gap-2">
            <span className="font-medium text-espresso">1.</span>
            Your design is reviewed for appropriate content
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-espresso">2.</span>
            Printful begins production (1–3 business days)
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-espresso">3.</span>
            Your order ships with tracking info via email
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-espresso">4.</span>
            Delivery in 5–8 business days (US) or 10–14 (Canada)
          </li>
        </ol>
      </div>

      <Link
        href="/shop/merch"
        className="inline-block mt-8 text-sm text-mocha hover:text-espresso underline"
      >
        Back to Merch Shop
      </Link>
    </div>
  );
}

export default function MerchSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20">
          <Package size={40} className="mx-auto text-mocha animate-pulse" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
