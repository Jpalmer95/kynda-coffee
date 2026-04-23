"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Bell, Mail, MessageSquare, ArrowLeft, Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationSettings {
  email_updates: boolean;
  sms_alerts: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  restock_alerts: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  email_updates: true,
  sms_alerts: false,
  push_notifications: true,
  marketing_emails: true,
  restock_alerts: true,
};

export default function NotificationsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const { supported: pushSupported, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications(userId);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const { data } = await supabase
      .from("profiles")
      .select("notification_settings")
      .eq("id", user.id)
      .single();
    if (data?.notification_settings) {
      setSettings({ ...DEFAULT_SETTINGS, ...data.notification_settings });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ notification_settings: settings })
      .eq("id", user.id);
    if (error) toast(error.message, "error");
    else toast("Preferences saved", "success");
    setSaving(false);
  }

  function toggle(key: keyof NotificationSettings) {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
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

  const items: { key: keyof NotificationSettings; icon: typeof Mail; title: string; desc: string }[] = [
    { key: "email_updates", icon: Mail, title: "Email Updates", desc: "Order confirmations, shipping updates, and account notifications" },
    { key: "sms_alerts", icon: MessageSquare, title: "SMS Alerts", desc: "Delivery notifications and urgent order updates via text" },
    { key: "push_notifications", icon: Bell, title: "Push Notifications", desc: "App alerts for deals, new arrivals, and order status" },
    { key: "marketing_emails", icon: Mail, title: "Marketing Emails", desc: "Promotions, new roasts, and Coffee Club updates" },
    { key: "restock_alerts", icon: Bell, title: "Restock Alerts", desc: "Get notified when your favorite items are back in stock" },
  ];

  return (
    <section className="section-padding">
      <div className="container-max max-w-2xl">
        <Link href="/account" className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Account
        </Link>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">Notifications</h1>
        <p className="mt-1 text-sm text-mocha">Choose how we keep in touch</p>

        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <label key={item.key} className="flex items-center justify-between rounded-xl border border-latte/20 bg-white p-4 cursor-pointer transition-colors hover:border-latte/40">
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-mocha" aria-hidden="true" />
                <div>
                  <p className="font-medium text-espresso text-sm">{item.title}</p>
                  <p className="text-xs text-mocha">{item.desc}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings[item.key]}
                onChange={() => toggle(item.key)}
                className="h-5 w-5 accent-rust cursor-pointer"
              />
            </label>
          ))}

          {/* Browser Push Subscription */}
          {pushSupported && (
            <div className="flex items-center justify-between rounded-xl border border-latte/20 bg-white p-4">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-mocha" aria-hidden="true" />
                <div>
                  <p className="font-medium text-espresso text-sm">Device Push</p>
                  <p className="text-xs text-mocha">
                    {subscribed ? "Your device will receive push alerts" : "Enable alerts on this device"}
                  </p>
                </div>
              </div>
              <button
                onClick={subscribed ? unsubscribe : subscribe}
                disabled={pushLoading}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  subscribed
                    ? "bg-sage/10 text-sage hover:bg-sage/20"
                    : "bg-espresso text-cream hover:bg-mocha"
                }`}
              >
                {pushLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : subscribed ? (
                  "Enabled"
                ) : (
                  "Enable"
                )}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary mt-6 w-full sm:w-auto"
        >
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Preferences"}
        </button>
      </div>
    </section>
  );
}
