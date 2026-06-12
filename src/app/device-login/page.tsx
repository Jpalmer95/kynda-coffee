"use client";

// /device-login — owner-approved sign-in for shared café tablets (KDS).
//
// Flow:
//  1. Tablet enters the shared team email (e.g. kyndacoffee@gmail.com) + a
//     device name, taps "Request approval".
//  2. The OWNER receives a 6-digit code by text/email.
//  3. Owner reads the code to staff (or types it on the tablet) — entering it
//     here approves the device and mints a normal persistent Supabase session.
// No email inbox is ever needed on the tablet.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MonitorCheck, ShieldCheck, Send } from "lucide-react";

function DeviceLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/kds";

  const [step, setStep] = useState<"request" | "code">("request");
  const [email, setEmail] = useState("kyndacoffee@gmail.com");
  const [deviceName, setDeviceName] = useState("");
  const [code, setCode] = useState("");
  const [requestId, setRequestId] = useState("");
  const [deviceSecret, setDeviceSecret] = useState("");
  const [notifiedVia, setNotifiedVia] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestApproval(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/device-auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, device_name: deviceName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setRequestId(data.request_id);
      setDeviceSecret(data.device_secret);
      setNotifiedVia(data.notified_via);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/device-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, device_secret: deviceSecret, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      // Exchange the one-time token for a real persistent session on THIS device.
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: data.token_hash,
      });
      if (otpError) throw new Error(otpError.message);

      router.push(next.startsWith("/") ? next : "/kds");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section-padding min-h-screen">
      <div className="container-max max-w-md">
        <div className="mb-8 text-center">
          <MonitorCheck className="mx-auto h-12 w-12 text-forest" aria-hidden="true" />
          <h1 className="mt-3 font-heading text-3xl font-bold text-espresso">Device Sign-In</h1>
          <p className="mt-2 text-sm text-mocha">
            For shared café tablets (Kitchen Display, orders screen). The owner
            approves each device with a one-time code — no email inbox needed here.
          </p>
        </div>

        <div className="rounded-2xl border border-latte/20 bg-card p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={requestApproval} className="space-y-4">
              <div>
                <label htmlFor="device-email" className="mb-1 block text-sm font-medium text-espresso">
                  Team account email
                </label>
                <input
                  id="device-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="kyndacoffee@gmail.com"
                />
              </div>
              <div>
                <label htmlFor="device-name" className="mb-1 block text-sm font-medium text-espresso">
                  Device name
                </label>
                <input
                  id="device-name"
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Kitchen iPad, Front Counter Tablet"
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Request Owner Approval
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="rounded-lg bg-sage/10 p-3 text-sm text-espresso">
                <ShieldCheck className="mr-1.5 inline h-4 w-4 text-sage" aria-hidden="true" />
                Approval code sent to the owner
                {notifiedVia === "sms" ? " by text" : notifiedVia === "email" ? " by email" : ""}.
                Enter it below within 10 minutes.
              </div>
              <div>
                <label htmlFor="approval-code" className="mb-1 block text-sm font-medium text-espresso">
                  6-digit approval code
                </label>
                <input
                  id="approval-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="input-field text-center text-2xl tracking-[8px]"
                  placeholder="••••••"
                />
              </div>
              <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full">
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
                  </>
                ) : (
                  "Approve This Device"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setError(null);
                }}
                className="w-full text-center text-sm text-mocha hover:text-espresso"
              >
                Start over
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-mocha/70">
          Whitelisted accounts: any team member (staff, team lead, owner) under
          Admin → Team &amp; Access. Sessions stay signed in on this device.
        </p>
      </div>
    </section>
  );
}

export default function DeviceLoginPage() {
  return (
    <Suspense fallback={<div className="section-padding text-center text-mocha">Loading…</div>}>
      <DeviceLoginInner />
    </Suspense>
  );
}
