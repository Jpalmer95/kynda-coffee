"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [hashPresent, setHashPresent] = useState(false);

  useEffect(() => {
    // Supabase sends recovery token in URL hash — verify it's present
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      setHashPresent(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/account"), 2000);
    }
  }

  if (!hashPresent && typeof window !== "undefined") {
    return (
      <section className="section-padding">
        <div className="container-max max-w-md text-center">
          <h1 className="font-heading text-2xl font-bold text-espresso">Invalid Link</h1>
          <p className="mt-2 text-mocha">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/account/forgot-password" className="btn-primary mt-6 inline-flex">
            Request New Link
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream">
            <Lock className="h-8 w-8 text-mocha" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold text-espresso">
            Create New Password
          </h1>
        </div>

        {success ? (
          <div className="mt-8 rounded-xl border border-sage/30 bg-sage/10 p-6 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-sage" />
            <p className="mt-3 font-medium text-espresso">Password updated!</p>
            <p className="mt-1 text-sm text-mocha">
              Redirecting you to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-espresso">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-espresso">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/account"
            className="inline-flex items-center gap-1 text-sm text-mocha hover:text-espresso"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}
