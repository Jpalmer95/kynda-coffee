"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Lightbulb,
  Wrench,
  Lock,
  Coffee,
  Award,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeLane } from "@/lib/kaizen/engine";

interface CopilotState {
  user: { id: string; name: string; role: string };
  gamification: {
    xp: number;
    rank: string;
    next_rank: string | null;
    xp_to_next: number;
    bounty_balance_cents: number;
    daily_token_limit: number;
    tokens_used_today: number;
    monthly_micro_spend_cents_limit: number;
  };
  shift_brief: {
    voice_script: string;
    latest_dial_in: {
      bean_name: string;
      dose_grams: number;
      yield_grams: number;
      time_seconds: number;
      is_in_spec: boolean;
      taste_notes?: string;
    };
    active_specials: string[];
    checklists_completed_today: string[];
    open_equipment_count: number;
  };
  recent_kaizen: any[];
  open_equipment: any[];
  ai_configured: boolean;
}

interface ChatTurn {
  id: string;
  sender: "user" | "copilot";
  lane?: IntakeLane;
  text: string;
  xpEarned?: number;
  ruleNotice?: string;
}

const LANE_OPTIONS: {
  key: IntakeLane | "auto";
  label: string;
  desc: string;
  placeholder: string;
  icon: typeof Sparkles;
  badgeColor: string;
}[] = [
  {
    key: "auto",
    label: "Smart Walkie-Talkie (Auto-Route)",
    desc: "Ask recipes, log dial-ins, report equipment, or drop ideas — Co-Pilot routes it automatically.",
    placeholder:
      "Ask anything or speak naturally: e.g. 'How many pumps go in a 16oz Iced Honey Lavender Latte?'",
    icon: Sparkles,
    badgeColor: "bg-forest text-sand",
  },
  {
    key: "kaizen_proposal",
    label: "Kaizen Idea ($5–$50 Bounty)",
    desc: "Spot a way to make a station faster, prevent stockouts, or delight guests? Earn XP + cash bounty when approved!",
    placeholder:
      "e.g. 'On sunny Saturdays we sell out of cold brew by 1:30pm — let's raise Saturday par to 3 kegs and keep spare O-rings under the kegerator.'",
    icon: Lightbulb,
    badgeColor: "bg-amber-600 text-white",
  },
  {
    key: "dial_in",
    label: "Morning Espresso Dial-In",
    desc: "Log dose, yield, and shot time for calibration (+15 XP).",
    placeholder:
      "e.g. 'Morning dial-in: Ethiopia single origin, 18.5g in, 37g out in 29s, bright berry and chocolate'",
    icon: Coffee,
    badgeColor: "bg-bronze text-sand",
  },
  {
    key: "equipment_ticket",
    label: "Equipment Issue (Leadership)",
    desc: "Standing Rule: Equipment issues go here + Team Chat — NEVER the Waste Log (+10 XP).",
    placeholder:
      "e.g. 'Right grouphead steam wand gasket is hissing slightly when closed'",
    icon: Wrench,
    badgeColor: "bg-blue-600 text-white",
  },
  {
    key: "owner_whisper",
    label: "🔒 Owner Whisper (Jonathan & Briseida)",
    desc: "100% private hotline to Jonathan & Briseida ONLY. No other staff or managers can view this.",
    placeholder:
      "Share a confidential concern, safety note, or private feedback directly with Jonathan & Briseida...",
    icon: Lock,
    badgeColor: "bg-purple-700 text-white",
  },
];

export default function StaffCopilotPage() {
  const [state, setState] = useState<CopilotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLane, setSelectedLane] = useState<IntakeLane | "auto">("auto");
  const [isAnonymousWhisper, setIsAnonymousWhisper] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [showQuickstart, setShowQuickstart] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: "Welcome to **Kynda Co-Pilot**! Tap **Play 60s Shift Brief** above for today's bar status, or use the mic/chat below to ask recipes, log morning espresso dial-in, file an equipment ticket, drop a **Kaizen Idea** (for XP + bounties), or send a private **Owner Whisper** to Jonathan & Briseida.",
    },
  ]);

  const recognitionRef = useRef<any>(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/copilot", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const toggleSpeakBrief = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const script =
      state?.shift_brief.voice_script ||
      "Good shift! Remember: serving guests always comes first, and an unfinished opening checklist never blocks service.";
    const utter = new SpeechSynthesisUtterance(script);
    utter.rate = 1.02;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice dictation is not supported in this browser. Please type your message below.");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const handleSubmit = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const text = (presetText ?? input).trim();
    if (!text || sending) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
    };
    setTurns((prev) => [...prev, userTurn]);
    if (!presetText) setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/staff/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          lane: selectedLane === "auto" ? undefined : selectedLane,
          is_anonymous: isAnonymousWhisper,
        }),
      });
      const data = await res.json();
      const botTurn: ChatTurn = {
        id: `c-${Date.now()}`,
        sender: "copilot",
        lane: data.classification?.lane,
        text: data.reply || data.error || "Got it!",
        xpEarned: data.xp_earned,
        ruleNotice: data.classification?.operating_rule_notice,
      };
      setTurns((prev) => [...prev, botTurn]);
      if (data.xp_earned > 0) {
        loadState();
      }
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "copilot",
          text: "Network hiccup — please try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const activeLaneMeta =
    LANE_OPTIONS.find((l) => l.key === selectedLane) ?? LANE_OPTIONS[0];

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/staff"
            className="rounded-lg p-2 text-mocha hover:bg-latte/15"
            aria-label="Back to Staff Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-forest">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Decentralized Kaizen RSI · Staff Co-Pilot
              </span>
            </div>
            <h1 className="mt-1 font-heading text-3xl font-bold text-espresso sm:text-4xl">
              Kynda Co-Pilot &amp; Kaizen Hub
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSpeakBrief}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition",
              speaking
                ? "bg-amber-600 text-white"
                : "bg-forest text-sand hover:bg-forest/90"
            )}
          >
            {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {speaking ? "Stop Audio Brief" : "Play 60s Shift Brief"}
          </button>

          <button
            type="button"
            onClick={() => setShowQuickstart((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-latte/40 bg-card px-3.5 py-2 text-xs font-semibold text-espresso hover:border-forest"
          >
            <HelpCircle className="h-4 w-4 text-forest" />
            {showQuickstart ? "Hide Quickstart" : "New to AI? 2-Min Guide"}
          </button>
        </div>
      </div>

      {/* Collapsible Laminated Bar Card Quickstart */}
      {showQuickstart && (
        <div className="mb-6 rounded-2xl border-2 border-forest/30 bg-forest/5 p-5">
          <h2 className="font-heading text-lg font-bold text-espresso">
            The 3 Golden Rules (Zero AI Experience Needed)
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3 text-xs text-espresso/90">
            <div className="rounded-xl bg-card p-3.5 border border-latte/20">
              <strong className="block text-forest mb-1">1. Talk like a coworker</strong>
              Tap the microphone or type plain English/Spanish. Ask recipes, cleaning steps, or dial-in targets anytime.
            </div>
            <div className="rounded-xl bg-card p-3.5 border border-latte/20">
              <strong className="block text-forest mb-1">2. You CANNOT break the shop</strong>
              Menu prices, public posts, vendor orders, and official SOP edits are gated by Jonathan &amp; Briseida. Experiment freely!
            </div>
            <div className="rounded-xl bg-card p-3.5 border border-latte/20">
              <strong className="block text-forest mb-1">3. Standing Kynda Rules</strong>
              • Unfinished opening checklist <strong>never blocks serving guests</strong>.<br />
              • <strong>Equipment issues</strong> → here or Team Chat (never the Waste Log!).<br />
              • <strong>Waste Log</strong> → strictly food, drink &amp; items.
            </div>
          </div>
        </div>
      )}

      {/* Skill Tree, Bounty & Shift Brief Strip */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-mocha">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-600" /> Skill Tree Rank
            </span>
            <span className="font-bold text-forest">{state?.gamification.xp ?? 50} XP</span>
          </div>
          <div className="mt-1.5 font-heading text-2xl font-bold text-espresso">
            {state?.gamification.rank ?? "Apprentice"}
          </div>
          <p className="mt-1 text-xs text-mocha">
            {state?.gamification.next_rank
              ? `${state.gamification.xp_to_next} XP to ${state.gamification.next_rank}`
              : "Max Rank Achieved!"}
          </p>
        </div>

        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-mocha">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-forest" /> Kaizen Bounty Balance
            </span>
            <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-bold text-forest">
              +$5–$50 / approved idea
            </span>
          </div>
          <div className="mt-1.5 font-heading text-2xl font-bold text-espresso">
            ${((state?.gamification.bounty_balance_cents ?? 0) / 100).toFixed(2)}
          </div>
          <p className="mt-1 text-xs text-mocha">
            Paid out when Jonathan &amp; Briseida compile your idea into shop SOPs
          </p>
        </div>

        <div className="rounded-2xl border border-latte/20 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-mocha">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Coffee className="h-4 w-4 text-bronze" /> Bar Espresso Dial-In
            </span>
            {state?.shift_brief.latest_dial_in?.is_in_spec !== false ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-forest">
                <CheckCircle2 className="h-3.5 w-3.5" /> In Spec
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Adjust
              </span>
            )}
          </div>
          <div className="mt-1.5 font-heading text-lg font-bold text-espresso truncate">
            {state?.shift_brief.latest_dial_in?.bean_name ?? "House Espresso"}
          </div>
          <p className="mt-1 text-xs text-mocha">
            {state?.shift_brief.latest_dial_in?.dose_grams ?? 18.5}g in →{" "}
            {state?.shift_brief.latest_dial_in?.yield_grams ?? 37}g out in{" "}
            {state?.shift_brief.latest_dial_in?.time_seconds ?? 29}s
          </p>
        </div>
      </div>

      {/* Lane Selector Pills */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-mocha">
          Select Channel (or leave on Auto-Route)
        </label>
        <div className="flex flex-wrap gap-2">
          {LANE_OPTIONS.map((lane) => {
            const Icon = lane.icon;
            const active = selectedLane === lane.key;
            return (
              <button
                key={lane.key}
                type="button"
                onClick={() => setSelectedLane(lane.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition",
                  active
                    ? "border-forest bg-forest text-sand shadow-sm"
                    : "border-latte/30 bg-card text-espresso hover:border-forest/40"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {lane.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-mocha">{activeLaneMeta.desc}</p>
      </div>

      {selectedLane === "owner_whisper" && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-purple-300 bg-purple-50/70 px-4 py-2.5 text-xs text-purple-900">
          <span>
            🔒 <strong>Direct Owner Gate:</strong> Visible strictly to Jonathan &amp; Briseida Korstad.
          </span>
          <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymousWhisper}
              onChange={(e) => setIsAnonymousWhisper(e.target.checked)}
              className="rounded border-purple-400"
            />
            Submit Anonymously
          </label>
        </div>
      )}

      {/* Main Conversation & Action Box */}
      <div className="rounded-2xl border border-latte/30 bg-card shadow-sm">
        <div className="max-h-[420px] overflow-y-auto p-5 space-y-4">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={cn(
                "flex flex-col max-w-3xl rounded-2xl p-4 text-sm leading-relaxed",
                turn.sender === "user"
                  ? "ml-auto bg-forest text-sand"
                  : "mr-auto border border-latte/25 bg-background text-espresso"
              )}
            >
              {turn.ruleNotice && (
                <div className="mb-2 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
                  ⚡ {turn.ruleNotice}
                </div>
              )}
              <div className="whitespace-pre-wrap">{turn.text}</div>
              {typeof turn.xpEarned === "number" && turn.xpEarned > 0 && (
                <div className="mt-2 inline-flex self-start items-center gap-1 rounded-full bg-forest/15 px-2.5 py-0.5 text-xs font-bold text-forest">
                  +{turn.xpEarned} Kaizen XP Earned!
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-mocha">
              <Loader2 className="h-4 w-4 animate-spin text-forest" />
              Kynda Co-Pilot is routing your input…
            </div>
          )}
        </div>

        {/* One-Tap Quick Prompts for Non-Tech Staff */}
        <div className="border-t border-latte/20 px-4 py-2.5 flex flex-wrap gap-1.5 bg-latte/5">
          {[
            "Does an unfinished opening checklist block serving guests?",
            "Dial-in: House Espresso 18.5g in, 37g out in 29s",
            "Kaizen idea: pre-stage spare corny keg O-rings inside the kegerator door",
            "How do we clean the espresso machine and cold brew keg?",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSubmit(undefined, prompt)}
              className="rounded-full border border-latte/30 bg-card px-3 py-1 text-[11px] text-mocha hover:border-forest hover:text-espresso transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form with Push-to-Talk Mic */}
        <form
          onSubmit={(e) => handleSubmit(e)}
          className="border-t border-latte/25 p-3 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleVoiceInput}
            title="Push-to-Talk Voice Input"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition",
              listening
                ? "border-red-500 bg-red-600 text-white animate-pulse"
                : "border-latte/30 bg-background text-espresso hover:border-forest"
            )}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeLaneMeta.placeholder}
            className="flex-1 rounded-xl border border-latte/30 bg-background px-4 py-2.5 text-sm text-espresso placeholder:text-mocha/60 focus:border-forest focus:outline-none"
          />

          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary h-11 px-5 text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
