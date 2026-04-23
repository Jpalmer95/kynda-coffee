"use client";

import { PullToRefresh } from "@/components/ui/PullToRefresh";

export function TrainingWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PullToRefresh onRefresh={async () => window.location.reload()}>
      {children}
    </PullToRefresh>
  );
}
