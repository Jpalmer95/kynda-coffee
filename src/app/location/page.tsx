import type { Metadata } from "next";
import { LocationClient } from "@/components/location/LocationClient";

export const metadata: Metadata = {
  title: "Find Us — Kynda Coffee",
  description:
    "Visit Kynda Coffee at 4315 FM 2147, Horseshoe Bay, TX 78657. Open daily 7am–5pm. Directions, hours, and parking info.",
  alternates: { canonical: "https://kyndacoffee.com/location" },
};

export default function LocationPage() {
  return <LocationClient />;
}
