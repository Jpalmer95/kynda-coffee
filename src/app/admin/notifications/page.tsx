"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bell, Check, Loader2, Package, RefreshCw, Repeat } from "lucide-react";

type Notification = {
  id: string;
  type: "order" | "inventory" | "subscription";
  title: string;
  message: string;
  timestamp: string | null;
  urgent: boolean;
  read: boolean;
  href?: string;
};

function relativeTime(timestamp: string | null) {
  if (!timestamp) return "Recently";
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load notifications");
      }

      const liveNotifications = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(liveNotifications.map((notification: Notification) => ({
        ...notification,
        read: readIds.has(notification.id) || Boolean(notification.read),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const mergedNotifications = useMemo(() => {
    return notifications.map((notification) => ({
      ...notification,
      read: readIds.has(notification.id) || notification.read,
    }));
  }, [notifications, readIds]);

  const unreadCount = mergedNotifications.filter((notification) => !notification.read).length;

  function markAsRead(id: string) {
    setReadIds((prev) => new Set(prev).add(id));
  }

  function markAllRead() {
    setReadIds(new Set(mergedNotifications.map((notification) => notification.id)));
  }

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "order": return <Package className="h-5 w-5 text-forest" />;
      case "inventory": return <AlertTriangle className="h-5 w-5 text-bronze" />;
      case "subscription": return <Repeat className="h-5 w-5 text-sage" />;
    }
  };

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3 text-espresso">
            <Bell className="h-8 w-8 text-forest" /> Team Notifications
          </h1>
          <p className="text-sm text-mocha">Live operations inbox from orders, inventory, and subscriptions • {unreadCount} unread</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadNotifications} className="btn btn-ghost text-sm flex items-center gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn btn-ghost text-sm flex items-center gap-2">
              <Check className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl border border-latte/20 bg-card p-8 text-center text-mocha">
            <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" /> Loading live notifications...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-bronze/30 bg-bronze/10 p-5 text-bronze">
            {error}
          </div>
        )}

        {!loading && !error && mergedNotifications.length === 0 && (
          <p className="rounded-2xl border border-latte/20 bg-card py-12 text-center text-mocha">
            All caught up. No active order, low-stock, or subscription alerts right now.
          </p>
        )}

        {!loading && !error && mergedNotifications.map((notif) => {
          const card = (
            <div
              onClick={() => markAsRead(notif.id)}
              className={`group flex gap-4 rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-sm ${
                notif.read ? "bg-card border-latte/20" : "bg-cream border-bronze/30"
              }`}
            >
              <div className="mt-0.5">{getIcon(notif.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-espresso">{notif.title}</div>
                  {notif.urgent && !notif.read && (
                    <span className="rounded-full bg-bronze px-2 py-px text-xs text-white font-medium">URGENT</span>
                  )}
                </div>
                <p className="text-sm text-mocha mt-0.5">{notif.message}</p>
                <div className="text-xs text-mocha/60 mt-2 tracking-tight">{relativeTime(notif.timestamp)}</div>
              </div>

              {!notif.read && (
                <div className="text-forest opacity-0 group-hover:opacity-100 transition text-xs font-medium self-center">
                  Mark read
                </div>
              )}
            </div>
          );

          return notif.href ? (
            <Link key={notif.id} href={notif.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={notif.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
