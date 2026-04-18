"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

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
    <Suspense fallback={<div className="section-padding text-center">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
