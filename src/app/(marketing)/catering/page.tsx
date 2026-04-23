"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Users, MessageSquare, Loader2, CheckCircle, Send, Coffee, Truck, Star } from "lucide-react";

export default function CateringPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    event_date: "",
    guests: "",
    details: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/catering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setStatus("success");
      setFormState({ name: "", email: "", event_date: "", guests: "", details: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso">
          Cater Your Next Event
        </h1>
        <p className="mt-2 text-base sm:text-lg text-mocha">
          From corporate meetings to weddings, bring Kynda Coffee to your special occasion.
        </p>

        {/* Why Kynda Catering */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-latte/20 bg-white p-4 text-center">
            <Coffee className="mx-auto h-6 w-6 text-rust" aria-hidden="true" />
            <h3 className="mt-2 font-medium text-espresso text-sm">Organic Coffee</h3>
            <p className="mt-1 text-xs text-mocha">Specialty beans, locally roasted</p>
          </div>
          <div className="rounded-xl border border-latte/20 bg-white p-4 text-center">
            <Truck className="mx-auto h-6 w-6 text-rust" aria-hidden="true" />
            <h3 className="mt-2 font-medium text-espresso text-sm">We Deliver</h3>
            <p className="mt-1 text-xs text-mocha">Horseshoe Bay and surrounding areas</p>
          </div>
          <div className="rounded-xl border border-latte/20 bg-white p-4 text-center">
            <Star className="mx-auto h-6 w-6 text-rust" aria-hidden="true" />
            <h3 className="mt-2 font-medium text-espresso text-sm">Custom Orders</h3>
            <p className="mt-1 text-xs text-mocha">Tailored to your event and dietary needs</p>
          </div>
        </div>

        {/* Form */}
        <div className="mt-8 rounded-2xl border border-latte/20 bg-white p-5 sm:p-8">
          {status === "success" ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-sage" aria-hidden="true" />
              <p className="mt-4 font-heading text-lg font-semibold text-espresso">
                Request received!
              </p>
              <p className="mt-2 text-sm text-mocha max-w-sm mx-auto">
                We&apos;ll review your event details and reach out within 1 business day with a custom quote.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="btn-primary mt-6"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {status === "error" && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {errorMsg}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-espresso">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    className="input-field"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-espresso">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
                    className="input-field"
                    placeholder="you@email.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="event_date" className="mb-1 block text-sm font-medium text-espresso">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Event Date
                    </span>
                  </label>
                  <input
                    id="event_date"
                    type="date"
                    value={formState.event_date}
                    onChange={(e) => setFormState((s) => ({ ...s, event_date: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="guests" className="mb-1 block text-sm font-medium text-espresso">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Estimated Guests
                    </span>
                  </label>
                  <input
                    id="guests"
                    type="number"
                    min="1"
                    value={formState.guests}
                    onChange={(e) => setFormState((s) => ({ ...s, guests: e.target.value }))}
                    className="input-field"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="details" className="mb-1 block text-sm font-medium text-espresso">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Tell us about your event
                  </span>
                </label>
                <textarea
                  id="details"
                  rows={5}
                  required
                  value={formState.details}
                  onChange={(e) => setFormState((s) => ({ ...s, details: e.target.value }))}
                  className="input-field resize-none"
                  placeholder="What kind of event? Any special requests, dietary restrictions, or favorite drinks?"
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-primary w-full"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Request Quote
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Alternative contact */}
        <div className="mt-6 text-center text-sm text-mocha">
          <p>Prefer to talk? Call us at{" "}
            <a href="tel:+15122196781" className="font-medium text-espresso hover:underline">
              (512) 219-6781
            </a>
            {" "}or{" "}
            <Link href="/contact" className="font-medium text-espresso hover:underline">
              send a message
            </Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
