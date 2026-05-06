"use client";

import { useMemo, useState } from "react";
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import type { PosCatalogCategoryGroup, PosCatalogItem, PosCatalogModifier } from "@/lib/pos/catalog";
import { formatMoney } from "@/lib/pos/catalog";
import type { QrFulfillmentMode, QrPaymentPreference } from "@/lib/orders/qr-order";

interface QrCartLine {
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

function selectedVariationId(item: PosCatalogItem, formData: FormData) {
  return String(formData.get(`variation:${item.providerItemId}`) || item.variations[0]?.providerVariationId || "");
}

function selectedModifierIds(item: PosCatalogItem, formData: FormData) {
  return item.modifierLists.flatMap((list) =>
    formData.getAll(`modifier:${item.providerItemId}:${list.providerModifierListId}`).map(String)
  );
}

function modifierById(item: PosCatalogItem, providerModifierId: string): PosCatalogModifier | undefined {
  return item.modifierLists.flatMap((list) => list.modifiers).find((modifier) => modifier.providerModifierId === providerModifierId);
}

function lineKey(providerItemId: string, providerVariationId: string | undefined, modifierIds: string[], notes: string) {
  return [providerItemId, providerVariationId ?? "", [...modifierIds].sort().join(","), notes.trim()].join("|");
}

export function QrOrderClient({ categories, generatedAt, initialMode, initialLabel }: Props) {
  const [cart, setCart] = useState<QrCartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [fulfillmentMode, setFulfillmentMode] = useState<QrFulfillmentMode>(
    (initialMode === "table" || initialMode === "parking") ? initialMode : "lobby"
  );
  const [fulfillmentLabel, setFulfillmentLabel] = useState(initialLabel || "");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentPreference, setPaymentPreference] = useState<QrPaymentPreference>("pay_at_counter");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string; order_number: string; total_cents: number; payment_status?: string | null } | null>(null);

  const itemCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const subtotalCents = useMemo(() => cart.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0), [cart]);

  function addItem(item: PosCatalogItem, form: HTMLFormElement) {
    const formData = new FormData(form);
    const providerVariationId = selectedVariationId(item, formData);
    const variation = item.variations.find((candidate) => candidate.providerVariationId === providerVariationId) ?? item.variations[0];
    if (!variation) return;

    const modifierIds = selectedModifierIds(item, formData);
    const modifiers = modifierIds.map((id) => modifierById(item, id)).filter(Boolean) as PosCatalogModifier[];
    const notes = String(formData.get(`notes:${item.providerItemId}`) || "").trim();
    const quantity = Math.max(1, Math.min(20, Number(formData.get(`quantity:${item.providerItemId}`) || 1)));
    const unitPriceCents = variation.priceCents + modifiers.reduce((sum, modifier) => sum + modifier.priceCents, 0);
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
          modifierNames: modifiers.map((modifier) => modifier.name),
          notes,
          unitPriceCents,
        },
      ];
    });
  }

  function updateQuantity(id: string, quantity: number) {
    setCart((current) =>
      quantity <= 0
        ? current.filter((line) => line.id !== id)
        : current.map((line) => (line.id === id ? { ...line, quantity: Math.min(20, quantity) } : line))
    );
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
    setError("");
    setSuccess(null);

    if (cart.length === 0) {
      setError("Add at least one item before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: customerName, phone: customerPhone, email: customerEmail },
          fulfillment: { mode: fulfillmentMode, label: fulfillmentLabel },
          paymentPreference,
          notes: orderNotes,
          items: cart.map((line) => ({
            providerItemId: line.providerItemId,
            providerVariationId: line.providerVariationId,
            quantity: line.quantity,
            modifierIds: line.modifierIds,
            notes: line.notes,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Order submission failed.");
      setSuccess({
        id: data.order.id,
        order_number: data.order.order_number,
        total_cents: data.order.total_cents,
        payment_status: data.order.payment_status,
      });
      setCart([]);
      setOrderNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-3xl border border-latte/20 bg-white p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-latte/20 pb-5 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-heading text-2xl font-bold text-espresso">Orderable Items</h2>
            <p className="mt-1 text-sm text-mocha">
              Build a QR/pickup order from the live Square-synced POS catalog. Payment is currently marked pay-at-counter while online payment is wired next.
            </p>
          </div>
          <p className="text-xs text-mocha/60">
            Refreshed {new Date(generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="py-14 text-center">
            <h3 className="font-heading text-xl font-bold text-espresso">Ordering catalog is syncing</h3>
            <p className="mt-2 text-mocha">Please check back shortly or order at the counter.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {categories.map((category) => (
              <div key={category.name}>
                <h3 className="font-heading text-xl font-bold text-espresso">{category.name}</h3>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {category.items.map((item) => (
                    <form
                      key={item.id}
                      className="rounded-2xl border border-latte/20 bg-cream/40 p-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addItem(item, event.currentTarget);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-espresso">{item.name}</h4>
                          {item.description && <p className="mt-1 text-sm text-mocha">{item.description}</p>}
                        </div>
                        <span className="whitespace-nowrap font-semibold text-espresso">{item.priceLabel}</span>
                      </div>

                      {item.variations.length > 1 && (
                        <label className="mt-4 block text-sm font-medium text-espresso">
                          Size / variation
                          <select
                            name={`variation:${item.providerItemId}`}
                            className="mt-1 w-full rounded-xl border border-latte/40 bg-white px-3 py-2 text-sm"
                            defaultValue={item.variations[0]?.providerVariationId}
                          >
                            {item.variations.map((variation) => (
                              <option key={variation.id} value={variation.providerVariationId}>
                                {variation.name} — {variation.priceLabel}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      {item.modifierLists.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {item.modifierLists.map((list) => {
                            const type = list.maxSelectedModifiers === 1 ? "radio" : "checkbox";
                            return (
                              <fieldset key={list.id} className="rounded-xl bg-white px-3 py-2 text-sm">
                                <legend className="font-medium text-espresso">
                                  {list.name}
                                  {list.maxSelectedModifiers ? ` (max ${list.maxSelectedModifiers})` : ""}
                                </legend>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {list.modifiers.map((modifier) => (
                                    <label key={modifier.id} className="relative cursor-pointer">
                                      <input
                                        type={type}
                                        name={`modifier:${item.providerItemId}:${list.providerModifierListId}`}
                                        value={modifier.providerModifierId}
                                        className="peer sr-only"
                                      />
                                      <div className="inline-flex items-center gap-1 rounded-full border border-latte/20 bg-white px-3 py-1.5 text-xs font-medium text-mocha transition-all peer-checked:border-rust peer-checked:bg-rust/5 peer-checked:text-rust hover:border-latte/40 active:scale-95">
                                        {modifier.name}
                                        {modifier.priceCents > 0 && (
                                          <span className="opacity-70">+{modifier.priceLabel}</span>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </fieldset>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-4 grid gap-3 sm:grid-cols-[100px_1fr]">
                        <label className="text-sm font-medium text-espresso">
                          Qty
                          <input
                            name={`quantity:${item.providerItemId}`}
                            type="number"
                            min={1}
                            max={20}
                            defaultValue={1}
                            className="mt-1 w-full rounded-xl border border-latte/40 bg-white px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm font-medium text-espresso">
                          Item note
                          <input
                            name={`notes:${item.providerItemId}`}
                            placeholder="No ice, extra hot, etc."
                            className="mt-1 w-full rounded-xl border border-latte/40 bg-white px-3 py-2 text-sm"
                          />
                        </label>
                      </div>

                      <button type="submit" className="btn-primary mt-4 w-full">
                        Add to QR Order
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="h-fit rounded-3xl border border-latte/20 bg-white p-5 shadow-sm xl:sticky xl:top-24">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-rust" />
          <h2 className="font-heading text-2xl font-bold text-espresso">Your QR Order</h2>
        </div>
        <p className="mt-1 text-sm text-mocha">{itemCount} item{itemCount === 1 ? "" : "s"} · {formatMoney(subtotalCents)}</p>

        <div className="mt-5 grid gap-3">
          <label className="text-sm font-medium text-espresso">
            Name
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 w-full rounded-xl border border-latte/40 px-3 py-2" placeholder="Your name" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="text-sm font-medium text-espresso">
              Phone
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-latte/40 px-3 py-2" placeholder="Text/call if needed" />
            </label>
            <label className="text-sm font-medium text-espresso">
              Email optional
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-latte/40 px-3 py-2" placeholder="you@email.com" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="text-sm font-medium text-espresso">
              Order context
              <select value={fulfillmentMode} onChange={(e) => setFulfillmentMode(e.target.value as QrFulfillmentMode)} className="mt-1 w-full rounded-xl border border-latte/40 px-3 py-2">
                <option value="lobby">Lobby / counter pickup</option>
                <option value="table">Table</option>
                <option value="parking">Parking spot</option>
                <option value="pickup">To-go pickup</option>
              </select>
            </label>
            <label className="text-sm font-medium text-espresso">
              Table / spot
              <input value={fulfillmentLabel} onChange={(e) => setFulfillmentLabel(e.target.value)} className="mt-1 w-full rounded-xl border border-latte/40 px-3 py-2" placeholder="Table 4, Spot 2..." />
            </label>
          </div>
          <label className="text-sm font-medium text-espresso">
            Payment
            <select value={paymentPreference} onChange={(e) => setPaymentPreference(e.target.value as QrPaymentPreference)} className="mt-1 w-full rounded-xl border border-latte/40 px-3 py-2">
              <option value="pay_at_counter">Pay at counter</option>
              <option value="online_later">Online payment coming next</option>
            </select>
          </label>
          <label className="text-sm font-medium text-espresso">
            Order notes
            <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-latte/40 px-3 py-2" placeholder="Anything the team should know?" />
          </label>
        </div>

        <div className="mt-5 space-y-3 border-t border-latte/20 pt-5">
          {cart.length === 0 ? (
            <p className="rounded-2xl bg-cream/60 p-4 text-sm text-mocha">Your QR order is empty.</p>
          ) : (
            cart.map((line) => (
              <div key={line.id} className="rounded-2xl bg-cream/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-espresso">{line.itemName}</p>
                    <p className="text-xs text-mocha">
                      {[line.variationName, ...line.modifierNames].filter(Boolean).join(" · ") || "Regular"}
                    </p>
                    {line.notes && <p className="mt-1 text-xs text-mocha">Note: {line.notes}</p>}
                  </div>
                  <button type="button" onClick={() => updateQuantity(line.id, 0)} className="text-mocha hover:text-rust" aria-label={`Remove ${line.itemName}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQuantity(line.id, line.quantity - 1)} className="rounded-full border border-latte p-1"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-medium">{line.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(line.id, line.quantity + 1)} className="rounded-full border border-latte p-1"><Plus className="h-3 w-3" /></button>
                  </div>
                  <span className="font-semibold text-espresso">{formatMoney(line.unitPriceCents * line.quantity)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-latte/20 pt-5">
          <span className="font-medium text-mocha">Total</span>
          <span className="font-heading text-2xl font-bold text-espresso">{formatMoney(subtotalCents)}</span>
        </div>
        <p className="mt-1 text-xs text-mocha">Taxes/payment reconciliation will be finalized at the counter in this first QR phase.</p>

        {error && <p className="mt-4 rounded-xl bg-rust/10 p-3 text-sm text-rust">{error}</p>}
        {success && (
          <div className="mt-4 rounded-xl bg-sage/15 p-3 text-sm text-espresso">
            <p className="font-semibold">Order submitted: {success.order_number}</p>
            <p>Total: {formatMoney(success.total_cents)}</p>
            <p>Please check in with the Kynda team and pay at the counter, or pay online now.</p>
            {success.payment_status !== "paid" && (
              <button
                type="button"
                onClick={() => payOnline(success.id)}
                disabled={submitting}
                className="mt-3 w-full rounded-xl bg-espresso px-3 py-2 text-sm font-semibold text-cream hover:bg-espresso/90 disabled:opacity-50"
              >
                {submitting ? "Opening payment..." : "Pay Online Now"}
              </button>
            )}
          </div>
        )}

        <button type="button" onClick={submitOrder} disabled={submitting || cart.length === 0} className="btn-primary mt-5 flex w-full items-center justify-center disabled:opacity-50">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit QR Order"}
        </button>
      </aside>
    </div>
  );
}
