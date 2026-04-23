import Link from "next/link";
import { Truck, Package, RotateCcw, Clock, MapPin, Shield } from "lucide-react";

export const metadata = {
  title: "Shipping & Returns | Kynda Coffee",
  description: "Shipping rates, delivery times, and our hassle-free return policy at Kynda Coffee.",
};

export default function ShippingPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <div className="text-center">
          <Truck className="mx-auto h-10 w-10 text-rust" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-espresso">
            Shipping & Returns
          </h1>
          <p className="mt-3 text-base text-mocha">
            Fast, reliable shipping and a satisfaction guarantee on every order.
          </p>
        </div>

        {/* Shipping Options */}
        <div className="mt-10 rounded-2xl border border-latte/20 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Package className="h-5 w-5 text-rust" />
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Shipping Options
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                name: "Free Shipping",
                price: "$0",
                time: "3-7 business days",
                note: "On all orders over $50",
                icon: Shield,
              },
              {
                name: "Standard Shipping",
                price: "$5.99",
                time: "3-7 business days",
                note: "Flat rate for orders under $50",
                icon: Truck,
              },
              {
                name: "Local Pickup",
                price: "$0",
                time: "Same day (Mon-Sat)",
                note: "4315 FM 2147, Horseshoe Bay, TX",
                icon: MapPin,
              },
            ].map((option) => (
              <div
                key={option.name}
                className="flex items-start gap-4 rounded-xl border border-latte/20 bg-cream p-4"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white">
                  <option.icon className="h-5 w-5 text-rust" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-espresso">{option.name}</p>
                    <span className="text-sm font-semibold text-espresso">{option.price}</span>
                  </div>
                  <p className="text-sm text-mocha">{option.time}</p>
                  <p className="text-xs text-mocha/70 mt-0.5">{option.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Timeline */}
        <div className="mt-6 rounded-2xl border border-latte/20 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="h-5 w-5 text-rust" />
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Delivery Timeline
            </h2>
          </div>
          <div className="space-y-0">
            {[
              { step: "Order Placed", desc: "You receive an order confirmation email", time: "Day 0" },
              { step: "Processing", desc: "We pick, pack, and prepare your order", time: "1-2 days" },
              { step: "Shipped", desc: "Tracking number emailed to you", time: "1-2 days" },
              { step: "In Transit", desc: "USPS handles delivery to your door", time: "3-5 days" },
              { step: "Delivered", desc: "Enjoy your Kynda Coffee!", time: "Total: 3-7 days" },
            ].map((step, i) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rust/10 text-xs font-bold text-rust">
                    {i + 1}
                  </div>
                  {i < 4 && <div className="mt-1 h-full w-px bg-latte/20" />}
                </div>
                <div className="pb-6">
                  <p className="font-medium text-espresso">{step.step}</p>
                  <p className="text-sm text-mocha">{step.desc}</p>
                  <p className="text-xs text-mocha/60 mt-0.5">{step.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Returns Policy */}
        <div className="mt-6 rounded-2xl border border-latte/20 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <RotateCcw className="h-5 w-5 text-rust" />
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Returns & Satisfaction Guarantee
            </h2>
          </div>
          <div className="space-y-4 text-sm text-mocha leading-relaxed">
            <p>
              We stand behind every product we sell. If you&apos;re not completely satisfied with your order, we&apos;ll make it right.
            </p>
            <div className="rounded-xl bg-cream p-4 space-y-3">
              <p className="font-medium text-espresso">Coffee & Food</p>
              <p>
                If your coffee doesn&apos;t meet expectations, contact us within 30 days for a full refund or replacement. We may ask a few questions to help us improve, but there&apos;s no hassle.
              </p>
            </div>
            <div className="rounded-xl bg-cream p-4 space-y-3">
              <p className="font-medium text-espresso">Merchandise</p>
              <p>
                Unworn, unwashed items with tags attached can be returned within 30 days for a full refund. Custom AI-designed items are made to order and can only be returned if defective.
              </p>
            </div>
            <div className="rounded-xl bg-cream p-4 space-y-3">
              <p className="font-medium text-espresso">How to Return</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Email us at kyndacoffee@gmail.com with your order number</li>
                <li>We&apos;ll send you a prepaid return label (for defective/wrong items)</li>
                <li>Drop off at any USPS location</li>
                <li>Refund processed within 3-5 business days of receipt</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/track-order" className="btn-primary inline-flex">
            Track an Order
          </Link>
        </div>
      </div>
    </section>
  );
}
