"use client";

import { useSWUpdater } from "@/hooks/useSWUpdater";

/**
 * Mounts the service worker auto-updater. Renders nothing.
 * Place this in the root layout so SW updates are detected
 * on every page load without polluting server layout logic.
 */
export function SWUpdater() {
  useSWUpdater();
  return null;
}
