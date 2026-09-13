"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

/**
 * Move-updates signup. Posts to the existing newsletter endpoint with a
 * distinct `source` so these subscribers are identifiable in the admin.
 */
export function MovingUpdatesForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "moving_page" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("done");
      setMessage("You're on the list — we'll email move updates as they land.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-forest/30 bg-forest/5 px-5 py-4 text-sm text-espresso">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-forest" aria-hidden="true" />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="moving-updates-email">
          Email address
        </label>
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70"
            aria-hidden="true"
          />
          <input
            id="moving-updates-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-xl border border-input bg-popover py-3 pl-10 pr-3 text-sm text-espresso placeholder:text-mocha/60 focus-visible:ring-2 focus-visible:ring-forest"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary justify-center disabled:opacity-70"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Signing up
            </>
          ) : (
            "Get move updates"
          )}
        </button>
      </div>
      {status === "error" && message ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {message}
        </p>
      ) : (
        <p className="mt-3 text-xs text-mocha/80">
          Move milestones and the opening date. No spam, unsubscribe anytime.
        </p>
      )}
    </form>
  );
}
