"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Store,
  Truck,
  CreditCard,
  Bell,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface StoreSettings {
  store_name: string;
  support_email: string;
  phone: string;
  address: string;
  free_shipping_threshold_cents: number;
  flat_shipping_cents: number;
  tax_rate_percent: number;
  enable_reviews: boolean;
  enable_loyalty: boolean;
  enable_sms: boolean;
}

const DEFAULTS: StoreSettings = {
  store_name: "Kynda Coffee",
  support_email: "kyndacoffee@gmail.com",
  phone: "(512) 219-6781",
  address: "4315 FM 2147, Horseshoe Bay, TX 78657",
  free_shipping_threshold_cents: 5000,
  flat_shipping_cents: 599,
  tax_rate_percent: 8.25,
  enable_reviews: true,
  enable_loyalty: true,
  enable_sms: false,
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings({ ...DEFAULTS, ...data.settings });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function update<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast("Settings saved", "success");
        setDirty(false);
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-rust" />
          <h1 className="font-heading text-xl font-bold text-espresso">Store Settings</h1>
        </div>
        {dirty && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Unsaved changes
          </span>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {/* Business Info */}
        <section className="rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-4 w-4 text-rust" />
            <h2 className="font-heading text-lg font-semibold text-espresso">Business Info</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">Store Name</label>
              <input
                type="text"
                value={settings.store_name}
                onChange={(e) => update("store_name", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">Support Email</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => update("support_email", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">Phone</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-espresso">Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => update("address", e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </section>

        {/* Shipping & Tax */}
        <section className="rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-4 w-4 text-rust" />
            <h2 className="font-heading text-lg font-semibold text-espresso">Shipping & Tax</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Free Shipping Threshold ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={(settings.free_shipping_threshold_cents / 100).toFixed(2)}
                onChange={(e) => update("free_shipping_threshold_cents", Math.round(parseFloat(e.target.value) * 100))}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Flat Shipping Rate ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={(settings.flat_shipping_cents / 100).toFixed(2)}
                onChange={(e) => update("flat_shipping_cents", Math.round(parseFloat(e.target.value) * 100))}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Tax Rate (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={settings.tax_rate_percent}
                onChange={(e) => update("tax_rate_percent", parseFloat(e.target.value))}
                className="input-field"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-rust" />
            <h2 className="font-heading text-lg font-semibold text-espresso">Features</h2>
          </div>
          <div className="space-y-3">
            {[
              { key: "enable_reviews" as const, label: "Product Reviews", desc: "Allow customers to leave reviews on products" },
              { key: "enable_loyalty" as const, label: "Loyalty Program", desc: "Award points for purchases" },
              { key: "enable_sms" as const, label: "SMS Notifications", desc: "Send order updates via Twilio" },
            ].map((feature) => (
              <label
                key={feature.key}
                className="flex items-start gap-3 rounded-lg border border-latte/20 p-3 cursor-pointer hover:bg-cream/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={settings[feature.key] as boolean}
                  onChange={(e) => update(feature.key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-latte text-rust focus:ring-rust"
                />
                <div>
                  <p className="text-sm font-medium text-espresso">{feature.label}</p>
                  <p className="text-xs text-mocha">{feature.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Payment Integration Status */}
        <section className="rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-rust" />
            <h2 className="font-heading text-lg font-semibold text-espresso">Integrations</h2>
          </div>
          <div className="space-y-3">
            <IntegrationStatus
              name="Stripe"
              envVar="STRIPE_SECRET_KEY"
              description="Payment processing & checkout"
            />
            <IntegrationStatus
              name="Twilio"
              envVar="TWILIO_ACCOUNT_SID"
              description="SMS order notifications"
            />
            <IntegrationStatus
              name="Resend"
              envVar="RESEND_API_KEY"
              description="Transactional emails"
            />
            <IntegrationStatus
              name="Square"
              envVar="SQUARE_APPLICATION_ID"
              description="POS sync & in-person payments"
            />
            <IntegrationStatus
              name="Printful"
              envVar="PRINTFUL_API_KEY"
              description="On-demand merch fulfillment"
            />
          </div>
        </section>
      </div>

      {/* Save bar */}
      <div className="mt-8 flex items-center justify-end gap-3">
        {dirty && (
          <button
            onClick={() => { setSettings(DEFAULTS); setDirty(false); }}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-mocha hover:bg-latte/20"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn-primary"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}

function IntegrationStatus({
  name,
  envVar,
  description,
}: {
  name: string;
  envVar: string;
  description: string;
}) {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/integrations?env=${envVar}`)
      .then((r) => r.json())
      .then((data) => setConfigured(data.configured))
      .catch(() => setConfigured(false))
      .finally(() => setChecking(false));
  }, [envVar]);

  return (
    <div className="flex items-center justify-between rounded-lg border border-latte/20 p-3">
      <div>
        <p className="text-sm font-medium text-espresso">{name}</p>
        <p className="text-xs text-mocha">{description}</p>
      </div>
      {checking ? (
        <Loader2 className="h-4 w-4 animate-spin text-mocha" />
      ) : configured ? (
        <span className="flex items-center gap-1 rounded-full bg-sage/10 px-2 py-1 text-xs font-medium text-sage">
          <CheckCircle className="h-3 w-3" />
          Active
        </span>
      ) : (
        <span className="flex items-center gap-1 rounded-full bg-latte/20 px-2 py-1 text-xs font-medium text-mocha">
          <AlertCircle className="h-3 w-3" />
          Not Configured
        </span>
      )}
    </div>
  );
}
