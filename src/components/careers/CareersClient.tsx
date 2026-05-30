"use client";

import { useState } from "react";
import {
  Coffee,
  MapPin,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  Users,
  Sparkles,
  Heart,
} from "lucide-react";

interface JobOpening {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  compensation: string | null;
}

const PERKS = [
  { icon: Coffee, title: "Free Coffee", desc: "Unlimited drinks on shift" },
  { icon: Heart, title: "Flexible Schedule", desc: "We work around your life" },
  { icon: Users, title: "Great Team", desc: "Small crew, big energy" },
  { icon: Sparkles, title: "Growth", desc: "Learn latte art, roasting, operations" },
];

const FALLBACK_OPENINGS: JobOpening[] = [
  {
    id: "fallback-barista",
    title: "Barista",
    slug: "barista",
    department: "Café Operations",
    location: "Horseshoe Bay, TX",
    type: "Part-time",
    description:
      "We are looking for passionate baristas who love craft coffee and connecting with our community. You'll prepare specialty drinks, maintain our workspace, and deliver the Kynda experience to every guest.",
    requirements: [
      "Experience with espresso machines preferred",
      "Friendly and reliable",
      "Available weekends and early mornings",
      "Food handler certification a plus",
    ],
    compensation: "$9–$12/hr + tips",
  },
  {
    id: "fallback-shift-lead",
    title: "Team Lead",
    slug: "team-lead",
    department: "Café Operations",
    location: "Horseshoe Bay, TX",
    type: "Full-time",
    description:
      "Lead a team of baristas during peak hours, manage inventory, train new hires, and ensure every shift runs smoothly. Ideal for someone who thrives under pressure and loves mentoring.",
    requirements: [
      "1+ year café or food service experience",
      "Leadership or supervisory experience",
      "Strong communication skills",
      "Available full-time including weekends",
    ],
    compensation: "$12–$15/hr + tips",
  },
  {
    id: "fallback-marketing",
    title: "Growth & Marketing Coordinator",
    slug: "growth-marketing-coordinator",
    department: "Marketing",
    location: "Horseshoe Bay, TX",
    type: "Part-time",
    description:
      "Help tell the Kynda story online. Create content for Instagram, TikTok, and our blog. Photograph new drinks and events. Collaborate on seasonal campaigns.",
    requirements: [
      "Experience with social media management",
      "Photography and video skills",
      "Strong writing voice",
      "Familiarity with Canva or similar tools",
    ],
    compensation: "$15/hr + growth incentives",
  },
];

export function CareersClient({ openings }: { openings: JobOpening[] }) {
  const displayOpenings = openings.length > 0 ? openings : FALLBACK_OPENINGS;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden bg-surface px-6 py-20 text-center sm:py-28">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, rgb(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgb(var(--primary)) 0%, transparent 50%)",
        }} />
        <div className="relative mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800">
            <Coffee className="h-8 w-8 text-sand" />
          </div>
          <h1 className="font-heading text-4xl font-semibold text-sand sm:text-6xl">
            Join the Kynda Team
          </h1>
          <p className="mt-4 text-lg text-sand/80 sm:text-xl">
            We&apos;re building something special in Horseshoe Bay. If you love coffee,
            community, and good vibes — we want to hear from you.
          </p>
          <a
            href="#openings"
            className="btn-accent mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-medium"
          >
            View Open Positions
            <ChevronDown className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* PERKS */}
      <section className="border-b border-border bg-card px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-heading text-3xl font-semibold text-foreground">
            Why Kynda?
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {PERKS.map((perk) => (
              <div
                key={perk.title}
                className="flex flex-col items-center rounded-xl bg-background p-6 text-center"
              >
                <perk.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-3 font-semibold text-foreground">{perk.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPENINGS */}
      <section id="openings" className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            Open Positions
          </h2>
          <p className="mt-2 text-muted-foreground">
            {displayOpenings.length} position{displayOpenings.length !== 1 ? "s" : ""} available
          </p>

          {submitted ? (
            <div className="mt-8 flex flex-col items-center rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h3 className="mt-4 font-heading text-2xl font-semibold text-foreground">
                Application Received!
              </h3>
              <p className="mt-2 text-muted-foreground">
                Thanks for your interest. We review every application and will reach
                out within a few business days if there&apos;s a match.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="btn-accent mt-6 rounded-full px-6 py-2.5 text-sm font-medium"
              >
                Apply for another position
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {displayOpenings.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  expanded={expandedId === job.id}
                  onToggle={() =>
                    setExpandedId(expandedId === job.id ? null : job.id)
                  }
                  onApplied={() => setSubmitted(true)}
                />
              ))}
            </div>
          )}

          {/* General application CTA */}
          {!submitted && (
            <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
              <h3 className="font-heading text-xl font-semibold text-foreground">
                Don&apos;t see a fit?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Send us a general application — we&apos;re always looking for great people.
              </p>
              <a
                href="mailto:hello@kyndacoffee.com?subject=General%20Application"
                className="btn-accent mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium"
              >
                <Send className="h-4 w-4" />
                Email Us
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function JobCard({
  job,
  expanded,
  onToggle,
  onApplied,
}: {
  job: JobOpening;
  expanded: boolean;
  onToggle: () => void;
  onApplied: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div>
          <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {job.type}
            </span>
            {job.compensation && (
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {job.compensation}
              </span>
            )}
          </div>
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
            {job.department}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 pb-5">
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {job.description}
          </p>

          {job.requirements.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-foreground">Requirements</h4>
              <ul className="mt-2 space-y-1">
                {job.requirements.map((req) => (
                  <li
                    key={req}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply button / form */}
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn-accent mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              Apply Now
            </button>
          ) : (
            <ApplyForm
              openingId={job.id}
              openingTitle={job.title}
              onApplied={onApplied}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ApplyForm({
  openingId,
  openingTitle,
  onApplied,
  onCancel,
}: {
  openingId: string;
  openingTitle: string;
  onApplied: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      opening_id: openingId,
      opening_title: openingTitle,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string || undefined,
      cover_letter: formData.get("cover_letter") as string || undefined,
    };

    try {
      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <h4 className="text-sm font-semibold text-foreground">
        Apply for {openingTitle}
      </h4>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-muted-foreground">
            Full Name *
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-muted-foreground">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs font-medium text-muted-foreground">
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="cover_letter" className="block text-xs font-medium text-muted-foreground">
          Tell us about yourself
        </label>
        <textarea
          id="cover_letter"
          name="cover_letter"
          rows={4}
          placeholder="Why do you want to work at Kynda? What experience do you bring?"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-accent inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sand border-t-transparent" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Application
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
