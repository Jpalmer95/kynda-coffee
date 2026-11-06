"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Lock,
  CalendarDays,
  ShieldAlert,
  Users,
  Rocket,
  CheckCircle2,
  Clock,
  Wrench,
  Coffee,
  Loader2,
  Award,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey =
  | "kaizen"
  | "whispers"
  | "surge"
  | "shrinkage"
  | "budgets"
  | "orbital";

const money = (cents?: number | null) =>
  cents == null ? "$0.00" : `$${(cents / 100).toFixed(2)}`;

export default function AdminKaizenCommandPage() {
  const [tab, setTab] = useState<TabKey>("kaizen");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Interactive Virtual Latte Art Simulator state (Tab 6: XR & Orbital Lab)
  const [pitcherTilt, setPitcherTilt] = useState(42); // degrees
  const [pourHeight, setPourHeight] = useState(3.2); // cm above crema
  const [wiggleHz, setWiggleHz] = useState(2.8); // rosette oscillation Hz
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kaizen", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Render procedural 2D microfoam advection preview on canvas when in orbital/XR tab
  useEffect(() => {
    if (tab !== "orbital" || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.42;

    ctx.clearRect(0, 0, w, h);

    // Ceramic cup rim
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.fillStyle = "#e8dfd5";
    ctx.fill();

    // Espresso crema base
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#6f3d1e";
    ctx.fill();

    // Microfoam Rosetta / Heart physics wave based on tilt, height & oscillation
    const sinkFactor = Math.max(0.15, Math.min(1, 1 - (pourHeight - 1.5) / 8));
    const spread = (pitcherTilt / 60) * r * 0.65 * sinkFactor;
    const lobes = Math.max(3, Math.round(wiggleHz * 3));

    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < lobes; i++) {
      const t = i / lobes;
      const yOffset = (t - 0.5) * r * 1.1;
      const lobeWidth = spread * (1 - Math.abs(t - 0.45) * 0.9);
      ctx.beginPath();
      ctx.ellipse(
        Math.sin(i * 1.2) * 4,
        yOffset,
        Math.max(4, lobeWidth),
        Math.max(6, (r / lobes) * 0.9),
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(250, 246, 240, ${(0.88 * sinkFactor).toFixed(2)})`;
      ctx.fill();
    }
    // Pull-through stem (heart/rosetta cut)
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.65);
    ctx.lineTo(0, r * 0.7);
    ctx.strokeStyle = "#6f3d1e";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }, [tab, pitcherTilt, pourHeight, wiggleHz]);

  const handleKaizenDecision = async (
    proposal: any,
    status: "approved" | "trial_14d" | "parked" | "rejected",
    compileToSop = false
  ) => {
    setBusyId(proposal.id);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/kaizen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review_kaizen",
          id: proposal.id,
          status,
          compile_to_sop: compileToSop,
          title: proposal.title,
          proposed_solution: proposal.proposed_solution,
        }),
      });
      const out = await res.json();
      if (!res.ok) {
        setBanner(`⚠️ ${out.error || "Action blocked by Owner Gate"}`);
      } else {
        setBanner(
          `✅ Kaizen "${proposal.title}" marked ${out.status.toUpperCase()}. ${out.compiled_note || ""}`
        );
        await load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleEquipmentStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      await fetch("/api/admin/kaizen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_equipment", id, status }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveWhisper = async (id: string) => {
    setBusyId(id);
    try {
      await fetch("/api/admin/kaizen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_whisper", id, status: "resolved" }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const latteScore = Math.round(
    Math.max(
      0,
      100 -
        Math.abs(pitcherTilt - 45) * 1.2 -
        Math.abs(pourHeight - 2.5) * 8 -
        Math.abs(wiggleHz - 3.0) * 6
    )
  );

  return (
    <div className="container-max py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/command-center"
            className="rounded-lg p-2 text-mocha hover:bg-latte/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-forest">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Decentralized Kaizen RSI · Dual-Owner Sacred Gate
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
              Kynda Command &amp; Control — Kaizen Brain
            </h1>
            <p className="text-sm text-mocha">
              Frontline ideation, confidential Owner Whispers (Jonathan &amp; Briseida), Predictive Surge Scheduling, Shrinkage Watchdog &amp; Orbital Lab
            </p>
          </div>
        </div>

        <Link
          href="/staff/copilot"
          className="btn-primary text-xs inline-flex items-center gap-1.5"
        >
          <Sparkles className="h-4 w-4" />
          Open Staff Co-Pilot View
        </Link>
      </div>

      {banner && (
        <div className="mb-6 rounded-xl border border-forest/30 bg-forest/10 p-3.5 text-sm font-medium text-espresso">
          {banner}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "kaizen" as const, label: `Kaizen RSI Gate (${data?.stats?.pending_kaizen ?? 0})`, icon: Lightbulb },
          { key: "whispers" as const, label: `🔒 Owner Whispers (${data?.stats?.unread_whispers ?? 0})`, icon: Lock },
          { key: "surge" as const, label: "Predictive Schedule & Surge", icon: CalendarDays },
          { key: "shrinkage" as const, label: "Loss/Shrinkage & Dial-In Telemetry", icon: ShieldAlert },
          { key: "budgets" as const, label: "5-Tier Budgets & Vendor Line", icon: Users },
          { key: "orbital" as const, label: "XR Latte Art Sim & Orbital Lab", icon: Rocket },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition",
              tab === t.key
                ? "border-forest bg-forest text-sand"
                : "border-latte/40 bg-card text-espresso hover:border-forest/40"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Command &amp; Control Brain…
        </div>
      ) : (
        <>
          {/* TAB 1: KAIZEN PROPOSALS GATE */}
          {tab === "kaizen" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-latte/25 bg-card p-4 text-xs text-mocha flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Sacred Trajectory Gate:</strong> Any team member can propose a Kaizen improvement. Only <strong>Jonathan &amp; Briseida</strong> (`owner` tier) can approve or auto-compile proposals into live shop SOPs, checklists, and par targets.
                </span>
                <span className="rounded-full bg-forest/10 px-3 py-1 font-bold text-forest">
                  Your Role: {(data?.caller_role ?? "manager").toUpperCase()}
                </span>
              </div>

              {(data?.proposals ?? []).map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-latte/25 bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-forest/15 px-2.5 py-0.5 text-[11px] font-bold uppercase text-forest">
                          Impact {p.ai_impact_score}/100
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          Target: {p.ai_target_system}
                        </span>
                        <span className="rounded-full bg-latte/20 px-2.5 py-0.5 text-[11px] font-semibold text-espresso">
                          Bounty: {money(p.bounty_cents)} · +{p.xp_awarded ?? 25} XP
                        </span>
                        <span className="text-xs text-mocha">
                          by <strong>{p.submitter_name}</strong> ({p.submitter_role})
                        </span>
                      </div>
                      <h3 className="mt-2 font-heading text-lg font-bold text-espresso">
                        {p.title}
                      </h3>
                    </div>

                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold uppercase",
                        p.status === "compiled" || p.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : p.status === "trial_14d"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-espresso/90">{p.proposed_solution}</p>
                  {p.ai_triage_summary && (
                    <p className="mt-2 text-xs text-mocha">{p.ai_triage_summary}</p>
                  )}

                  {data?.is_owner && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-latte/20 pt-3">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleKaizenDecision(p, "approved", true)}
                        className="btn-primary text-xs px-3.5 py-1.5"
                      >
                        Approve &amp; Compile to SOP (+Pay Bounty)
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleKaizenDecision(p, "trial_14d", false)}
                        className="rounded-lg border border-forest/40 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest/10"
                      >
                        Run 14-Day Telemetry Trial
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleKaizenDecision(p, "parked", false)}
                        className="rounded-lg border border-latte/40 px-3 py-1.5 text-xs text-mocha hover:bg-latte/15"
                      >
                        Park for Later
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: OWNER WHISPERS (JONATHAN & BRISEIDA ONLY) */}
          {tab === "whispers" && (
            <div className="space-y-4">
              {data?.owner_whispers_locked ? (
                <div className="rounded-2xl border border-purple-300 bg-purple-50 p-8 text-center">
                  <Lock className="mx-auto h-8 w-8 text-purple-700" />
                  <h3 className="mt-2 font-heading text-xl font-bold text-purple-950">
                    Restricted to Co-Owners (Jonathan &amp; Briseida Korstad)
                  </h3>
                  <p className="mt-1 text-sm text-purple-800">
                    Owner Whispers are RLS-isolated so team members always have a safe, direct channel to ownership.
                  </p>
                </div>
              ) : (data?.owner_whispers ?? []).length === 0 ? (
                <div className="rounded-2xl border border-latte/25 bg-card p-8 text-center text-sm text-mocha">
                  No unread Owner Whispers right now. When any team member sends a private message via `/staff/copilot`, it appears here exclusively for Jonathan &amp; Briseida.
                </div>
              ) : (
                (data?.owner_whispers ?? []).map((w: any) => (
                  <div
                    key={w.id}
                    className="rounded-2xl border border-purple-300/60 bg-card p-5"
                  >
                    <div className="flex items-center justify-between text-xs text-mocha">
                      <span>
                        From: <strong>{w.submitter_name}</strong> · Topic:{" "}
                        <span className="uppercase font-bold text-purple-700">{w.topic}</span>
                      </span>
                      <span className="font-semibold uppercase">{w.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-espresso">{w.message}</p>
                    {w.status !== "resolved" && (
                      <button
                        type="button"
                        disabled={busyId === w.id}
                        onClick={() => handleResolveWhisper(w.id)}
                        className="mt-3 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-800"
                      >
                        Mark Reviewed &amp; Resolved
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PREDICTIVE SCHEDULE & SURGE FORECASTER */}
          {tab === "surge" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-latte/25 bg-card p-5">
                <h2 className="font-heading text-xl font-bold text-espresso flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-forest" />
                  Predictive Staffing &amp; Seasonal Surge Engine (Square Shifts Companion)
                </h2>
                <p className="mt-1 text-xs text-mocha">
                  Combines Horseshoe Bay day-of-week curves, Hill Country lake/holiday seasonality, weather modifiers, and the upcoming <strong>4909 RM 2147 Winter 2026 Grand Opening</strong> surge.
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {(data?.surge_forecasts ?? []).map((f: any, idx: number) => (
                    <div
                      key={f.dateIso}
                      className="rounded-xl border border-latte/30 bg-background p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-forest">
                            {idx === 2 ? "4909 Grand Opening Sim" : `Forecast · ${f.dateIso}`}
                          </span>
                          <span className="rounded-full bg-forest/15 px-2.5 py-0.5 text-xs font-bold text-forest">
                            {f.demandMultiplier}x Surge
                          </span>
                        </div>
                        <div className="mt-2 font-heading text-2xl font-bold text-espresso">
                          {money(f.projectedRevenueCents)} proj.
                        </div>
                        <p className="text-xs text-mocha">
                          Target Labor Budget (28%): <strong>{money(f.targetLaborBudgetCents)}</strong> · Iced Share:{" "}
                          <strong>{f.icedDrinkSharePct}%</strong>
                        </p>

                        <div className="mt-3 space-y-2 border-t border-latte/20 pt-3">
                          {f.shifts.map((s: any) => (
                            <div key={s.block} className="text-xs">
                              <div className="flex justify-between font-semibold text-espresso">
                                <span>{s.block}</span>
                                <span className="text-forest">{s.recommendedBaristas} Baristas</span>
                              </div>
                              <p className="text-[11px] text-mocha">{s.focusNote}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {f.prepAlerts.length > 0 && (
                        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 space-y-1">
                          {f.prepAlerts.map((a: string) => (
                            <div key={a}>⚡ {a}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SHRINKAGE WATCHDOG, EQUIPMENT TICKETS & ESPRESSO DIAL-INS */}
          {tab === "shrinkage" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-2xl border border-latte/25 bg-card p-5">
                  <h3 className="font-heading text-lg font-bold text-espresso flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    Theoretical vs. Actual Shrinkage Watchdog
                  </h3>
                  <p className="mt-1 text-xs text-mocha">
                    Compares POS Recipe Usage (MenuMetrics) + Logged Waste against Actual Par Count Depletion.
                  </p>
                  <div className="mt-3 space-y-3">
                    {(data?.shrinkage_anomalies ?? []).length === 0 ? (
                      <p className="text-xs text-mocha">
                        Owner-only view or zero unaccounted inventory variance detected.
                      </p>
                    ) : (
                      (data?.shrinkage_anomalies ?? []).map((a: any) => (
                        <div
                          key={a.ingredientName}
                          className="rounded-xl border border-red-200 bg-red-50/60 p-3.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-red-900">
                            <span>{a.ingredientName}</span>
                            <span>
                              -{a.unaccountedQty} {a.unit} ({money(a.unaccountedLossCents)})
                            </span>
                          </div>
                          <p className="mt-1 text-red-800">{a.hypothesis}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-latte/25 bg-card p-5">
                  <h3 className="font-heading text-lg font-bold text-espresso flex items-center gap-2">
                    <Coffee className="h-5 w-5 text-bronze" />
                    Morning Espresso Dial-In Telemetry
                  </h3>
                  <div className="mt-3 space-y-2">
                    {(data?.dial_ins ?? []).length === 0 ? (
                      <p className="text-xs text-mocha">
                        No dial-ins logged yet today. Baristas can voice-log shots in `/staff/copilot`.
                      </p>
                    ) : (
                      (data?.dial_ins ?? []).map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-xl border border-latte/20 bg-background p-3 text-xs"
                        >
                          <div>
                            <strong className="text-espresso">{d.bean_name}</strong> · {d.dose_grams}g →{" "}
                            {d.yield_grams}g in {d.time_seconds}s
                            <div className="text-[11px] text-mocha">by {d.barista_name}</div>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 font-bold",
                              d.is_in_spec
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            )}
                          >
                            {d.is_in_spec ? "In Spec" : "Calibrate"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-latte/25 bg-card p-5">
                <h3 className="font-heading text-lg font-bold text-espresso flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Equipment Tickets (Kept Out of Waste Log)
                </h3>
                <p className="mt-1 text-xs text-mocha">
                  Enforces Kynda Operating Rule: Equipment issues route here + Team Chat, never polluting food/drink waste metrics.
                </p>
                <div className="mt-3 space-y-3">
                  {(data?.equipment_tickets ?? []).length === 0 ? (
                    <p className="text-xs text-mocha">All shop equipment is green — zero open tickets.</p>
                  ) : (
                    (data?.equipment_tickets ?? []).map((eq: any) => (
                      <div
                        key={eq.id}
                        className="rounded-xl border border-latte/25 bg-background p-3.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-espresso">
                            {eq.equipment_name} ({eq.area})
                          </strong>
                          <span className="uppercase font-bold text-amber-700">{eq.status}</span>
                        </div>
                        <p className="mt-1 text-mocha">{eq.description}</p>
                        {eq.status !== "resolved" && (
                          <button
                            type="button"
                            disabled={busyId === eq.id}
                            onClick={() => handleEquipmentStatus(eq.id, "resolved")}
                            className="mt-2 rounded-lg bg-forest px-3 py-1 text-[11px] font-semibold text-sand"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 5-TIER BUDGETS, SKILL TREE & VENDOR INTAKES */}
          {tab === "budgets" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-latte/25 bg-card p-5">
                <h3 className="font-heading text-lg font-bold text-espresso flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  5-Tier Access, Micro-Spend Guardrails &amp; Skill Ranks
                </h3>
                <div className="mt-3 space-y-2.5 text-xs">
                  <div className="rounded-xl border border-latte/20 bg-background p-3">
                    <strong className="text-espresso">Tier 3 · Co-Owners (Jonathan &amp; Briseida):</strong>{" "}
                    Root approval gate for SOP compilation, pricing, marketing publish, POs, and confidential whispers.
                  </div>
                  <div className="rounded-xl border border-latte/20 bg-background p-3">
                    <strong className="text-espresso">Tier 2 · Managers &amp; Team Leads:</strong>{" "}
                    $15/mo AI token budget · $150/mo shop micro-spend ($100 auto-approve cap for urgent supplies).
                  </div>
                  <div className="rounded-xl border border-latte/20 bg-background p-3">
                    <strong className="text-espresso">Tier 1 · Baristas &amp; Staff:</strong>{" "}
                    $3/mo cloud AI cap (auto-fallback to local Qwen/deterministic search) · $5–$50 Kaizen bounties.
                  </div>
                  <div className="rounded-xl border border-latte/20 bg-background p-3">
                    <strong className="text-espresso">Tier 0.5 &amp; Tier 0 · Vendors &amp; Customers:</strong>{" "}
                    Scoped `/api/vendor/intake` &amp; Public Customer MCP (`/api/mcp`) — 100% BYOC.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-latte/25 bg-card p-5">
                <h3 className="font-heading text-lg font-bold text-espresso flex items-center gap-2">
                  <Clock className="h-5 w-5 text-forest" />
                  Vendor &amp; Event Partner Intakes (`/api/vendor/intake`)
                </h3>
                <div className="mt-3 space-y-2.5 text-xs">
                  {(data?.vendor_intakes ?? []).length === 0 ? (
                    <p className="text-mocha">
                      No pending vendor delivery ETAs, price notices, or live-music event proposals. Vendors or their agents can POST to `/api/vendor/intake`.
                    </p>
                  ) : (
                    (data?.vendor_intakes ?? []).map((v: any) => (
                      <div key={v.id} className="rounded-xl border border-latte/20 bg-background p-3">
                        <div className="flex justify-between font-bold text-espresso">
                          <span>{v.vendor_name}</span>
                          <span className="uppercase text-forest">{v.intake_type}</span>
                        </div>
                        <p className="mt-1 text-mocha">{v.summary}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: XR LATTE ART SIMULATOR & ORBITAL CAFE LAB */}
          {tab === "orbital" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-latte/25 bg-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold text-espresso">
                    Virtual Steamer &amp; Latte Art Physics Trainer (2D Preview)
                  </h3>
                  <span className="rounded-full bg-forest/15 px-3 py-1 text-xs font-bold text-forest">
                    Symmetry Score: {latteScore}/100
                  </span>
                </div>
                <p className="mt-1 text-xs text-mocha">
                  Zero-milk-waste barista pour training preview (bridges into your HermesForge Godot 4.7 + Jolt Physics WebXR lounge).
                </p>

                <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
                  <canvas
                    ref={canvasRef}
                    width={220}
                    height={220}
                    className="rounded-2xl border border-latte/30 bg-background shrink-0"
                  />
                  <div className="flex-1 space-y-3 w-full text-xs">
                    <div>
                      <label className="flex justify-between font-semibold text-espresso">
                        <span>Steamer Pitcher Tilt Angle</span>
                        <span>{pitcherTilt}° (Target: 45°)</span>
                      </label>
                      <input
                        type="range"
                        min={20}
                        max={70}
                        value={pitcherTilt}
                        onChange={(e) => setPitcherTilt(Number(e.target.value))}
                        className="w-full accent-forest"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between font-semibold text-espresso">
                        <span>Spout Height Above Crema</span>
                        <span>{pourHeight} cm (Target: 2.5 cm)</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        step={0.5}
                        value={pourHeight}
                        onChange={(e) => setPourHeight(Number(e.target.value))}
                        className="w-full accent-forest"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between font-semibold text-espresso">
                        <span>Wrist Rosetta Oscillation</span>
                        <span>{wiggleHz} Hz (Target: 3.0 Hz)</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={0.2}
                        value={wiggleHz}
                        onChange={(e) => setWiggleHz(Number(e.target.value))}
                        className="w-full accent-forest"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-latte/25 bg-card p-5">
                <h3 className="font-heading text-lg font-bold text-espresso flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-forest" />
                  Orbital &amp; Moon Specialty Café Readiness Rails
                </h3>
                <p className="mt-1 text-xs text-mocha">
                  Every Kaizen RSI system built for <strong>4909 RM 2147</strong> is engineered as a closed-loop pod replicable to multi-unit earthly locations and eventually the first orbital coffee house:
                </p>
                <ul className="mt-3 space-y-2.5 text-xs text-espresso/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
                    <span>
                      <strong>Closed-Loop Mass Balance:</strong> `order = par − on_hand + waste` + Shrinkage Watchdog tracks every gram of coffee, milk, and water.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
                    <span>
                      <strong>Telemetry-Driven Extraction SOPs:</strong> Morning Dial-In logs parameterize dose, yield, time, temperature, and pressure for any gravity/pressure environment.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
                    <span>
                      <strong>Offline-First Autonomous Edge Brain:</strong> Works seamlessly with local `qwen3.5-9b` + deterministic SOP search during comms blackouts.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
                    <span>
                      <strong>Agent-to-Agent Commerce (`/api/mcp`):</strong> External personal AI agents and autonomous delivery/supply bots can query and transact natively.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
