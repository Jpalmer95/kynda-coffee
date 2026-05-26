"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Minus, Plus, ShoppingCart, Trash2, Users, ChevronDown, ChevronUp } from "lucide-react";
import type {
  PosCatalogCategoryGroup,
  PosCatalogItem,
  PosCatalogModifier,
} from "@/lib/pos/catalog";
import { formatMoney } from "@/lib/pos/catalog";
import { formatPrice } from "@/lib/utils";
import type { QrFulfillmentMode, QrPaymentPreference } from "@/lib/orders/qr-order";

interface CartLine {
  id: string;
  providerItemId: string;
  providerVariationId?: string;
  itemName: string;
  variationName?: string;
  quantity: number;
  modifierIds: string[];
  modifierNames: string[];
  unitPriceCents: number;
}

interface Props {
  categories: PosCatalogCategoryGroup[];
  generatedAt: string;
  initialMode?: string;
  initialLabel?: string;
}

function selectedVariationId(item: PosCatalogItem, formData: FormData): string {
  return String(formData.get(`variation:${item.providerItemId}`) || item.variations[0]?.providerVariationId || "");
}

function selectedModifierIds(item: PosCatalogItem, formData: FormData): string[] {
  return item.modifierLists.flatMap((list) =>
    formData.getAll(`modifier:${item.providerItemId}:${list.providerModifierListId}`).map(String)
  );
}

function modifierById(item: PosCatalogItem, id: string): PosCatalogModifier | undefined {
  return item.modifierLists.flatMap((l) => l.modifiers).find((m) => m.providerModifierId === id);
}

function lineKey(itemId: string, varId: string, mods: string[]): string {
  return [itemId, varId || "", [...mods].sort().join(",")].join("|");
}

export function OrderClient({ categories, initialMode, initialLabel }: Props) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const initialFulfillment: QrFulfillmentMode = 
    initialMode === "table" ? "table" :
    initialMode === "parking" ? "parking" :
    initialMode === "pickup" ? "pickup" : "lobby";

  const [fulfillmentMode, setFulfillmentMode] = useState<QrFulfillmentMode>(initialFulfillment);
  const [fulfillmentLabel, setFulfillmentLabel] = useState(initialLabel || "");
  const [carDescription, setCarDescription] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentPreference, setPaymentPreference] = useState<QrPaymentPreference>("pay_at_counter");
  const [splitBill, setSplitBill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [showCart, setShowCart] = useState(false);

  // Track expanded modifier lists per item
  const [expandedModifiers, setExpandedModifiers] = useState<Record<string, boolean>>({});

  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const subtotalCents = useMemo(
    () => cart.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0),
    [cart]
  );

  function toggleModifierList(itemId: string, listId: string) {
    setExpandedModifiers((prev) => ({
      ...prev,
      [`${itemId}:${listId}`]: !prev[`${itemId}:${listId}`],
    }));
  }

  function addItem(item: PosCatalogItem, form: HTMLFormElement) {
    const formData = new FormData(form);
    const providerVariationId = selectedVariationId(item, formData);
    const variation = item.variations.find((v) => v.providerVariationId === providerVariationId) ?? item.variations[0];
    if (!variation) return;

    const modifierIds = selectedModifierIds(item, formData);
    const modifiers = modifierIds.map((id) => modifierById(item, id)).filter(Boolean) as PosCatalogModifier[];
    const quantity = Math.max(1, Math.min(20, Number(formData.get(`quantity:${item.providerItemId}`) || 1)));
    const unitPrice = variation.priceCents + modifiers.reduce((sum, m) => sum + m.priceCents, 0);
    const id = lineKey(item.providerItemId, variation.providerVariationId, modifierIds);

    setCart((current) => {
      const existing = current.find((line) => line.id === id);
      if (existing) {
        return current.map((line) =>
          line.id === id ? { ...line, quantity: Math.min(20, line.quantity + quantity) } : line
        );
      }
      return [
        ...current,
        {
          id,
          providerItemId: item.providerItemId,
          providerVariationId: variation.providerVariationId,
          itemName: item.name,
          variationName: variation.name,
          quantity,
          modifierIds,
          modifierNames: modifiers.map((m) => m.name),
          unitPriceCents: unitPrice,
        },
      ];
    });
    setShowCart(true);
    form.reset();
  }

  function updateQuantity(id: string, qty: number) {
    if (qty < 1) return;
    setCart((current) => current.map((line) => (line.id === id ? { ...line, quantity: Math.min(20, qty) } : line)));
  }

  function removeLine(id: string) {
    setCart((current) => current.filter((line) => line.id !== id));
  }

  async function payOnline(orderId: string) {
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start online payment.");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start online payment.");
      setSubmitting(false);
    }
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Please add your name and phone number so we can find you.");
      return;
    }
    if (fulfillmentMode === "pickup" && !carDescription.trim()) {
      setError("Please describe your vehicle so we can bring your order out.");
      return;
    }

    setSubmitting(true);
    setError("");

    // For curbside pickup, car description goes in the label field
    const label = fulfillmentMode === "pickup" ? carDescription.trim() : fulfillmentLabel.trim() || undefined;

    const payload = {
      items: cart.map((line) => ({
        providerItemId: line.providerItemId,
        providerVariationId: line.providerVariationId,
        quantity: line.quantity,
        modifierIds: line.modifierIds,
      })),
      customer: { name: customerName.trim(), phone: customerPhone.trim(), email: customerEmail.trim() || undefined },
      fulfillment: { mode: fulfillmentMode, label },
      notes: orderNotes.trim() || undefined,
      paymentPreference,
      splitBill,
    };

    try {
      const res = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Could not submit order");
      }

      // If paying online, redirect to Stripe Checkout immediately
      if (paymentPreference === "stripe" && json.order?.id) {
        await payOnline(json.order.id);
        return;
      }

      setSuccess(json);
      setCart([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-12">
      {/* Order Options */}
      <div className="mb-0 flex flex-wrap gap-2">
        {(["table", "lobby", "pickup", "parking"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setFulfillmentMode(mode)}
            className={`rounded-[4px] px-5 py-3 text-sm font-medium transition cursor-pointer ${
              fulfillmentMode === mode
                ? "bg-surface-800 text-sand border border-[forest]/30 shadow-[0_0_15px_rgba(74,222,128,0.1)]"
                : "bg-surface-800 text-sand-50 border border-latte hover:bg-cream-200 hover:border-forest"
            }`}
          >
            {mode === "table" ? "Table" : mode === "parking" ? "Parking Spot" : mode === "pickup" ? "Curbside Auto" : "Lobby Pickup"}
          </button>
        ))}
      </div>

      {/* Fulfillment label for table/parking */}
      {fulfillmentMode !== "lobby" && fulfillmentMode !== "pickup" && (
        <div className="mb-0 mt-8 max-w-sm">
          <label className="block text-sm font-medium text-[mocha] mb-1">
            {fulfillmentMode === "table" ? "Table number or name" : "Parking spot number"}
          </label>
          <input
            type="text"
            value={fulfillmentLabel}
            onChange={(e) => setFulfillmentLabel(e.target.value)}
            placeholder={fulfillmentMode === "table" ? "Table 7" : "Spot A14"}
            className="w-full rounded-[4px] border border-[latte] bg-surface-deep px-4 py-3 text-lg text-sand focus:border-forest focus:ring-1 focus:ring-forest outline-none"
          />
        </div>
      )}

      {/* Car description for curbside pickup */}
      {fulfillmentMode === "pickup" && (
        <div className="mb-0 mt-8 max-w-md">
          <label className="block text-sm font-medium text-[mocha] mb-1">
            Vehicle description <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-[latte-500] mb-2">
            So we can find you easily when we bring your order out.
          </p>
          <input
            type="text"
            value={carDescription}
            onChange={(e) => setCarDescription(e.target.value)}
            placeholder="e.g. Blue Honda Civic, TX plate ABC-123"
            className="w-full rounded-[4px] border border-[latte] bg-surface-deep px-4 py-3 text-lg text-sand focus:border-forest focus:ring-1 focus:ring-forest outline-none"
            required
          />
        </div>
      )}

      {/* Split bill option */}
      <label className="mb-8 mt-8 flex items-center gap-3 text-sm text-[mocha] cursor-pointer max-w-fit hover:text-white transition-colors">
        <input
          type="checkbox"
          checked={splitBill}
          onChange={(e) => setSplitBill(e.target.checked)}
          className="accent-forest size-4 cursor-pointer"
        />
        <span className="flex items-center gap-2 select-none">
          <Users className="size-4 text-[forest]" /> This is a group order — split the bill later
        </span>
      </label>

      <div className="space-y-12">
        {categories.map((category, idx) => (
          <div key={idx}>
            <h2 className="mb-6 font-heading text-3xl font-bold tracking-tight text-sand border-b border-latte/20 pb-4">
              {category.name}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.items.map((item) => (
                <div key={item.providerItemId} className="flex flex-col h-full rounded-[12px] border border-[latte] bg-[surface-card] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-1 hover:border-[forest]/30 hover:shadow-[0_0_20px_rgba(74,222,128,0.1)]">
                  <div className="flex flex-col justify-between mb-4">
                    <div>
                      <h3 className="font-heading text-xl font-bold tracking-tight text-sand">{item.name}</h3>
                      {item.description && <p className="mt-2 text-sm text-[mocha] line-clamp-2">{item.description}</p>}
                    </div>
                    <div className="font-mono text-base font-bold text-[forest] mt-3">
                      from {formatMoney(item.variations[0]?.priceCents ?? 0)}
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); addItem(item, e.currentTarget); }} className="mt-auto flex flex-col space-y-4">
                    {/* Variations */}
                    {item.variations.length > 1 && (
                      <div>
                        <div className="text-[11px] font-bold tracking-widest text-[mocha] mb-2 uppercase">SIZE / OPTION</div>
                        <div className="flex flex-wrap gap-2">
                          {item.variations.map((v) => (
                            <label key={v.providerVariationId} className="cursor-pointer">
                              <input type="radio" name={`variation:${item.providerItemId}`} value={v.providerVariationId} defaultChecked={v === item.variations[0]} className="peer hidden" />
                              <div className="rounded-[4px] border border-[latte] bg-surface-deep px-3 py-1.5 text-sm peer-checked:border-forest peer-checked:bg-forest/10 peer-checked:text-forest-300">
                                {v.name} &nbsp; {formatMoney(v.priceCents)}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modifiers */}
                    {item.modifierLists.length > 0 && (
                      <div className="space-y-3">
                        {item.modifierLists.map((list) => {
                          const isExpanded = expandedModifiers[`${item.providerItemId}:${list.providerModifierListId}`];
                          const visibleModifiers = isExpanded ? list.modifiers : list.modifiers.slice(0, 10);
                          const hasMore = list.modifiers.length > 10;
                          // Use radio when only 1 modifier can be selected, or when explicitly single-selection
                          const inputType = (list.selectionType === "single" || list.maxSelectedModifiers === 1) ? "radio" : "checkbox";

                          return (
                            <div key={list.providerModifierListId}>
                              <div className="mb-2 text-[11px] font-bold tracking-widest text-[mocha] uppercase">{list.name}</div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                {visibleModifiers.map((mod) => {
                                  const inputName = `modifier:${item.providerItemId}:${list.providerModifierListId}`;
                                  return (
                                    <label key={mod.providerModifierId} className="flex items-center gap-2 cursor-pointer">
                                      <input type={inputType} name={inputName} value={mod.providerModifierId} className="accent-forest border-[latte] bg-surface-deep size-4" />
                                      <span className="text-sand">{mod.name}</span> {mod.priceCents > 0 && <span className="text-[latte-500] font-mono text-xs">+{formatMoney(mod.priceCents)}</span>}
                                    </label>
                                  );
                                })}
                              </div>
                              {hasMore && (
                                  <button
                                   type="button"
                                   onClick={() => toggleModifierList(item.providerItemId, list.providerModifierListId)}
                                   className="mt-3 flex items-center gap-1 text-[11px] font-bold tracking-widest text-[forest] uppercase hover:text-forest-300 transition-colors"
                                 >
                                  {isExpanded ? (
                                    <>
                                      Show less <ChevronUp className="size-3" />
                                    </>
                                  ) : (
                                    <>
                                      View {list.modifiers.length - 10} more <ChevronDown className="size-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 mt-auto border-t border-[latte]">
                      <input type="number" name={`quantity:${item.providerItemId}`} defaultValue={1} min="1" max="20" className="w-20 rounded-[4px] border border-[latte] bg-surface-deep text-sand px-4 py-2.5 font-mono text-center outline-none focus:ring-1 focus:border-forest focus:ring-forest" />
                      <button type="submit" className="btn-accent shrink-0 tracking-widest text-xs uppercase font-bold w-full py-3 shadow-[0_0_15px_rgba(74,222,128,0.1)] hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]">ADD TO ORDER</button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-[4px] bg-[forest] border border-[forest] px-6 py-4 font-bold tracking-widest text-surface-deep shadow-[0_0_20px_rgba(74,222,128,0.3)] md:bottom-8 md:right-8 uppercase hover:bg-forest-300 hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] transition-all"
        >
        <ShoppingCart className="size-5" /> {itemCount} item{itemCount !== 1 ? "s" : ""} • {formatMoney(subtotalCents)}
      </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/60" onClick={() => setShowCart(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full overflow-auto bg-[surface-sidebar] p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] border-l border-[latte]"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="font-heading text-3xl tracking-tight text-sand">Your Order</div>
                {splitBill && <div className="text-[11px] uppercase tracking-widest text-[forest] font-bold mt-1">Group order (split later)</div>}
              </div>
              <button onClick={() => setShowCart(false)} className="text-xl text-[mocha] hover:text-white">×</button>
            </div>

            {cart.length === 0 ? (
              <p className="text-mocha">Your cart is empty.</p>
            ) : (
              <>
                <div className="divide-y divide-[latte]">
                  {cart.map((line) => (
                    <div key={line.id} className="py-4 flex gap-3 text-sand">
                      <div className="flex-1">
                        <div className="font-heading font-bold text-lg">{line.itemName} {line.variationName && line.variationName !== "Regular" && <span className="text-[latte-500] font-body text-sm font-medium">— {line.variationName}</span>}</div>
                        {line.modifierNames.length > 0 && <div className="text-[11px] uppercase tracking-widest font-bold text-[forest] opacity-90 mt-1">{line.modifierNames.join(" • ")}</div>}
                      </div>
                      <div className="text-right font-mono font-bold w-20 tabular-nums text-[forest] mt-1">{formatPrice(line.unitPriceCents)}</div>
                      <div className="flex items-center gap-2 pl-3 border-l border-[latte]">
                        <button onClick={() => updateQuantity(line.id, line.quantity - 1)} className="hover:text-white text-[mocha]" aria-label="Decrease quantity"><Minus size={15} aria-hidden="true" /></button>
                        <div className="w-7 text-center font-mono tabular-nums tracking-widest font-bold">{line.quantity}</div>
                        <button onClick={() => updateQuantity(line.id, line.quantity + 1)} className="hover:text-white text-[mocha]" aria-label="Increase quantity"><Plus size={15} aria-hidden="true" /></button>
                      </div>
                      <button onClick={() => removeLine(line.id)} className="text-[latte-500] hover:text-red-500 ml-1 transition-colors" aria-label="Remove item"><Trash2 size={15} aria-hidden="true" /></button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[latte] pt-4 mt-6 flex justify-between text-2xl font-bold font-heading text-sand">
                  <div>Total</div>
                  <div className="font-mono text-[forest] break-keep">{formatPrice(subtotalCents)}</div>
                </div>

                {/* Customer Info Form Area */}
                <div className="space-y-4 mt-8">
                  <label className="block">
                    <span className="sr-only">Name</span>
                    <input 
                      type="text" 
                      autoComplete="name" 
                      name="name"
                      placeholder="Your name" 
                      value={customerName} 
                      onChange={(e) => setCustomerName(e.target.value)} 
                      className="input w-full bg-surface-deep border border-[latte] px-4 py-3 rounded-[4px] outline-none focus:border-forest focus:ring-1 focus:ring-forest text-sand" 
                      required 
                    />
                  </label>
                  
                  <label className="block">
                    <span className="sr-only">Phone</span>
                    <input 
                      type="tel" 
                      autoComplete="tel" 
                      name="phone"
                      placeholder="Phone number" 
                      value={customerPhone} 
                      onChange={(e) => setCustomerPhone(e.target.value)} 
                      className="input w-full bg-surface-deep border border-[latte] px-4 py-3 rounded-[4px] outline-none focus:border-forest focus:ring-1 focus:ring-forest text-sand" 
                      required 
                    />
                  </label>
                  
                  <label className="block">
                    <span className="sr-only">Email</span>
                    <input 
                      type="email" 
                      autoComplete="email" 
                      name="email"
                      placeholder="Email (optional)" 
                      value={customerEmail} 
                      onChange={(e) => setCustomerEmail(e.target.value)} 
                      className="input w-full bg-surface-deep border border-[latte] px-4 py-3 rounded-[4px] outline-none focus:border-forest focus:ring-1 focus:ring-forest text-sand" 
                    />
                  </label>
                  
                  <label className="block">
                    <span className="sr-only">Notes</span>
                    <textarea 
                      placeholder="Order notes for the whole ticket (optional)" 
                      value={orderNotes} 
                      name="notes"
                      onChange={(e) => setOrderNotes(e.target.value)} 
                      className="input w-full resize-y bg-surface-deep border border-[latte] px-4 py-3 rounded-[4px] outline-none focus:border-forest focus:ring-1 focus:ring-forest text-sand" 
                    />
                  </label>
                </div>

                <div className="mt-8 mb-8 border-t border-[latte] pt-6">
                  <div className="font-bold text-[11px] mb-2 tracking-widest text-[mocha] uppercase">HOW WOULD YOU LIKE TO PAY?</div>
                  <select value={paymentPreference} onChange={(e) => setPaymentPreference(e.target.value as QrPaymentPreference)} className="input w-full bg-surface-deep border border-[latte] px-4 py-3 rounded-[4px] mt-2 block appearance-none outline-none focus:ring-1 focus:border-forest focus:ring-forest text-sand cursor-pointer text-base">
                    <option value="pay_at_counter">Pay at Counter (Cash, Card)</option>
                    <option value="stripe">Pay Online (Card, Apple Pay, Google Pay)</option>
                  </select>
                </div>
                
                {error && <div className="mt-4 text-red-500 text-sm border-l-2 border-red-500 pl-3">{error}</div>}
                
                <button
                  onClick={submitOrder}
                  disabled={submitting || cart.length === 0}
                  className="mt-8 w-full btn-accent flex items-center justify-center gap-2 disabled:opacity-70 py-4 text-base tracking-widest font-bold uppercase transition-transform shadow-[0_0_20px_rgba(74,222,128,0.15)] hover:shadow-[0_0_25px_rgba(74,222,128,0.3)] hover:-translate-y-1 hover:border-[forest-300]"
                >
                  {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : paymentPreference === "stripe" ? "PAY & PLACE ORDER" : "SUBMIT ORDER"}
                </button>

                <div className="mt-4 text-center text-xs tracking-wide text-[mocha]">
                  {paymentPreference === "stripe"
                    ? "You'll be redirected to our secure Stripe checkout (Cards, Apple Pay, Google Pay)."
                    : "You'll see a confirmation number on screen after you submit."}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success State */}
      {success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6 backdrop-blur-[12px]">
          <div className="max-w-md text-center bg-[surface-card] border border-[latte] rounded-[12px] p-9 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="mx-auto mb-4 h-12 w-12 rounded-[4px] bg-[forest] text-surface-deep flex items-center justify-center font-bold text-lg">✓</div>
            <div className="font-heading text-4xl font-bold tracking-tight text-sand">Order received</div>
            <div className="mx-auto mt-3 max-w-xs text-sm text-[mocha]">
              We got order <strong className="text-[forest]">#{success.order?.order_number ?? success.order_number}</strong>. We'll start crafting it right away.
            </div>
            {paymentPreference === "stripe" ? (
              <button disabled={submitting} onClick={() => { if (success.order?.id) payOnline(success.order.id); }} className="mt-8 btn-accent w-full flex items-center justify-center gap-2 uppercase tracking-widest font-bold py-4">
                {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : "PAY SECURELY"}
              </button>
            ) : (
              <button onClick={() => { setSuccess(null); setShowCart(false); }} className="mt-8 btn-accent w-full uppercase tracking-widest font-bold py-4">AWESOME — THANKS</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
