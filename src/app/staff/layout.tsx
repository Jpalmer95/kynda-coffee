import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  ClipboardList,
  Trash2,
  FileText,
  ArrowLeft,
  Coffee,
} from "lucide-react";

/**
 * Staff portal layout
 * Requires user to be authenticated with role = "admin" | "employee"
 * Provides consistent navigation across all staff-facing pages
 */
export const dynamic = "force-dynamic";

const STAFF_NAV = [
  { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/recipes", label: "Recipes", icon: Coffee },
  { href: "/staff/checklists", label: "Checklists", icon: ClipboardList },
  { href: "/staff/waste-log", label: "Waste Log", icon: Trash2 },
  { href: "/staff/handbook", label: "Handbook", icon: FileText },
  { href: "/training", label: "Training", icon: GraduationCap },
];

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = (profile as any)?.role || "user";
  if (role !== "admin" && role !== "employee") {
    redirect("/account");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 lg:min-h-screen border-b lg:border-b-0 lg:border-r border-latte/20 bg-card">
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-sand">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-heading text-lg font-bold text-espresso">
                  Staff Portal
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-mocha">
                  Kynda Coffee
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="hidden lg:inline-flex items-center gap-1 text-xs text-mocha hover:text-forest"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to site
            </Link>
          </div>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto p-2 lg:p-4">
          {STAFF_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-espresso hover:bg-background hover:text-forest transition whitespace-nowrap lg:whitespace-normal"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block border-t border-latte/20 p-4 mt-6">
          <div className="text-xs text-mocha">
            Logged in as
          </div>
          <div className="text-sm font-medium text-espresso truncate">
            {(profile as any)?.full_name || user.email}
          </div>
          <div className="mt-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              role === "admin"
                ? "bg-purple-100 text-purple-700"
                : "bg-green-100 text-green-700"
            }`}>
              {role}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
