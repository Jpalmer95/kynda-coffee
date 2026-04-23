"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Plus, ArrowLeft, Trash2, Star, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Address {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  is_default: boolean;
}

export default function AddressesPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [label, setLabel] = useState("Home");
  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("TX");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false });
    setAddresses(data ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      user_id: user.id,
      label,
      name: name.trim(),
      line1: line1.trim(),
      line2: line2.trim() || null,
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      country: country.trim(),
      is_default: isDefault,
    };

    const { error } = await supabase.from("addresses").insert(payload);
    if (error) {
      toast(error.message, "error");
    } else {
      toast("Address added", "success");
      setShowForm(false);
      resetForm();
      loadAddresses();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) toast(error.message, "error");
    else { toast("Address deleted", "success"); loadAddresses(); }
  }

  async function setDefault(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    if (error) toast(error.message, "error");
    else { toast("Default address updated", "success"); loadAddresses(); }
  }

  function resetForm() {
    setLabel("Home");
    setName("");
    setLine1("");
    setLine2("");
    setCity("");
    setState("TX");
    setZip("");
    setCountry("US");
    setIsDefault(false);
  }

  if (loading) {
    return (
      <section className="section-padding">
        <div className="container-max max-w-2xl flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-rust" />
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-2xl">
        <Link href="/account" className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </Link>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">Addresses</h1>
        <p className="mt-1 text-sm text-mocha">Manage your shipping and billing addresses</p>

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary mt-6 inline-flex items-center">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Address
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-latte/20 bg-white p-5 sm:p-6">
            <h2 className="font-heading text-lg font-semibold text-espresso">New Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-espresso">Label</label>
                <select value={label} onChange={(e) => setLabel(e.target.value)} className="select-field">
                  <option>Home</option>
                  <option>Work</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-espresso">Full Name <span className="text-red-500">*</span></label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">Address Line 1 <span className="text-red-500">*</span></label>
              <input type="text" required value={line1} onChange={(e) => setLine1(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">Address Line 2</label>
              <input type="text" value={line2} onChange={(e) => setLine2(e.target.value)} className="input-field" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-espresso">City <span className="text-red-500">*</span></label>
                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-espresso">State <span className="text-red-500">*</span></label>
                <input type="text" required value={state} onChange={(e) => setState(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-espresso">ZIP <span className="text-red-500">*</span></label>
                <input type="text" required value={zip} onChange={(e) => setZip(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="input-field" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-rust" />
              <span className="text-sm text-espresso">Set as default</span>
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Address"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        <div className="mt-6 space-y-3">
          {addresses.length === 0 && !showForm ? (
            <div className="rounded-2xl border border-latte/20 bg-white py-16 text-center">
              <MapPin className="mx-auto h-10 w-10 text-latte" aria-hidden="true" />
              <p className="mt-3 text-mocha">No addresses saved yet</p>
            </div>
          ) : (
            addresses.map((addr) => (
              <div key={addr.id} className={`rounded-xl border p-4 ${addr.is_default ? "border-rust/30 bg-cream" : "border-latte/20 bg-white"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-espresso">{addr.label}</span>
                      {addr.is_default && <span className="rounded-full bg-rust/10 px-2 py-0.5 text-xs font-medium text-rust">Default</span>}
                    </div>
                    <p className="mt-1 text-sm text-espresso">{addr.name}</p>
                    <p className="text-sm text-mocha">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                    <p className="text-sm text-mocha">{addr.city}, {addr.state} {addr.zip}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!addr.is_default && (
                      <button onClick={() => setDefault(addr.id)} className="rounded-lg p-2 text-mocha hover:bg-latte/20" aria-label="Set as default">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(addr.id)} className="rounded-lg p-2 text-mocha hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
