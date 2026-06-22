"use client";

// /admin/marketing/validator — X Algorithm Validator
// Paste a draft post, get an algorithm score + actionable feedback before posting.

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  ImageIcon,
  Video,
  MessageCircle,
  MessagesSquare,
} from "lucide-react";

interface ValidationIssue {
  severity: "critical" | "warning" | "info";
  rule: string;
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  platform: string;
  score: number;
  verdict: "excellent" | "good" | "fair" | "poor";
  issues: ValidationIssue[];
  strengths: string[];
  estimatedReachMultiplier: number;
  characterCount: number;
  hasMedia: boolean;
  hasExternalLink: boolean;
  hashtagCount: number;
  valid?: boolean;
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  excellent: { bg: "bg-forest/15", text: "text-forest", label: "Excellent — post it!" },
  good: { bg: "bg-sage/20", text: "text-sage", label: "Good — minor tweaks could help" },
  fair: { bg: "bg-clay/15", text: "text-clay", label: "Fair — consider revising" },
  poor: { bg: "bg-red-100", text: "text-red-700", label: "Poor — rewrite recommended" },
};

const ISSUE_ICONS = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export default function ValidatorPage() {
  const [text, setText] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isThread, setIsThread] = useState(false);
  const [isReply, setIsReply] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async () => {
    if (!text.trim()) {
      setError("Write some post text first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/marketing/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "twitter",
          text,
          hasImage,
          hasVideo,
          isThread,
          isReply,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [text, hasImage, hasVideo, isThread, isReply]);

  const verdictStyle = result ? VERDICT_STYLES[result.verdict] : null;

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/marketing" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to marketing">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <Zap className="h-7 w-7 text-forest" /> X Algorithm Validator
          </h1>
          <p className="text-sm text-mocha">
            Score your post against the open-source X ranking algorithm before you publish.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-4 rounded-2xl border border-latte/20 bg-card p-6">
          <label className="block text-sm font-medium text-espresso">
            Draft Post
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your X/Twitter post here…"
              className="input-field mt-1 min-h-32"
              maxLength={500}
            />
            <span className={`mt-1 block text-xs ${text.length > 280 ? "text-red-600" : "text-mocha"}`}>
              {text.length} / 280 characters
            </span>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-espresso">Post Context</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setHasImage(!hasImage)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  hasImage ? "bg-forest text-cream" : "bg-latte/15 text-mocha hover:bg-latte/25"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" /> Has Image
              </button>
              <button
                onClick={() => setHasVideo(!hasVideo)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  hasVideo ? "bg-forest text-cream" : "bg-latte/15 text-mocha hover:bg-latte/25"
                }`}
              >
                <Video className="h-3.5 w-3.5" /> Has Video
              </button>
              <button
                onClick={() => setIsThread(!isThread)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isThread ? "bg-forest text-cream" : "bg-latte/15 text-mocha hover:bg-latte/25"
                }`}
              >
                <MessagesSquare className="h-3.5 w-3.5" /> Thread
              </button>
              <button
                onClick={() => setIsReply(!isReply)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isReply ? "bg-forest text-cream" : "bg-latte/15 text-mocha hover:bg-latte/25"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" /> Reply
              </button>
            </div>
          </div>

          <button onClick={validate} disabled={loading} className="btn-primary w-full text-sm disabled:opacity-60">
            {loading ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Zap className="mr-1.5 inline h-4 w-4" />}
            Validate Post
          </button>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        {/* Result */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="flex aspect-square max-h-80 items-center justify-center rounded-2xl border border-dashed border-latte/30 bg-card text-center text-mocha">
              <div>
                <Zap className="mx-auto mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">Write a post and click validate to see your algorithm score.</p>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Score */}
              <div className={`rounded-2xl ${verdictStyle?.bg} p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-heading text-5xl font-bold ${verdictStyle?.text}`}>{result.score}</div>
                    <div className="text-xs text-mocha">out of 100</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${verdictStyle?.text}`}>{verdictStyle?.label}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-mocha">
                      <TrendingUp className="h-3 w-3" />
                      {result.estimatedReachMultiplier > 1
                        ? `${result.estimatedReachMultiplier}x reach boost`
                        : `${result.estimatedReachMultiplier}x reach (throttled)`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-latte/20 bg-card p-3 text-center">
                  <div className="font-heading text-lg font-bold text-espresso">{result.characterCount}</div>
                  <div className="text-xs text-mocha">Chars</div>
                </div>
                <div className="rounded-xl border border-latte/20 bg-card p-3 text-center">
                  <div className="font-heading text-lg font-bold text-espresso">{result.hashtagCount}</div>
                  <div className="text-xs text-mocha">Hashtags</div>
                </div>
                <div className="rounded-xl border border-latte/20 bg-card p-3 text-center">
                  <div className={`font-heading text-lg font-bold ${result.hasMedia ? "text-forest" : "text-clay"}`}>
                    {result.hasMedia ? "✓" : "✗"}
                  </div>
                  <div className="text-xs text-mocha">Media</div>
                </div>
              </div>

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <div className="rounded-2xl border border-forest/20 bg-forest/5 p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-forest">
                    <CheckCircle className="h-4 w-4" /> Strengths
                  </h3>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-espresso">
                        ✓ {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Issues */}
              {result.issues.length > 0 && (
                <div className="rounded-2xl border border-clay/20 bg-clay/5 p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-clay">
                    <AlertTriangle className="h-4 w-4" /> Issues to Fix ({result.issues.length})
                  </h3>
                  <div className="space-y-3">
                    {result.issues.map((issue, i) => {
                      const Icon = ISSUE_ICONS[issue.severity];
                      const colorClass =
                        issue.severity === "critical"
                          ? "text-red-600"
                          : issue.severity === "warning"
                          ? "text-clay"
                          : "text-mocha";
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorClass}`} />
                          <div>
                            <p className={`text-sm font-medium ${colorClass}`}>{issue.message}</p>
                            {issue.suggestion && <p className="text-xs text-mocha">{issue.suggestion}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.hasExternalLink && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  ⚠ External link detected — X throttles these. Move the link to a reply for maximum reach.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
