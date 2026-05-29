"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Coffee,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  HandPlatter,
  Send,
  CheckCircle2,
  RotateCcw,
  Bell,
  ArrowLeft,
} from "lucide-react";
import type {
  PosCatalogCategoryGroup,
  PosCatalogItem,
  PosCatalogVariation,
  PosCatalogModifier,
  PosCatalogModifierList,
} from "@/lib/pos/catalog";
import { formatMoney } from "@/lib/pos/catalog";
import {
  useMenuCartStore,
  buildMenuCartItem,
  type MenuCartItem,
} from "@/hooks/useMenuCart";

// ── Types ──────────────────────────────────────────────────────────────────

interface KioskClientProps {
  categories: PosCatalogCategoryGroup[];
  generatedAt: string;
}

type KioskScreen = "browse" | "cart" | "detail" | "success";

// ── Idle timeout (ms) — returns to home screen after inactivity ────────────

const IDLE_TIMEOUT_MS = 60_000; // 60 seconds
const AUTO_REFRESH_MS = 5 * 60_000; // 5 min page refresh

// ── Component ──────────────────────────────────────────────────────────────

export function KioskClient({ categories }: KioskClientProps) {
  const [screen, setScreen] = useState<KioskScreen>("browse");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<PosCatalogItem | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [callStaffToast, setCallStaffToast] = useState(false);

  // Detail-dialog state
  const [detailVariation, setDetailVariation] = useState<PosCatalogVariation | null>(null);
  const [detailModifiers, setDetailModifiers] = useState<Map<string, PosCatalogModifier>>(new Map());
  const [detailQty, setDetailQty] = useState(1);

  const cart = useMenuCartStore();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Idle reset ─────────────────────────────────────────────────────────

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // Only reset if on a non-browse screen or cart is empty
      if (screen !== "browse" || cart.items.length === 0) {
        cart.clearCart();
        setScreen("browse");
        setActiveCategory("all");
        setSelectedItem(null);
      }
    }, IDLE_TIMEOUT_MS);
  }, [screen, cart]);

  useEffect(() => {
    const handler = () => resetIdle();
    window.addEventListener("touchstart", handler, { passive: true });
    window.addEventListener("mousedown", handler);
    resetIdle();
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("mousedown", handler);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  // Auto-refresh the page periodically to pick up catalog changes
  useEffect(() => {
    const t = setInterval(() => window.location.reload(), AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  // ── Filtered categories ────────────────────────────────────────────────

  const filteredCategories = useMemo(() => {
    if (activeCategory === "all") return categories;
    return categories.filter((c) => c.name === activeCategory);
  }, [categories, activeCategory]);

  const allCategoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  // ── Item detail ────────────────────────────────────────────────────────

  function openDetail(item: PosCatalogItem) {
    setSelectedItem(item);
    setDetailVariation(item.variations[0] ?? null);
    setDetailModifiers(new Map());
    setDetailQty(1);
    setScreen("detail");
  }

  function toggleDetailModifier(listId: string, mod: PosCatalogModifier, list: PosCatalogModifierList) {
    setDetailModifiers((prev) => {
      const next = new Map(prev);
      const isSingle = list.selectionType === "single" || list.maxSelectedModifiers === 1;
      if (isSingle) {
        // Radio: toggle or replace
        if (next.get(listId)?.providerModifierId === mod.providerModifierId) {
          next.delete(listId);
        } else {
          next.set(listId, mod);
        }
      } else {
        // Checkbox: toggle
        if (next.get(listId + "|" + mod.providerModifierId)) {
          next.delete(listId + "|" + mod.providerModifierId);
        } else {
          next.set(listId + "|" + mod.providerModifierId, mod);
        }
      }
      return next;
    });
  }

  function addToCartFromDetail() {
    if (!selectedItem || !detailVariation) return;
    const mods = Array.from(detailModifiers.values());
    cart.addItem(buildMenuCartItem(selectedItem, detailVariation, mods, detailQty));
    setScreen("browse");
    setSelectedItem(null);
  }

  // ── Order submission ───────────────────────────────────────────────────

  async function submitOrder() {
    if (cart.items.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const lineItems = cart.items.map((line) => ({
        provider_item_id: line.providerItemId,
        provider_variation_id: line.providerVariationId,
        modifier_ids: line.modifierIds,
        quantity: line.quantity,
      }));
      const payload = {
        items: lineItems,
        fulfillment: {
          mode: "pickup",
          label: "Kiosk",
        },
        payment_preference: "pay_at_counter",
        source: "qr",
        notes: "Kiosk order",
      };
      const res = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Order failed");
      setOrderNumber(json.order?.order_number || "—");
      cart.clearCart();
      setScreen("success");
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function callStaff() {
    setCallStaffToast(true);
    setTimeout(() => setCallStaffToast(false), 4000);
  }

  // ── Compute detail price ───────────────────────────────────────────────

  const detailUnitPrice = useMemo(() => {
    if (!detailVariation) return 0;
    const modsTotal = Array.from(detailModifiers.values()).reduce((s, m) => s + m.priceCents, 0);
    return detailVariation.priceCents + modsTotal;
  }, [detailVariation, detailModifiers]);

  // ── Compute detail line total ──────────────────────────────────────────

  const detailLineTotal = detailUnitPrice * detailQty;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      {/* ──────── Top Bar ──────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/20 bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Coffee className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              Kynda Coffee
            </h1>
            <p className="text-sm text-muted-foreground">Tap any item to get started</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Call Staff */}
          <button
            onClick={callStaff}
            className="flex items-center gap-2 rounded-xl border border-border/30 bg-card px-5 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
          >
            <Bell className="h-5 w-5" />
            <span className="hidden sm:inline">Call Staff</span>
          </button>

          {/* Cart button */}
          <button
            onClick={() => setScreen("cart")}
            className="relative flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" />
            <span>
              {cart.item_count > 0
                ? `${cart.item_count} · ${formatMoney(cart.subtotal_cents)}`
                : "Cart"}
            </span>
            {cart.item_count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
                {cart.item_count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ──────── Main Content ──────── */}
      {screen === "browse" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Category Rail */}
          <nav className="flex w-24 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border/20 bg-card/50 p-3 sm:w-28">
            <CategoryTab
              label="All"
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            />
            {allCategoryNames.map((name) => (
              <CategoryTab
                key={name}
                label={name}
                active={activeCategory === name}
                onClick={() => setActiveCategory(name)}
              />
            ))}
          </nav>

          {/* Item Grid */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {filteredCategories.map((cat) => (
              <div key={cat.name} className="mb-8">
                {activeCategory === "all" && (
                  <h2 className="mb-4 font-heading text-2xl font-bold text-foreground">
                    {cat.name}
                  </h2>
                )}
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {cat.items.map((item) => (
                    <KioskItemCard key={item.providerItemId} item={item} onTap={openDetail} />
                  ))}
                </div>
              </div>
            ))}
            {filteredCategories.every((c) => c.items.length === 0) && (
              <div className="flex h-full items-center justify-center">
                <p className="text-lg text-muted-foreground">No items right now</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ──────── Item Detail Modal ──────── */}
      {screen === "detail" && selectedItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-border/30 bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/20 p-6">
              <div className="flex-1 pr-4">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {selectedItem.name}
                </h2>
                {selectedItem.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{selectedItem.description}</p>
                )}
              </div>
              <button
                onClick={() => { setScreen("browse"); setSelectedItem(null); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground hover:bg-destructive hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 p-6">
              {/* Variations */}
              {selectedItem.variations.length > 1 && (
                <div>
                  <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Size
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.variations.map((v) => (
                      <button
                        key={v.providerVariationId}
                        onClick={() => setDetailVariation(v)}
                        className={`rounded-xl border px-5 py-3 text-base font-semibold transition-all active:scale-95 ${
                          detailVariation?.providerVariationId === v.providerVariationId
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/30 bg-card text-foreground hover:border-primary/50"
                        }`}
                      >
                        {v.name}
                        {v.priceCents !== selectedItem.variations[0].priceCents && (
                          <span className="ml-1 text-sm text-muted-foreground">
                            {formatMoney(v.priceCents)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifier Lists */}
              {selectedItem.modifierLists.map((list) => {
                const isSingle = list.selectionType === "single" || list.maxSelectedModifiers === 1;
                return (
                  <div key={list.providerModifierListId}>
                    <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {list.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {list.modifiers.map((mod) => {
                        const key = isSingle
                          ? list.providerModifierListId
                          : list.providerModifierListId + "|" + mod.providerModifierId;
                        const isActive = detailModifiers.has(key);
                        return (
                          <button
                            key={mod.providerModifierId}
                            onClick={() => toggleDetailModifier(list.providerModifierListId, mod, list)}
                            className={`rounded-xl border px-4 py-3 text-base font-medium transition-all active:scale-95 ${
                              isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/30 bg-card text-foreground hover:border-primary/50"
                            }`}
                          >
                            {mod.name}
                            {mod.priceCents > 0 && (
                              <span className="ml-1 text-sm text-muted-foreground">
                                +{formatMoney(mod.priceCents)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Quantity */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                    className="flex h-14 w-14 items-center justify-center rounded-xl border border-border/30 bg-card text-foreground hover:bg-muted active:scale-95"
                  >
                    {detailQty === 1 ? <Trash2 className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                  </button>
                  <span className="w-12 text-center font-heading text-3xl font-bold text-foreground">
                    {detailQty}
                  </span>
                  <button
                    onClick={() => setDetailQty((q) => Math.min(20, q + 1))}
                    className="flex h-14 w-14 items-center justify-center rounded-xl border border-border/30 bg-card text-foreground hover:bg-muted active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="border-t border-border/20 p-6">
              <button
                onClick={addToCartFromDetail}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-5 text-lg font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                <Plus className="h-6 w-6" />
                Add to Order · {formatMoney(detailLineTotal)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── Cart / Checkout ──────── */}
      {screen === "cart" && (
        <div className="absolute inset-0 z-50 flex flex-col bg-background">
          {/* Cart header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/20 px-6 py-4">
            <button
              onClick={() => setScreen("browse")}
              className="flex items-center gap-2 text-base font-semibold text-foreground hover:text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Menu
            </button>
            <h2 className="font-heading text-2xl font-bold text-foreground">Your Order</h2>
            <div className="w-24" /> {/* Spacer */}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cart.items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
                <p className="mt-4 text-xl font-semibold text-muted-foreground">
                  Your cart is empty
                </p>
                <p className="mt-1 text-muted-foreground">Browse the menu and add items</p>
                <button
                  onClick={() => setScreen("browse")}
                  className="mt-6 rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground hover:bg-primary/90 active:scale-95"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.items.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center gap-4 rounded-xl border border-border/20 bg-card p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-heading text-xl font-bold text-foreground">
                        {line.itemName}
                        {line.variationName && line.variationName !== "Regular" && (
                          <span className="ml-2 text-base font-normal text-muted-foreground">
                            — {line.variationName}
                          </span>
                        )}
                      </div>
                      {line.modifierNames.length > 0 && (
                        <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-primary/80">
                          {line.modifierNames.join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (line.quantity === 1) cart.removeItem(line.id);
                          else cart.updateQuantity(line.id, line.quantity - 1);
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/30 bg-card text-foreground hover:bg-muted active:scale-95"
                      >
                        {line.quantity === 1 ? <Trash2 className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                      </button>
                      <span className="w-8 text-center text-xl font-bold text-foreground">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() => cart.updateQuantity(line.id, line.quantity + 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/30 bg-card text-foreground hover:bg-muted active:scale-95"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="w-24 text-right font-mono text-xl font-bold text-foreground">
                      {formatMoney(line.unitPriceCents * line.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart footer */}
          {cart.items.length > 0 && (
            <div className="shrink-0 border-t border-border/20 bg-card px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </span>
                <span className="font-heading text-3xl font-bold text-primary">
                  {formatMoney(cart.subtotal_cents)}
                </span>
              </div>

              {submitError && (
                <p className="mb-3 rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
                  {submitError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => cart.clearCart()}
                  className="flex items-center gap-2 rounded-xl border border-border/30 bg-card px-6 py-5 text-base font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95"
                >
                  <RotateCcw className="h-5 w-5" />
                  Clear
                </button>
                <button
                  onClick={submitOrder}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-primary py-5 text-xl font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-6 w-6" />
                      Send to Kitchen
                    </>
                  )}
                </button>
              </div>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Pay at the counter when your order is ready
              </p>
            </div>
          )}
        </div>
      )}

      {/* ──────── Success Screen ──────── */}
      {screen === "success" && (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-14 w-14 text-primary" />
          </div>
          <h2 className="mt-6 font-heading text-4xl font-bold text-foreground">
            Order Sent!
          </h2>
          <p className="mt-3 text-xl text-muted-foreground">
            Your order number is
          </p>
          <p className="mt-2 font-heading text-6xl font-bold text-primary">
            #{orderNumber}
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            We&apos;ll have it ready for you shortly.
            <br />
            Please pay at the counter when called.
          </p>
          <button
            onClick={() => {
              setScreen("browse");
              setOrderNumber("");
            }}
            className="mt-8 rounded-xl bg-primary px-10 py-5 text-xl font-bold text-primary-foreground hover:bg-primary/90 active:scale-95"
          >
            Start New Order
          </button>
        </div>
      )}

      {/* ──────── Call Staff Toast ──────── */}
      {callStaffToast && (
        <div className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 animate-fade-in-scale rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-2xl">
          <div className="flex items-center gap-3">
            <HandPlatter className="h-6 w-6" />
            A team member will be with you shortly!
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl px-2 py-4 text-center text-sm font-semibold transition-all active:scale-95 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function KioskItemCard({
  item,
  onTap,
}: {
  item: PosCatalogItem;
  onTap: (item: PosCatalogItem) => void;
}) {
  return (
    <button
      onClick={() => onTap(item)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/20 bg-card text-left transition-all hover:border-primary/40 hover:shadow-lg active:scale-[0.97]"
    >
      {item.imageUrls.length > 0 ? (
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={item.imageUrls[0]}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
          <div className="absolute bottom-2 right-2 rounded-lg bg-card/90 px-3 py-1 text-sm font-bold text-foreground shadow-sm backdrop-blur-sm">
            {item.priceLabel}
          </div>
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-muted">
          <Coffee className="h-10 w-10 text-muted-foreground/40" />
          <div className="absolute bottom-2 right-2 rounded-lg bg-card/90 px-3 py-1 text-sm font-bold text-foreground shadow-sm backdrop-blur-sm">
            {item.priceLabel}
          </div>
        </div>
      )}
      <div className="flex flex-col flex-1 p-3 sm:p-4">
        <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary line-clamp-1 transition-colors">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground hidden sm:block">
            {item.description}
          </p>
        )}
        {item.variations.length > 1 && (
          <span className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-primary/70">
            {item.variations.length} sizes
          </span>
        )}
      </div>
    </button>
  );
}
