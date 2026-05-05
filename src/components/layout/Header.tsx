"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ShoppingBag, Menu, X, Coffee, Search, User } from "lucide-react";
import { useCartStore } from "@/hooks/useCart";
import { useCartDrawer } from "@/hooks/useCartDrawer";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/shop", label: "Shop" },
  { href: "/studio", label: "Design Studio" },
  { href: "/training", label: "Training" },
  { href: "/about", label: "Our Story" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const itemCount = useCartStore((s) => s.item_count);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Track scroll for header background
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 border-b border-transparent transition-all duration-200",
          scrolled || mobileOpen
            ? "border-latte/30 bg-cream/95 shadow-sm backdrop-blur-md"
            : "bg-cream/80 backdrop-blur-sm"
        )}
        role="banner"
      >
        <div className="container-max flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-rust"
            aria-label="Kynda Coffee Home"
          >
            <Coffee className="h-7 w-7 text-rust sm:h-8 sm:w-8" aria-hidden="true" />
            <span className="font-heading text-xl font-bold text-espresso sm:text-2xl">
              Kynda
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 xl:gap-8 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative rounded-md px-1 py-2 text-sm font-medium text-mocha transition-colors hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/search"
              className="hidden rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust sm:flex"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>

            <button
              onClick={() => useCartDrawer.getState().toggle()}
              className="relative rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust"
              aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
            >
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rust text-[11px] font-bold text-white">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>

            <Link
              href="/account"
              className="hidden rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust lg:flex"
              aria-label="My account"
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-xl p-2 text-espresso transition-colors hover:bg-latte-50 focus-visible:ring-2 focus-visible:ring-rust lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-0 z-40 bg-cream transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ top: "57px" }}
        aria-hidden={!mobileOpen}
      >
        <nav className="flex h-full flex-col gap-1 overflow-y-auto px-4 py-6" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3.5 text-base font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust"
            >
              {link.label}
            </Link>
          ))}
          <div className="my-3 border-t border-latte/20" />
          <Link
            href="/search"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            Search
          </Link>
          <Link
            href="/account"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust"
          >
            <User className="h-5 w-5" aria-hidden="true" />
            My Account
          </Link>
          <button
            onClick={() => {
              setMobileOpen(false);
              useCartDrawer.getState().setOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-rust"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            Cart
            {itemCount > 0 && (
              <span className="ml-auto rounded-full bg-rust px-2.5 py-0.5 text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-[57px] sm:h-[65px]" aria-hidden="true" />
    </>
  );
}
