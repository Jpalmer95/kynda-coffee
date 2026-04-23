"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Tag,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Percent,
  DollarSign,
  Truck,
  Search,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import type { PromoCode, PromoType } from "@/types";

export default function PromoCodesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<PromoType>("percentage");
  const [formValue, setFormValue] = useState("");
  const [formMinOrder, setFormMinOrder] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formExpires, setFormExpires] = useState("");

  const loadCodes = useCallback(async () => {
    const res = await fetch("/api/admin/promo-codes");
    const data = await res.json();
    setCodes(data.promo_codes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const value =
      formType === "percentage"
        ? parseFloat(formValue)
        : Math.round(parseFloat(formValue) * 100);

    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: formCode,
        type: formType,
        value,
        min_order_cents: formMinOrder ? Math.round(parseFloat(formMinOrder) * 100) : null,
        max_uses: formMaxUses ? parseInt(formMaxUses, 10) : null,
        expires_at: formExpires || null,
      }),
    });

    if (res.ok) {
      toast("Promo code created", "success");
      setShowForm(false);
      resetForm();
      loadCodes();
    } else {
      const data = await res.json();
      toast(data.error || "Failed to create promo code", "error");
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/promo-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      toast(current ? "Promo code deactivated" : "Promo code activated", "info");
      loadCodes();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this promo code? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/promo-codes/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("Promo code deleted", "info");
      loadCodes();
    }
  }

  function resetForm() {
    setFormCode("");
    setFormType("percentage");
    setFormValue("");
    setFormMinOrder("");
    setFormMaxUses("");
    setFormExpires("");
  }

  const filtered = codes.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const typeIcon = (type: PromoType) => {
    if (type === "percentage") return <Percent className="h-4 w-4" />;
    if (type === "free_shipping") return <Truck className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-espresso">
            Promo Codes
          </h1>
          <p className="text-sm text-mocha">
            {codes.length} total · {codes.filter((c) => c.is_active).length} active
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary inline-flex items-center"
        >
          {showForm ? <X className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
          {showForm ? "Cancel" : "New Promo Code"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-2xl border border-latte/20 bg-white p-5 sm:p-6"
        >
          <h2 className="font-heading text-lg font-semibold text-espresso">
            Create Promo Code
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="SUMMER25"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as PromoType)}
                className="select-field"
              >
                <option value="percentage">Percentage Off</option>
                <option value="fixed_amount">Fixed Amount Off</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                step={formType === "percentage" ? 1 : 0.01}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder={formType === "percentage" ? "25" : "10.00"}
                className="input-field"
              />
              <p className="mt-1 text-xs text-mocha">
                {formType === "percentage"
                  ? "Percent (0-100)"
                  : formType === "free_shipping"
                  ? "Set to 0"
                  : "Dollar amount"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Min Order ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formMinOrder}
                onChange={(e) => setFormMinOrder(e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Max Uses
              </label>
              <input
                type="number"
                min={1}
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Expires
              </label>
              <input
                type="datetime-local"
                value={formExpires}
                onChange={(e) => setFormExpires(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Promo Code"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search promo codes..."
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-latte/20 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream/50">
            <tr>
              <th className="px-4 py-3 font-medium text-espresso">Code</th>
              <th className="px-4 py-3 font-medium text-espresso">Type</th>
              <th className="px-4 py-3 font-medium text-espresso">Value</th>
              <th className="px-4 py-3 font-medium text-espresso">Uses</th>
              <th className="px-4 py-3 font-medium text-espresso">Expires</th>
              <th className="px-4 py-3 font-medium text-espresso">Status</th>
              <th className="px-4 py-3 font-medium text-espresso text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latte/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-rust" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-mocha">
                  No promo codes found
                </td>
              </tr>
            ) : (
              filtered.map((code) => (
                <tr key={code.id} className="hover:bg-cream/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-espresso">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-mocha" />
                      {code.code}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-latte/20 px-2 py-0.5 text-xs capitalize">
                      {typeIcon(code.type)}
                      {code.type.replace(/-/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {code.type === "percentage"
                      ? `${code.value}%`
                      : code.type === "free_shipping"
                      ? "Free"
                      : formatPrice(code.value)}
                  </td>
                  <td className="px-4 py-3">
                    {code.uses_count}
                    {code.max_uses ? ` / ${code.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-mocha">
                    {code.expires_at
                      ? new Date(code.expires_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(code.id, code.is_active)}
                      className="inline-flex items-center gap-1"
                      aria-label={code.is_active ? "Deactivate" : "Activate"}
                    >
                      {code.is_active ? (
                        <ToggleRight className="h-5 w-5 text-sage" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-mocha" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(code.id)}
                      className="rounded-lg p-1.5 text-mocha hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
