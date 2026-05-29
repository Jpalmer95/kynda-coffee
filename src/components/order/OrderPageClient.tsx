"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { QrFulfillmentMode } from "@/lib/orders/qr-order";
import type { PosCatalogCategoryGroup } from "@/lib/pos/catalog";
import { FulfillmentModeSelector } from "./FulfillmentModeSelector";
import { DeliveryPlatforms } from "./DeliveryPlatforms";
import { OrderClient } from "./OrderClient";

interface OrderPageClientProps {
  categories: PosCatalogCategoryGroup[];
  generatedAt: string;
  initialMode?: string;
  initialLabel?: string;
  initialTableNumber?: string;
}

export function OrderPageClient({
  categories,
  generatedAt,
  initialMode,
  initialLabel,
  initialTableNumber,
}: OrderPageClientProps) {
  const router = useRouter();
  const orderSectionRef = useRef<HTMLDivElement>(null);

  const parseInitialMode = (m?: string): QrFulfillmentMode | "delivery" | null => {
    if (!m) return null;
    if (m === "table" || m === "lobby" || m === "pickup" || m === "parking") return m;
    if (m === "delivery") return "delivery";
    return null;
  };

  const [selectedMode, setSelectedMode] = useState<QrFulfillmentMode | "delivery" | null>(
    parseInitialMode(initialMode)
  );
  const [initialMount, setInitialMount] = useState(true);

  // Persist mode choice to URL so QR links + deep links work
  const handleSelectMode = useCallback(
    (mode: QrFulfillmentMode | "delivery") => {
      setSelectedMode(mode);
      const params = new URLSearchParams(window.location.search);
      params.set("mode", mode);
      router.replace(`/order?${params.toString()}`, { scroll: false });

      // Scroll down to the order form after a short delay
      if (mode !== "delivery") {
        setTimeout(() => {
          orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      }
    },
    [router]
  );

  // Auto-scroll to order form on mount if mode was provided via URL
  useEffect(() => {
    if (initialMount && selectedMode && selectedMode !== "delivery") {
      // Wait for render, then scroll
      const timer = setTimeout(() => {
        orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
      setInitialMount(false);
      return () => clearTimeout(timer);
    }
    if (initialMount) setInitialMount(false);
  }, [initialMount, selectedMode]);

  return (
    <div className="space-y-10">
      {/* Fulfillment Mode Picker */}
      <section aria-labelledby="fulfillment-heading">
        <FulfillmentModeSelector selectedMode={selectedMode} onSelect={handleSelectMode} />
      </section>

      {/* Delivery platforms (shown when user picks delivery) */}
      {selectedMode === "delivery" && (
        <section aria-labelledby="delivery-heading" className="animate-fade-in">
          <DeliveryPlatforms />
        </section>
      )}

      {/* Order form — only shown for non-delivery modes */}
      {selectedMode && selectedMode !== "delivery" && (
        <div ref={orderSectionRef} className="scroll-mt-24">
          {initialTableNumber && selectedMode === "table" && (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-forest/10 border border-forest/30 px-4 py-2.5 text-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-sand text-xs font-bold">
                ✓
              </span>
              <span className="text-sm font-semibold text-espresso">
                Ordering for Table {initialTableNumber} — we&apos;ll bring it right to you
              </span>
            </div>
          )}
          <OrderClient
            categories={categories}
            generatedAt={generatedAt}
            initialMode={selectedMode}
            initialLabel={initialLabel}
            initialTableNumber={initialTableNumber}
          />
        </div>
      )}

      {/* Default state: prompt the user to pick */}
      {!selectedMode && (
        <div className="rounded-xl border border-dashed border-latte/40 bg-card/30 p-8 text-center">
          <p className="text-mocha">Pick how you&apos;d like to receive your order above to get started.</p>
        </div>
      )}
    </div>
  );
}
