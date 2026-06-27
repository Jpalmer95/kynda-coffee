"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/hooks/useCart";
import { useMenuCartStore } from "@/hooks/useMenuCart";
import { useCartDrawer } from "@/hooks/useCartDrawer";
import { ShoppingBag, ArrowRight } from "lucide-react";

/**
 * Floating "View Cart" button.
 * Appears bottom-right when the cart has items.
 * Opens the CartDrawer side panel (which handles both shop and menu items).
 * Hidden on cart, checkout, admin, staff, KDS, and account pages.
 */
export function FloatingCheckout() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const shopCount = useCartStore((s) => s.item_count);
  const menuCount = useMenuCartStore((s) => s.item_count);
  const totalCount = shopCount + menuCount;
  const { setOpen } = useCartDrawer();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted (avoids hydration mismatch)
  if (!mounted) return null;

  // Hide on cart, checkout, admin, staff, kds, account, order pages
  const hiddenPaths = [
    "/shop/cart",
    "/shop/merch/checkout",
    "/checkout",
    "/admin",
    "/staff",
    "/kds",
    "/account",
    "/device-login",
    "/order",
  ];
  if (hiddenPaths.some((p) => pathname.startsWith(p))) return null;

  // Only show if there are items
  if (totalCount === 0) return null;

  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-surface-deep shadow-lg shadow-forest/30 transition-all hover:bg-forest-dark hover:shadow-xl hover:scale-105 active:scale-95 dark:text-surface-deep"
      aria-label={`View cart (${totalCount} ${totalCount === 1 ? "item" : "items"})`}
    >
      <div className="relative">
        <ShoppingBag className="h-5 w-5" />
        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rust text-[10px] font-bold text-white">
          {totalCount}
        </span>
      </div>
      <span className="hidden sm:inline">View Cart</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
