"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, Clock, Loader2, CheckCircle, Send } from "lucide-react";

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          message: formState.message,
          type: "general",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setStatus("success");
      setFormState({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso">
          Get in Touch
        </h1>
        <p className="mt-2 text-mocha">
          We&apos;d love to hear from you. Questions, feedback, or just saying hi.
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cream">
                <MapPin className="h-5 w-5 text-rust" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-medium text-espresso">Visit Us</h2>
                <address className="mt-1 not-italic text-sm text-mocha">
                  <p>4315 FM 2147</p>
                  <p>Horseshoe Bay, TX 78657</p>
                </address>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cream">
                <Phone className="h-5 w-5 text-rust" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-medium text-espresso">Phone</h2>
                <p className="mt-1 text-sm text-mocha">
                  <a href="tel:+15122196781" className="hover:text-espresso transition-colors">
                    (512) 219-6781
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cream">
                <Mail className="h-5 w-5 text-rust" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-medium text-espresso">Email</h2>
                <p className="mt-1 text-sm text-mocha">
                  <a href="mailto:kyndacoffee@gmail.com" className="hover:text-espresso transition-colors">
                    kyndacoffee@gmail.com
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cream">
                <Clock className="h-5 w-5 text-rust" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-medium text-espresso">Hours</h2>
                <div className="mt-1 text-sm text-mocha">
                  <p>Mon – Fri: 6:30 AM – 5:00 PM</p>
                  <p>Sat – Sun: 7:00 AM – 5:00 PM</p>
                  <p className="mt-1 text-xs italic text-mocha/70">Hours may vary on holidays</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-latte/20 bg-white p-5 sm:p-6">
            {status === "success" ? (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-sage" aria-hidden="true" />
                <p className="mt-3 font-medium text-espresso">Message sent!</p>
                <p className="mt-1 text-sm text-mocha">
                  We&apos;ll get back to you as soon as possible.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="btn-primary mt-4 text-sm"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {status === "error" && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {errorMsg}
                  </div>
                )}
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-espresso">
                    Name
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
                    Email
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
                <div>
                  <label htmlFor="message" className="mb-1 block text-sm font-medium text-espresso">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    required
                    value={formState.message}
                    onChange={(e) => setFormState((s) => ({ ...s, message: e.target.value }))}
                    className="input-field resize-none"
                    placeholder="How can we help?"
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
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Map Embed */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-latte/20 bg-latte/10 aspect-[4/3] sm:aspect-video">
          <iframe
            title="Kynda Coffee Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3444.0!2d-98.368!3d30.544!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x865b3c0!2sKynda+Coffee!5e0!3m2!1sen!2sus!4v1"
            width="100%"
            height="100%"
            style={{ border: 0, filter: "grayscale(20%) contrast(1.1)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
          />
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link href="/catering" className="rounded-xl border border-latte/20 bg-white p-4 text-center transition-all hover:shadow-md hover:border-latte/40">
            <h3 className="font-medium text-espresso">Catering</h3>
            <p className="mt-1 text-xs text-mocha">Bring Kynda to your event</p>
          </Link>
          <Link href="/menu" className="rounded-xl border border-latte/20 bg-white p-4 text-center transition-all hover:shadow-md hover:border-latte/40">
            <h3 className="font-medium text-espresso">View Menu</h3>
            <p className="mt-1 text-xs text-mocha">Coffee, food, and more</p>
          </Link>
          <Link href="/shop" className="rounded-xl border border-latte/20 bg-white p-4 text-center transition-all hover:shadow-md hover:border-latte/40">
            <h3 className="font-medium text-espresso">Shop Online</h3>
            <p className="mt-1 text-xs text-mocha">Beans, merch, and gifts</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
