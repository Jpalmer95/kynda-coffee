"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Minus, Plus, ShoppingCart, Trash2, Users } from "lucide-react";
import type {
  PosCatalogCategoryGroup,
  PosCatalogItem,
  PosCatalogModifier,
} from "@/lib/pos/catalog";
import { formatMoney } from "@/lib/pos/catalog";
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
  notes: string;
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

function lineKey(itemId: string, varId: string, mods: string[], notes: string): string {
  return [itemId, varId || "", [...mods].sort().join(","), notes.trim()].join("|");
}

export function OrderClient({ categories, initialMode, initialLabel }: Props) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const initialFulfillment: QrFulfillmentMode = 
    initialMode === "table" ? "table" :
    initialMode === "parking" ? "parking" :
    initialMode === "pickup" || initialMode === "pickup" ? "pickup" : "lobby";

  const [fulfillmentMode, setFulfillmentMode] = useState<QrFulfillmentMode>(initialFulfillment);
  const [fulfillmentLabel, setFulfillmentLabel] = useState(initialLabel || "");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentPreference, setPaymentPreference] = useState<QrPaymentPreference>("pay_at_counter");
  const [splitBill, setSplitBill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [showCart, setShowCart] = useState(false);

  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const subtotalCents = useMemo(
    () => cart.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0),
    [cart]
  );

  function addItem(item: PosCatalogItem, form: HTMLFormElement) {
    const formData = new FormData(form);
    const providerVariationId = selectedVariationId(item, formData);
    const variation = item.variations.find((v) => v.providerVariationId === providerVariationId) ?? item.variations[0];
    if (!variation) return;

    const modifierIds = selectedModifierIds(item, formData);
    const modifiers = modifierIds.map((id) => modifierById(item, id)).filter(Boolean) as PosCatalogModifier[];
    const notes = String(formData.get(`notes:${item.providerItemId}`) || "").trim();
    const quantity = Math.max(1, Math.min(20, Number(formData.get(`quantity:${item.providerItemId}`) || 1)));
    const unitPrice = variation.priceCents + modifiers.reduce((sum, m) => sum + m.priceCents, 0);
    const id = lineKey(item.providerItemId, variation.providerVariationId, modifierIds, notes);

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
          notes,
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

  async function submitOrder() {
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Please add your name and phone number so we can find you.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      items: cart.map((line) => ({
        providerItemId: line.providerItemId,
        providerVariationId: line.providerVariationId,
        quantity: line.quantity,
        modifierIds: line.modifierIds,
        notes: line.notes,
      })),
      customer: { name: customerName.trim(), phone: customerPhone.trim(), email: customerEmail.trim() || undefined },
      fulfillment: { mode: fulfillmentMode, label: fulfillmentLabel.trim() || undefined },
      orderNotes: orderNotes.trim() || undefined,
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
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Could not submit order");
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
      {/* Fulfillment mode selector */}
      <div className="mb-8 flex flex-wrap gap-2">
        {(["table", "lobby", "pickup", "parking"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setFulfillmentMode(mode)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              fulfillmentMode === mode
                ? "bg-surface text-sand"
                : "bg-card text-espresso ring-1 ring-latte/30 hover:bg-latte/10"
            }`}
          >
            {mode === "table" ? "At a Table" : mode === "parking" ? "Parking Spot" : mode === "pickup" ? "Curbside Pickup" : "In the Lobby"}
          </button>
        ))}
      </div>

      {fulfillmentMode !== "lobby" && fulfillmentMode !== "pickup" && (
        <div className="mb-10 max-w-sm">
          <label className="block text-sm font-medium text-mocha mb-1">
            {fulfillmentMode === "table" ? "Table number or name" : fulfillmentMode === "parking" ? "Parking spot #" : "Car description / spot"}
          </label>
          <input
            type="text"
            value={fulfillmentLabel}
            onChange={(e) => setFulfillmentLabel(e.target.value)}
            placeholder={fulfillmentMode === "table" ? "Table 7" : fulfillmentMode === "parking" ? "Spot A14" : "Blue Honda"}
            className="w-full rounded-xl border border-latte/30 px-4 py-3 text-lg"
          />
        </div>
      )}

      {/* Split bill option */}
      <label className="mb-10 flex items-center gap-3 text-sm text-mocha cursor-pointer max-w-fit">
        <input
          type="checkbox"
          checked={splitBill}
          onChange={(e) => setSplitBill(e.target.checked)}
          className="accent-forest size-4"
        />
        <span className="flex items-center gap-2">
          <Users className="size-4" /> This is a group order — we can split the bill later
        </span>
      </label>

      {/* Menu */}
      <div className="space-y-12">
        {categories.map((category, idx) => (
          <div key={idx}>
            <h2 className="mb-5 font-heading text-2xl tracking-tight text-espresso">
              {category.name}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item) => (
                <div key={item.providerItemId} className="rounded-3xl border border-latte/20 bg-card p-6 shadow-sm">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-xl tracking-tight text-espresso">{item.name}</h3>
                      {item.description && <p className="mt-1 text-sm text-mocha/80 line-clamp-2">{item.description}</p>}
                    </div>
                    <div className="font-mono text-lg text-espresso shrink-0 pl-4">
                      {formatMoney(item.variations[0]?.priceCents ?? 0)}
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); addItem(item, e.currentTarget); }} className="space-y-4">
                    {/* Variations */}
                    {item.variations.length > 1 && (
                      <div>
                        <div className="text-xs tracking-widest text-mocha mb-1.5">SIZE / OPTION</div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.variations.map((v) => (
                            <label key={v.providerVariationId} className="cursor-pointer">
                              <input type="radio" name={`variation:${item.providerItemId}`} value={v.providerVariationId} defaultChecked={v === item.variations[0]} className="peer hidden" />
                              <div className="rounded-xl border border-latte/30 bg-card px-3 py-1.5 text-sm peer-checked:border-surface peer-checked:bg-surface peer-checked:text-sand">
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
                        {item.modifierLists.map((list) => (
                          <div key={list.providerModifierListId}>
                            <div className="mb-1.5 text-xs tracking-widest text-mocha">{list.name}</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              {list.modifiers.map((mod) => (
                                <label key={mod.providerModifierId} className="flex items-center gap-1.5">
                                  <input type={list.selectionType === "single" ? "radio" : "checkbox"} name={`modifier:${item.providerItemId}:${list.providerModifierListId}`} value={mod.providerModifierId} />
                                  {mod.name} {mod.priceCents > 0 && <span className="text-mocha">+{formatMoney(mod.priceCents)}</span>}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <input type="number" name={`quantity:${item.providerItemId}`} defaultValue={1} min="1" max="20" className="w-16 rounded-xl border px-3 py-2 font-mono" />
                      <textarea name={`notes:${item.providerItemId}`} placeholder="Any notes? (e.g., oat milk, no lid)" className="flex-1 rounded-2xl border px-4 py-2 text-sm resize-y" />
                      <button type="submit" className="btn-accent shrink-0">Add to order</button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      <button
        onClick={() => setShowCart(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-3xl bg-surface px-6 py-4 font-semibold text-sand shadow-xl md:bottom-8 md:right-8"
      >
        <ShoppingCart className="size-5" /> {itemCount} item{itemCount !== 1 ? "s" : ""} • {formatMoney(subtotalCents)}
      </button>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/60" onClick={() => setShowCart(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full overflow-auto bg-card p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="font-heading text-3xl tracking-tight">Your Order</div>
                {splitBill && <div className="text-sm text-forest font-medium mt-0.5">Group order (you&apos;ll split later)</div>}
              </div>
              <button onClick={() => setShowCart(false)} className="text-xl text-mocha">×</button>
            </div>

            {cart.length === 0 ? (
              <p className="text-mocha">Your cart is empty.</p>
            ) : (
              <>
                <div className="divide-y">
                  {cart.map((line) => (
                    <div key={line.id} className="py-4 flex gap-3">
                      <div className="flex-1">
                        <div className="font-medium">{line.itemName} {line.variationName && `— ${line.variationName}`}</div>
                        {line.modifierNames.length > 0 && <div className="text-xs text-mocha mt-0.5">{line.modifierNames.join(", ")}</div>}
                        {line.notes && <div className="text-xs italic text-mocha/70 mt-0.5">Note: {line.notes}</div>}
                      </div>
                      <div className="text-right font-mono w-20 tabular-nums">{formatMoney(line.unitPriceCents)}</div>
                      <div className="flex items-center gap-2 pl-3 border-l">
                        <button onClick={() => updateQuantity(line.id, line.quantity - 1)}><Minus size={15} /></button>
                        <div className="w-7 text-center font-mono tabular-nums tracking-widest">{line.quantity}</div>
                        <button onClick={() => updateQuantity(line.id, line.quantity + 1)}><Plus size={15} /></button>
                      </div>
                      <button onClick={() => removeLine(line.id)} className="text-forest/70 hover:text-forest ml-1"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mt-4 flex justify-between text-xl font-semibold">
                  <div>Total</div>
                  <div>{formatMoney(subtotalCents)}</div>
                </div>

                {/* Customer Info */}
                <div className="mt-8 space-y-4">
                  <input type="text" placeholder="Your name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input w-full" required />
                  <input type="tel" placeholder="Phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input w-full" required />
                  <input type="email" placeholder="Email (optional)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="input w-full" />
                  <textarea placeholder="Order notes for the whole ticket (optional)" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} className="input w-full resize-y" />
                </div>

                {/* Payment method */}
                <div className="mt-8">
                  <div className="font-medium text-sm mb-2 tracking-widest text-mocha">HOW WOULD YOU LIKE TO PAY?</div>
                  <select value={paymentPreference} onChange={(e) => setPaymentPreference(e.target.value as any)} className="input w-full">
                    <option value="pay_at_counter">Pay at the counter when I arrive</option>
                    <option value="pay_online">Pay with card now (Stripe)</option>
                  </select>
                </div>

                {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}

                <button
                  onClick={submitOrder}
                  disabled={submitting || cart.length === 0}
                  className="mt-6 w-full btn-accent flex items-center justify-center gap-2 disabled:opacity-70 py-4 text-lg"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : "Submit my order"}
                </button>

                <div className="mt-2 text-center text-[11px] text-mocha">You&apos;ll see a confirmation number on screen after you submit.</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success State */}
      {success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6">
          <div className="max-w-md text-center bg-card rounded-3xl p-9">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center">✓</div>
            <div className="font-heading text-4xl tracking-[-1px]">Order received!</div>
            <div className="mx-auto mt-2 max-w-xs text-sm text-mocha">
              We got order #{success.order_number}. We&apos;ll start making it right away.
            </div>
            <button onClick={() => { setSuccess(null); setShowCart(false); }} className="mt-8 btn-accent px-10">Awesome — thanks!</button>
          </div>
        </div>
      )}
    </div>
  );
}
