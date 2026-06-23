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
  Eye,
  Zap,
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
        <Loader2 className="h-8 w-8 animate-spin text-forest" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-forest" />
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
        <section className="rounded-xl border border-latte/20 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-4 w-4 text-forest" />
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
        <section className="rounded-xl border border-latte/20 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-4 w-4 text-forest" />
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
        <section className="rounded-xl border border-latte/20 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-forest" />
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
                  className="mt-0.5 h-4 w-4 rounded border-latte text-forest focus:ring-forest"
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
        <section className="rounded-xl border border-latte/20 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-forest" />
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

        {/* AI Vision Config */}
        <VlmSettingsSection />
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

// ─── AI Vision (VLM) Settings ──────────────────────────────────────────────

const PROVIDERS = [
  { value: "local", label: "Local (LM Studio / Ollama)", api_base: "http://127.0.0.1:1234/v1", note: "Free, runs on your machine at home" },
  { value: "huggingface", label: "Hugging Face (cloud, free tier)", api_base: "https://router.huggingface.co/v1", note: "Free $0.10/mo credits, then pay-as-you-go" },
  { value: "custom", label: "Custom (OpenAI-compatible)", api_base: "", note: "Any OpenAI-compatible API endpoint" },
];

const HF_MODELS = [
  { value: "Qwen/Qwen3-VL-8B-Instruct", label: "Qwen3 VL 8B (free-friendly)" },
  { value: "Qwen/Qwen3-VL-30B-A3B-Instruct", label: "Qwen3 VL 30B MoE" },
  { value: "google/gemma-3-4b-it", label: "Gemma 3 4B (lightweight)" },
  { value: "google/gemma-3-12b-it", label: "Gemma 3 12B" },
  { value: "meta-llama/Llama-4-Scout-17B-16E-Instruct", label: "Llama 4 Scout 17B" },
];

function VlmSettingsSection() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    provider: "local" as "local" | "huggingface" | "custom",
    model: "",
    api_base: "http://127.0.0.1:1234/v1",
    api_key: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/vlm")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig({
            provider: data.config.provider || "local",
            model: data.config.model || "",
            api_base: data.config.api_base || "http://127.0.0.1:1234/v1",
            api_key: "", // masked from server
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function selectProvider(p: "local" | "huggingface" | "custom") {
    const prov = PROVIDERS.find((x) => x.value === p)!;
    setConfig((c) => ({
      ...c,
      provider: p,
      api_base: prov.api_base || c.api_base,
      model: p === "huggingface" ? HF_MODELS[0].value : c.model,
    }));
    setTestResult(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/vlm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast("AI Vision settings saved", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/settings/vlm?test=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: data.message || "Connection successful" });
        toast("Model responded successfully", "success");
      } else {
        setTestResult({ ok: false, error: data.error || "Test failed" });
        toast("Connection test failed", "error");
      }
    } catch (e) {
      setTestResult({ ok: false, error: e instanceof Error ? e.message : "Connection failed" });
      toast("Connection test failed", "error");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-latte/20 bg-card p-5 sm:p-6">
        <Loader2 className="h-5 w-5 animate-spin text-mocha" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-latte/20 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-4 w-4 text-forest" />
        <h2 className="font-heading text-lg font-semibold text-espresso">AI Vision (Alt-Text Generation)</h2>
      </div>
      <p className="mb-4 text-sm text-mocha">
        Configure the vision-language model used for generating alt-text and captions on marketing images.
        Use a local model for free (at home) or a cloud provider when away.
      </p>

      {/* Provider selector */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-espresso">Provider</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => selectProvider(p.value as "local" | "huggingface" | "custom")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                config.provider === p.value
                  ? "border-forest bg-forest/5"
                  : "border-latte/30 hover:border-latte/50"
              }`}
            >
              <p className="text-sm font-medium text-espresso">{p.label}</p>
              <p className="mt-1 text-xs text-mocha">{p.note}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Model + API base */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-espresso">Model</label>
          {config.provider === "huggingface" ? (
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="input-field"
            >
              {HF_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder={config.provider === "local" ? "e.g. qwen3-vl-8b-instruct" : "model-id"}
              className="input-field"
            />
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-espresso">API Base URL</label>
          <input
            type="text"
            value={config.api_base}
            onChange={(e) => setConfig({ ...config, api_base: e.target.value })}
            className="input-field"
          />
        </div>
        {config.provider !== "local" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-espresso">API Key</label>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder={config.provider === "huggingface" ? "hf_..." : "sk-..."}
              className="input-field"
            />
            <p className="mt-1 text-xs text-mocha">
              {config.provider === "huggingface"
                ? "Free token at huggingface.co/settings/tokens"
                : "Leave empty if your API doesn't require a key"}
            </p>
          </div>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`mt-4 rounded-lg border p-3 text-sm ${
          testResult.ok
            ? "border-sage/30 bg-sage/5 text-sage"
            : "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        }`}>
          {testResult.ok ? (
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {testResult.message}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {testResult.error}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !config.model}
          className="flex items-center gap-1.5 rounded-lg border border-latte/30 px-4 py-2 text-sm text-mocha hover:bg-latte/10 disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Test Connection
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !config.model}
          className="btn-primary"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save AI Config
        </button>
      </div>
    </section>
  );
}
