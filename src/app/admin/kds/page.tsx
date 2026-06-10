"use client";

import { Suspense } from "react";
import { KdsClient } from "@/components/kds/KdsClient";

export default function KDSPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-800 p-8 text-sand">Loading KDS…</div>}>
      <KdsClient backHref="/admin" />
    </Suspense>
  );
}
