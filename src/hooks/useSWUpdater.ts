"use client";

import { useEffect, useRef } from "react";

/**
 * Hook that auto-updates the Service Worker when a new version is detected.
 *
 * Flow:
 *   1. Browser detects a change in /sw.js (on page load or via update())
 *   2. New SW enters "installing" state
 *   3. We send "SKIP_WAITING" so the new SW activates immediately
 *      (instead of waiting for all tabs to close)
 *   4. New SW's activate handler calls clients.claim()
 *   5. Browser fires "controllerchange" — we reload once to pick up the
 *      new bundled JS. A session-storage flag prevents reload loops.
 *
 * Without this, visitors who had the tab open during a deployment keep
 * running the old cached app shell forever (even after hard refresh,
 * because the SW intercepts requests before the network).
 */
export function useSWUpdater() {
  const reloadTriggered = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let swRegistration: ServiceWorkerRegistration | null = null;
    const FLAG_KEY = "kynda-sw-reloaded";

    const onControllerChange = () => {
      if (reloadTriggered.current) return;
      // After claim, the new SW is controlling us. Reload once to get
      // the new JS bundle. Only do this if we just sent SKIP_WAITING
      // (to avoid reload loops from unrelated controller changes).
      const justUpdated = sessionStorage.getItem(FLAG_KEY);
      if (justUpdated) {
        sessionStorage.removeItem(FLAG_KEY);
        reloadTriggered.current = true;
        window.location.reload();
      }
    };

    const onInstalling = (worker: ServiceWorker) => {
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          // A new SW is installed while we have an active controller
          // — that means an update is waiting.
          sessionStorage.setItem(FLAG_KEY, String(Date.now()));
          worker.postMessage("SKIP_WAITING");
        }
      });
    };

    const onRegStateChange = () => {
      if (swRegistration?.installing) {
        onInstalling(swRegistration.installing);
      }
    };

    (async () => {
      try {
        swRegistration = await navigator.serviceWorker.register("/sw.js");
        swRegistration.addEventListener("updatefound", onRegStateChange);

        // Proactively check for updates every 30 minutes.
        // Browsers auto-check ~every 24h, which is too slow for our
        // deployment cadence.
        setInterval(
          () => swRegistration?.update().catch(() => {}),
          30 * 60 * 1000
        );
        // Also trigger an immediate update check on each page load.
        swRegistration.update().catch(() => {});

        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      } catch (err) {
        console.warn("[sw-updater] registration failed:", err);
      }
    })();

    return () => {
      if (swRegistration) {
        swRegistration.removeEventListener("updatefound", onRegStateChange);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
}
