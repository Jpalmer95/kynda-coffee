"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ShoppingBag, Menu, X, Search, User } from "lucide-react";
import Image from "next/image";
import { useCartStore } from "@/hooks/useCart";
import { useMenuCartStore } from "@/hooks/useMenuCart";
import { useCartDrawer } from "@/hooks/useCartDrawer";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/shop", label: "Shop" },
  { href: "/studio", label: "Design Studio" },
  { href: "/about", label: "Our Story" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const shopItemCount = useCartStore((s) => s.item_count);
  const menuItemCount = useMenuCartStore((s) => s.item_count);
  const itemCount = shopItemCount + menuItemCount;

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
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          scrolled || mobileOpen
            ? "glass-nav glass-nav-border shadow-sm"
            : "bg-transparent"
        )}
        role="banner"
      >
        <div className="container-max flex items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-forest"
            aria-label="Kynda Coffee Home"
          >
            <Image
              src="/images/logos/kynda-logo-black.png"
              alt="Kynda Coffee"
              width={120}
              height={93}
              className="h-12 sm:h-14 w-auto dark:invert"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 xl:gap-8 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-md px-1 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-forest",
                    isActive
                      ? "text-espresso"
                      : "text-mocha hover:text-espresso"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                  {/* Active indicator — thick bar underneath */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-forest"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/search"
              className="hidden rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-forest sm:flex"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>

            <button
              onClick={() => useCartDrawer.getState().toggle()}
              className="relative rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-forest"
              aria-label={`Shopping cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
            >
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bronze text-[11px] font-bold cart-badge-text">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>

            <Link
              href="/account"
              className="hidden rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-forest lg:flex"
              aria-label="My account"
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>

            {/* Theme toggle */}
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-xl p-2 text-espresso transition-colors hover:bg-latte/20 focus-visible:ring-2 focus-visible:ring-forest lg:hidden"
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
        style={{ top: "85px" }}
        aria-hidden={!mobileOpen}
      >
        <nav className="flex h-full flex-col gap-1 overflow-y-auto px-4 py-6" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-forest",
                  isActive
                    ? "bg-forest/10 text-espresso"
                    : "text-mocha hover:bg-latte/20 hover:text-espresso"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="h-5 w-[3px] rounded-full bg-forest shrink-0" aria-hidden="true" />
                )}
                {link.label}
              </Link>
            );
          })}
          <div className="my-3 border-t border-latte/20" />
          <Link
            href="/search"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-forest"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            Search
          </Link>
          <Link
            href="/account"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-forest"
          >
            <User className="h-5 w-5" aria-hidden="true" />
            My Account
          </Link>
          <button
            onClick={() => {
              setMobileOpen(false);
              useCartDrawer.getState().setOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-mocha transition-colors hover:bg-latte/20 hover:text-espresso focus-visible:ring-2 focus-visible:ring-forest"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            Cart
            {itemCount > 0 && (
              <span className="ml-auto rounded-full bg-bronze px-2.5 py-0.5 text-xs font-bold cart-badge-text">
                {itemCount}
              </span>
            )}
          </button>

          {/* Theme switcher in mobile menu */}
          <div className="mt-2 px-4">
            <span className="text-xs font-medium text-mocha mb-1 block">Theme</span>
            <ThemeToggle />
          </div>
        </nav>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-[85px] sm:h-[95px]" aria-hidden="true" />
    </>
  );
}
