"use client";

export default function ChatError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-destructive font-medium">Something went wrong loading the chat.</p>
      <p className="text-sm text-muted-foreground max-w-md">{error.message}</p>
      <button onClick={reset} className="btn-primary px-6 py-2 rounded-lg">
        Try Again
      </button>
    </div>
  );
}
