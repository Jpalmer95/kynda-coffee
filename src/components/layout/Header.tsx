"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Menu, X, Coffee } from "lucide-react";
import { useCartStore } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/shop", label: "Shop" },
  { href: "/studio", label: "Design Studio" },
  { href: "/about", label: "Our Story" },
  { href: "/catering", label: "Catering" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const itemCount = useCartStore((s) => s.item_count);

  return (
    <header className="sticky top-0 z-50 border-b border-latte/30 bg-cream/95 backdrop-blur-sm">
      <div className="container-max flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Coffee className="h-8 w-8 text-rust" />
          <span className="font-heading text-2xl font-bold text-espresso">
            Kynda
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-mocha transition-colors hover:text-espresso"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/shop/cart"
            className="relative flex items-center gap-1 text-sm font-medium text-mocha transition-colors hover:text-espresso"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rust text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          <Link href="/account" className="hidden text-sm font-medium text-mocha transition-colors hover:text-espresso lg:block">
            Account
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-6 w-6 text-espresso" />
            ) : (
              <Menu className="h-6 w-6 text-espresso" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 lg:hidden",
          mobileOpen ? "max-h-96 border-t border-latte/30" : "max-h-0"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/account"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg px-4 py-3 text-sm font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
          >
            Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
