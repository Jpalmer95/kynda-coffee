// Loading skeleton for marketing AI chat
export default function ChatLoading() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3">
      <div className="h-12 w-12 rounded-2xl bg-forest/10 animate-pulse" />
      <p className="text-sm text-muted-foreground">Loading AI Chat…</p>
    </div>
  );
}
