"use client";

import { useState } from "react";
import Link from "next/link";
import { Coffee, Instagram, Facebook, MapPin, Phone, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { toast } = useToast();

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email || subscribing) return;

    setSubscribing(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubscribed(true);
        setEmail("");
        toast("Welcome to Kynda Coffee Mail! Check your inbox for 10% off.", "success");
      } else {
        toast(data.error || "Something went wrong. Please try again.", "error");
      }
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <footer className="border-t border-latte/30 bg-espresso text-cream" role="contentinfo">
      <div className="container-max px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-rust" aria-label="Kynda Coffee Home">
              <Coffee className="h-8 w-8 text-rust" aria-hidden="true" />
              <span className="font-heading text-2xl font-bold">Kynda</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-latte/70">
              Organic specialty coffee, locally roasted in the Texas Hill Country.
              Every cup tells a story.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="https://instagram.com/kyndacoffee"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-latte/70 transition-colors hover:bg-cream/10 hover:text-cream focus-visible:ring-2 focus-visible:ring-rust"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="https://facebook.com/kyndacoffee"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-latte/70 transition-colors hover:bg-cream/10 hover:text-cream focus-visible:ring-2 focus-visible:ring-rust"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 font-heading text-base font-semibold tracking-wide">Explore</h2>
            <ul className="space-y-2.5 text-sm text-latte/70">
              <li><Link href="/menu" className="inline-block rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Menu</Link></li>
              <li><Link href="/shop" className="inline-block rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Shop</Link></li>
              <li><Link href="/studio" className="inline-block rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Design Studio</Link></li>
              <li><Link href="/gallery" className="inline-block rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Community Gallery</Link></li>
              <li><Link href="/gift-cards" className="inline-block rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Gift Cards</Link></li>
              <li><Link href="/about" className="inline-block rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Our Story</Link></li>
              <li><Link href="/track-order" className="inline-block rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Track Order</Link></li>
              <li><Link href="/contact" className="inline-block rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Contact</Link></li>
            </ul>
          </div>

          {/* Visit Us */}
          <div className="lg:col-span-3">
            <h2 className="mb-4 font-heading text-base font-semibold tracking-wide">Visit Us</h2>
            <address className="not-italic space-y-2.5 text-sm text-latte/70">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-latte/50" aria-hidden="true" />
                <span>4315 FM 2147<br />Horseshoe Bay, TX 78657</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-latte/50" aria-hidden="true" />
                <a href="tel:+15122196781" className="rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">(512) 219-6781</a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-latte/50" aria-hidden="true" />
                <a href="mailto:kyndacoffee@gmail.com" className="rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">kyndacoffee@gmail.com</a>
              </p>
            </address>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h2 className="mb-4 font-heading text-base font-semibold tracking-wide">Stay Connected</h2>
            <p className="mb-3 text-sm text-latte/70">
              Join Kynda Coffee Mail for exclusive deals and 10% off your first order.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 rounded-xl bg-sage/20 px-4 py-3 text-sm text-sage">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <span>You&apos;re on the list!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-lg bg-cream/10 px-3 py-2.5 text-sm text-cream placeholder:text-latte/50 focus:bg-cream/20 focus:outline-none focus:ring-2 focus:ring-rust"
                  aria-label="Email address for newsletter"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="btn-accent flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {subscribing ? "Joining..." : (
                    <>
                      Join
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-latte/20 pt-8 text-center text-xs text-latte/50">
          <p>&copy; {new Date().getFullYear()} Kynda Coffee. All rights reserved.</p>
          <p className="mt-1">4315 FM 2147, Horseshoe Bay, TX 78657</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
            <Link href="/help" className="rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Help</Link>
            <Link href="/shipping" className="rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Shipping</Link>
            <Link href="/size-guide" className="rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Size Guide</Link>
            <Link href="/privacy" className="rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Privacy</Link>
            <Link href="/terms" className="rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Terms</Link>
            <Link href="/accessibility" className="rounded transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-rust">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
