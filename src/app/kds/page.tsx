import { Suspense } from "react";
import type { Metadata } from "next";
import { KdsClient } from "@/components/kds/KdsClient";

/**
 * Dedicated full-screen Kitchen Display surface for kitchen iPads.
 * No site chrome (Header/Footer/BottomNav hide on /kds). Staff tier required
 * (middleware). Each iPad bookmarks its board: /kds?board=parking etc.
 */
export const metadata: Metadata = {
  title: "Kitchen Display | Kynda Coffee",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function KdsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-800 p-8 text-sand">Loading KDS…</div>}>
      <KdsClient />
    </Suspense>
  );
}
