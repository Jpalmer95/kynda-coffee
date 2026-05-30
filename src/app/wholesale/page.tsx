"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Truck, Coffee, Store, CheckCircle2, Loader2 } from "lucide-react";

const LEAD_TYPES = [
  { value: "grocery", label: "Grocery / Retail Shelf" },
  { value: "cafe", label: "Café / Coffee Shop" },
  { value: "office", label: "Office / Workplace" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel / Resort" },
  { value: "event", label: "Event / Catering" },
  { value: "other", label: "Other" },
];

const BENEFITS = [
  { icon: Coffee, title: "Fresh-Roasted, Hill Country Made", desc: "Small-batch specialty coffee roasted in Horseshoe Bay, Texas. Your customers taste the difference." },
  { icon: Truck, title: "Reliable Recurring Delivery", desc: "Weekly, biweekly, or monthly — on a schedule that fits your business. Bulk bags, wholesale pricing." },
  { icon: Store, title: "Grocery & Retail Ready", desc: "Retail-bagged, labeled, and barcoded for shelf placement, plus point-of-sale support." },
  { icon: Building2, title: "Tiered Wholesale Pricing", desc: "Bronze / Silver / Gold tiers with volume discounts and net-30 terms for qualified accounts." },
];

export default function WholesalePage() {
  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    location: "",
    lead_type: "cafe",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wholesale/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit inquiry.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-forest">
            Wholesale & B2B
          </p>
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Serve Kynda Coffee at Your Business
          </h1>
          <p className="mt-4 text-base text-mocha sm:text-lg">
            Bring small-batch, Hill Country–roasted specialty coffee to your café, grocery shelf,
            office, or event. Wholesale pricing, reliable delivery, and a partner who cares about
            quality as much as you do.
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-start gap-4 rounded-2xl border border-latte/20 bg-card p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-forest">
                <b.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-espresso">{b.title}</h3>
                <p className="mt-1 text-sm text-mocha">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Inquiry form */}
        <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-latte/20 bg-card p-6 sm:p-8">
          {submitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-forest" />
              <h2 className="mt-4 font-heading text-2xl font-bold text-espresso">Thanks — we&apos;ll be in touch!</h2>
              <p className="mt-2 text-mocha">
                Our team will review your inquiry and reach out about wholesale pricing and next steps.
                In a hurry? Email <a className="text-forest underline" href="mailto:wholesale@kyndacoffee.com">wholesale@kyndacoffee.com</a>.
              </p>
              <Link href="/" className="btn-secondary mt-6 inline-block">Back to home</Link>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-2xl font-bold text-espresso">Become a Wholesale Partner</h2>
              <p className="mt-1 text-sm text-mocha">Tell us about your business and we&apos;ll put together pricing that works.</p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-espresso">
                    Business name *
                    <input required value={form.company} onChange={(e) => update("company", e.target.value)} className="input-field mt-1" placeholder="Your business" />
                  </label>
                  <label className="block text-sm font-medium text-espresso">
                    Business type
                    <select value={form.lead_type} onChange={(e) => update("lead_type", e.target.value)} className="select-field mt-1">
                      {LEAD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-espresso">
                    Contact name
                    <input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} className="input-field mt-1" />
                  </label>
                  <label className="block text-sm font-medium text-espresso">
                    Location (city, state)
                    <input value={form.location} onChange={(e) => update("location", e.target.value)} className="input-field mt-1" placeholder="Horseshoe Bay, TX" />
                  </label>
                  <label className="block text-sm font-medium text-espresso">
                    Email
                    <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="input-field mt-1" />
                  </label>
                  <label className="block text-sm font-medium text-espresso">
                    Phone
                    <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input-field mt-1" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-espresso">
                  Website (optional)
                  <input value={form.website} onChange={(e) => update("website", e.target.value)} className="input-field mt-1" placeholder="https://" />
                </label>
                <label className="block text-sm font-medium text-espresso">
                  Tell us about your needs
                  <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="input-field mt-1 min-h-24" placeholder="Estimated volume, products of interest, delivery cadence..." />
                </label>

                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <p className="text-xs text-mocha">* Business name and at least one contact method (email or phone) required.</p>

                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                  {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Submit Wholesale Inquiry"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
