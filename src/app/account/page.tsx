"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingBag,
  Repeat,
  GraduationCap,
  User,
  MapPin,
  Bell,
  Heart,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  Star,
} from "lucide-react";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

export default function AccountPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/account";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        supabase
          .from("profiles")
          .select("loyalty_points")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.loyalty_points) setLoyaltyPoints(profile.loyalty_points);
          });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAuthLoading(true);
    setMessage(null);

    const next = redirectTo.startsWith("/") ? redirectTo : "/account";
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setAuthLoading(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for a magic link to sign in!");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const menuItems = [
    { href: "/account/profile", title: "Profile", desc: "Edit name, phone, and password", icon: User },
    { href: "/account/orders", title: "Order History", desc: "View past orders and tracking", icon: ShoppingBag },
    { href: "/account/subscriptions", title: "Coffee Club", desc: "Manage your subscription", icon: Repeat },
    { href: "/training", title: "Team Training", desc: "Complete your barista training modules", icon: GraduationCap },
    { href: "/account/addresses", title: "Addresses", desc: "Manage shipping addresses", icon: MapPin },
    { href: "/account/notifications", title: "Notifications", desc: "Email and SMS preferences", icon: Bell },
    { href: "/account/favorites", title: "Favorites", desc: "Saved products and designs", icon: Heart },
  ];

  if (loading) {
    return (
      <section className="section-padding">
        <div className="container-max flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-rust" />
        </div>
      </section>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => window.location.reload()}>
      <section className="section-padding">
        <div className="container-max max-w-3xl">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
            My Account
          </h1>

        {user ? (
          <>
            {/* Profile Card */}
            <div className="mt-6 rounded-xl border border-latte/20 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream">
                  <User className="h-7 w-7 text-mocha" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-espresso">Welcome back!</p>
                  <p className="text-sm text-mocha truncate">{user.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span className="text-sm font-bold">{loyaltyPoints}</span>
                    <span className="text-xs">pts</span>
                  </div>
                  <span className="text-[10px] text-mocha">Loyalty</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-mocha transition-colors hover:bg-latte/20 hover:text-rust"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>

            {/* Menu Grid */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-4 rounded-xl border border-latte/20 bg-white p-4 transition-all hover:shadow-md hover:border-latte/40"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cream">
                    <item.icon className="h-5 w-5 text-mocha group-hover:text-rust transition-colors" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium text-sm text-espresso">{item.title}</h2>
                    <p className="text-xs text-mocha">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-mocha/40 group-hover:text-mocha transition-colors" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Auth Forms */}
            <div className="mt-6 rounded-xl border border-latte/20 bg-white p-6 sm:p-8">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream">
                  <User className="h-8 w-8 text-mocha" aria-hidden="true" />
                </div>
                <h2 className="mt-4 font-heading text-xl font-semibold text-espresso">
                  Sign In or Create Account
                </h2>
                <p className="mt-2 text-sm text-mocha">
                  Track orders, manage subscriptions, and save favorites.
                </p>
              </div>

              {message && (
                <div className={`mt-4 rounded-lg p-3 text-sm text-center ${message.includes("Check your email") ? "bg-sage/10 text-sage" : "bg-red-50 text-red-700"}`} role="status">
                  {message}
                </div>
              )}

              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-espresso">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-primary w-full"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    "Continue with Email"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-mocha">
                <p>By signing in, you agree to our</p>
                <p className="mt-1">
                  <Link href="/terms" className="underline hover:text-espresso">Terms of Service</Link>
                  {" & "}
                  <Link href="/privacy" className="underline hover:text-espresso">Privacy Policy</Link>
                </p>
              </div>
            </div>

            {/* Guest Options */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/shop" className="flex items-center gap-3 rounded-xl border border-latte/20 bg-white p-4 transition-all hover:shadow-md">
                <ShoppingBag className="h-5 w-5 text-mocha" aria-hidden="true" />
                <span className="text-sm font-medium text-espresso">Continue Shopping</span>
              </Link>
              <Link href="/training" className="flex items-center gap-3 rounded-xl border border-latte/20 bg-white p-4 transition-all hover:shadow-md">
                <GraduationCap className="h-5 w-5 text-mocha" aria-hidden="true" />
                <span className="text-sm font-medium text-espresso">Team Training</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
    </PullToRefresh>
  );
}
