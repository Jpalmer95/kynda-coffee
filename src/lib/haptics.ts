"use client";

export function haptic(type: "light" | "medium" | "heavy" | "success" | "warning" | "error") {
  if (typeof navigator === "undefined") return;
  const nav = navigator as any;
  if (nav.vibrate) {
    const patterns: Record<string, number[]> = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 40, 20],
      error: [30, 50, 30, 50, 30],
    };
    nav.vibrate(patterns[type] ?? [10]);
  }
}
