"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserCircle, Loader2, CheckCircle, Lock, Mail, Phone } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login?redirect=/account/profile");
        return;
      }
      setEmail(user.email ?? "");
      fetch("/api/account/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setFullName(data.profile.full_name ?? "");
            setPhone(data.profile.phone ?? "");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router, supabase]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      if (res.ok) {
        toast("Profile updated", "success");
      } else {
        toast("Failed to update profile", "error");
      }
    } catch {
      toast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast("Password updated", "success");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      toast("Failed to update password. Make sure you're signed in recently.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-max py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust" />
      </div>
    );
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <h1 className="font-heading text-2xl font-bold text-espresso mb-6">Edit Profile</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSaveProfile} className="rounded-xl border border-latte/20 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCircle className="h-5 w-5 text-rust" />
            <h2 className="font-heading text-lg font-semibold text-espresso">Personal Info</h2>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="input-field bg-latte/10 opacity-70"
            />
            <p className="text-xs text-mocha mt-1">Email cannot be changed here.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              placeholder="(512) 219-6781"
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Save Changes
          </button>
        </form>

        <form onSubmit={handleChangePassword} className="rounded-xl border border-latte/20 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-rust" />
            <h2 className="font-heading text-lg font-semibold text-espresso">Change Password</h2>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              placeholder="Min 8 characters"
              minLength={8}
              required
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
