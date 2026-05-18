"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Check, AlertTriangle, Truck, Users, Package } from "lucide-react";

type Notification = {
  id: number;
  type: "order" | "inventory" | "schedule" | "training" | "printful" | "b2b";
  title: string;
  message: string;
  timestamp: string;
  urgent: boolean;
  read: boolean;
};

const initialNotifications: Notification[] = [
  { id: 1, type: "order", title: "New Online Order", message: "Order #1084 – 2 × Ethiopian Guji + 1 Americano Mug", timestamp: "2m ago", urgent: true, read: false },
  { id: 2, type: "inventory", title: "Low Stock Alert", message: "Honduras Finca Yaque – only 4 bags left", timestamp: "18m ago", urgent: true, read: false },
  { id: 3, type: "printful", title: "Printful Order Shipped", message: "Merch order #PF-3921 delivered to customer", timestamp: "1h ago", urgent: false, read: true },
  { id: 4, type: "schedule", title: "Shift Change", message: "Maya requested swap on Saturday 17th", timestamp: "3h ago", urgent: false, read: false },
  { id: 5, type: "training", title: "Training Due", message: "Jordan still needs to complete 'Latte Art 202' module", timestamp: "Yesterday", urgent: true, read: false },
  { id: 6, type: "b2b", title: "New B2B Inquiry", message: "Office coffee subscription request from Horsehoe Bay Resort", timestamp: "Yesterday", urgent: false, read: true },
];

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  function markAsRead(id: number) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "order": return <Package className="h-5 w-5 text-forest" />;
      case "inventory": return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "printful": return <Truck className="h-5 w-5 text-emerald-600" />;
      case "schedule": return <Users className="h-5 w-5 text-blue-600" />;
      case "training": return <Bell className="h-5 w-5 text-purple-600" />;
      case "b2b": return <Package className="h-5 w-5 text-emerald-700" />;
    }
  };

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-forest" /> Team Notifications
          </h1>
          <p className="text-sm text-mocha">Internal alerts & operations inbox • {unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-ghost text-sm flex items-center gap-2">
            <Check className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 && (
          <p className="text-center text-mocha py-12">All caught up! No new notifications.</p>
        )}

        {notifications.map((notif) => (
          <div
            key={notif.id}
            onClick={() => markAsRead(notif.id)}
            className={`group flex gap-4 rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-sm ${
              notif.read ? "bg-white border-latte/20" : "bg-cream border-bronze/30"
            }`}
          >
            <div className="mt-0.5">{getIcon(notif.type)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-espresso">{notif.title}</div>
                {notif.urgent && !notif.read && (
                  <span className="rounded-full bg-rust px-2 py-px text-xs text-white font-medium">URGENT</span>
                )}
              </div>
              <p className="text-sm text-mocha mt-0.5">{notif.message}</p>
              <div className="text-xs text-mocha/60 mt-2 tracking-tight">{notif.timestamp}</div>
            </div>

            {!notif.read && (
              <div className="text-forest opacity-0 group-hover:opacity-100 transition text-xs font-medium self-center">
                Mark read
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 text-xs text-mocha/60 text-center">
        Notifications are currently seeded for demo. Will auto-connect to Stripe, Printful, and inventory events.
      </div>
    </div>
  );
}
