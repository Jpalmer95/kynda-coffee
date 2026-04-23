"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Coffee, Sparkles, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/hooks/useCart";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/menu", label: "Menu", icon: Coffee },
  { href: "/studio", label: "Studio", icon: Sparkles },
  { href: "/account", label: "Account", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.item_count);

  // Hide on admin routes and checkout
  if (pathname.startsWith("/admin") || pathname.startsWith("/shop/checkout")) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-latte/30 bg-cream/95 pb-safe backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
      aria-label="Mobile navigation"
    >
      {/* Floating search shortcut */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <Link
          href="/search"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full shadow-lg border-2 transition-all",
            pathname === "/search"
              ? "bg-espresso text-cream border-espresso"
              : "bg-white text-espresso border-latte/30 hover:border-rust hover:text-rust"
          )}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex items-center justify-around px-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isCart = item.href === "/shop";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors min-w-[3.5rem]",
                isActive ? "text-espresso" : "text-mocha/60"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <item.icon className={cn("h-6 w-6", isActive && "text-rust")} strokeWidth={isActive ? 2.5 : 1.5} />
                {isCart && itemCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rust text-[10px] font-bold text-white ring-2 ring-cream">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
