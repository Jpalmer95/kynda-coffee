"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, Package } from "lucide-react";

interface SessionData {
  id: string;
  customer_email: string;
  amount_total: number;
  shipping_details?: {
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };
  };
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const sessionId = searchParams.get("session_id");
  const [session, setSession] = useState<SessionData | null>(null);
  const [verifying, setVerifying] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) {
      setVerifying(false);
      return;
    }

    fetch(`/api/checkout/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setSession(data.session ?? null);
        setVerifying(false);
      })
      .catch(() => setVerifying(false));
  }, [sessionId]);

  if (!success) {
    return (
      <section className="section-padding">
        <div className="container-max text-center">
          <h1 className="font-heading text-3xl font-bold text-espresso">Checkout</h1>
          <p className="mt-2 text-mocha">Nothing to see here. Browse our shop!</p>
          <Link href="/shop" className="btn-primary mt-6 inline-flex">
            Go to Shop
          </Link>
        </div>
      </section>
    );
  }

  if (verifying) {
    return (
      <section className="section-padding">
        <div className="container-max max-w-lg text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-rust" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-espresso">
            Confirming your order...
          </h1>
          <p className="mt-2 text-sm text-mocha">This will only take a moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-lg text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-sage" />
        <h1 className="mt-4 font-heading text-3xl font-bold text-espresso">
          Order Confirmed!
        </h1>
        <p className="mt-2 text-mocha">
          Thank you for your order. You&apos;ll receive a confirmation email shortly
          with tracking information.
        </p>

        {session && (
          <div className="mt-6 rounded-xl border border-latte/20 bg-white p-5 text-left">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5 text-rust" />
              <span className="font-medium text-espresso">Order Summary</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="text-mocha">
                <span className="text-espresso font-medium">Email:</span> {session.customer_email}
              </p>
              <p className="text-mocha">
                <span className="text-espresso font-medium">Total:</span> ${(session.amount_total / 100).toFixed(2)}
              </p>
              {session.shipping_details?.name && (
                <p className="text-mocha">
                  <span className="text-espresso font-medium">Shipping to:</span> {session.shipping_details.name}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <Link href="/shop" className="btn-primary w-full">
            Continue Shopping
          </Link>
          <Link href="/account/orders" className="btn-secondary w-full">
            View Orders
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <section className="section-padding">
        <div className="container-max max-w-lg text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-rust" />
          <p className="mt-4 text-mocha">Loading...</p>
        </div>
      </section>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
