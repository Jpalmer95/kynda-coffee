"use client";

import { useState } from "react";
import {
  Briefcase,
  Users,
  Clock,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface JobOpening {
  id: string;
  title: string;
  slug: string;
  department: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

interface JobApplication {
  id: string;
  opening_id: string | null;
  opening_title: string;
  name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  resume_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  reviewed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  interview: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  hired: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function AdminCareersClient({
  openings,
  applications,
}: {
  openings: JobOpening[];
  applications: JobApplication[];
}) {
  const [tab, setTab] = useState<"applications" | "openings">("applications");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const filteredApps = applications.filter((app) => {
    const matchSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.email.toLowerCase().includes(search.toLowerCase()) ||
      app.opening_title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || app.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const newCount = applications.filter((a) => a.status === "new").length;
  const activeOpenings = openings.filter((o) => o.is_active).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-semibold text-foreground">
            <Briefcase className="h-8 w-8 text-primary" />
            Careers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage job openings and review applications
          </p>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Active Openings", value: activeOpenings, icon: Briefcase },
            { label: "Total Applications", value: applications.length, icon: Users },
            { label: "New (Unreviewed)", value: newCount, icon: Clock },
            { label: "Hired", value: applications.filter((a) => a.status === "hired").length, icon: CheckCircle2 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <stat.icon className="h-4 w-4" />
                <span className="text-xs">{stat.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/50 p-1 w-fit">
          {(
            [
              { key: "applications", label: "Applications", count: applications.length },
              { key: "openings", label: "Openings", count: openings.length },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "applications" ? (
          <div>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name, email, or position…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Applications list */}
            {filteredApps.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 font-heading text-lg text-muted-foreground">
                  {applications.length === 0 ? "No applications yet" : "No matches found"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApps.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    expanded={expandedApp === app.id}
                    onToggle={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <OpeningsList openings={openings} />
        )}
      </div>
    </div>
  );
}

function ApplicationCard({
  app,
  expanded,
  onToggle,
}: {
  app: JobApplication;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {app.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{app.name}</p>
            <p className="text-xs text-muted-foreground">
              {app.opening_title} · {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[app.status] || STATUS_COLORS.new}`}>
          {app.status}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${app.email}`} className="text-primary hover:underline">
                {app.email}
              </a>
            </span>
            {app.phone && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <a href={`tel:${app.phone}`} className="text-primary hover:underline">
                  {app.phone}
                </a>
              </span>
            )}
          </div>
          {app.cover_letter && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Cover Letter</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm text-foreground">
                {app.cover_letter}
              </p>
            </div>
          )}
          {app.resume_url && (
            <a
              href={app.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Eye className="h-4 w-4" />
              View Resume
            </a>
          )}
          <StatusBadges current={app.status} applicationId={app.id} />
        </div>
      )}
    </div>
  );
}

function StatusBadges({ current, applicationId }: { current: string; applicationId: string }) {
  const statuses = ["new", "reviewed", "interview", "hired", "rejected"];

  async function updateStatus(status: string) {
    try {
      await fetch("/api/careers/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, status }),
      });
      window.location.reload();
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => s !== current && updateStatus(s)}
          disabled={s === current}
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
            s === current
              ? STATUS_COLORS[s]
              : "border border-border text-muted-foreground hover:bg-muted"
          } disabled:cursor-default`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function OpeningsList({ openings }: { openings: JobOpening[] }) {
  if (openings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 font-heading text-lg text-muted-foreground">No openings posted</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add positions via Supabase or run the seed migration.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {openings.map((o) => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{o.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {o.department}
                </span>
                <span>{o.type}</span>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                o.is_active
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {o.is_active ? "Active" : "Paused"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Posted {new Date(o.created_at).toLocaleDateString()} · /{o.slug}
          </p>
        </div>
      ))}
    </div>
  );
}
