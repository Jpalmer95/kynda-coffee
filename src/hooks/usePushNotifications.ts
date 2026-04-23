"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

export function usePushNotifications(userId?: string) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasSupport = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(hasSupport);

    if (hasSupport) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) {
      toast("Push notifications not supported on this device", "error");
      return;
    }

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        toast("Notification permission denied", "error");
        setLoading(false);
        return;
      }

      // Use a demo VAPID public key — replace with your own in production
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BEl62iSMfVDBQRBCqR6Jd5lE5n4iHJ6qE-8aJ3iZ8v1qVdJpL6h9xQqZ5y7X5y7X5y7X5y7X5y7X5y7X5y7X5";

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, user_id: userId }),
      });

      if (res.ok) {
        setSubscribed(true);
        toast("Push notifications enabled!", "success");
      } else {
        toast("Failed to enable notifications", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }, [supported, userId, toast]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast("Push notifications disabled", "info");
    } catch {
      toast("Failed to disable notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { supported, subscribed, loading, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
