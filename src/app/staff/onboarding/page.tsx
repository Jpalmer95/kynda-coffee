import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ExternalLink,
  Download,
  CheckCircle2,
  Circle,
  Clock,
  GraduationCap,
  ClipboardCheck,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Onboarding | Kynda Coffee Staff",
};

type OnboardingDoc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  storage_path: string | null;
  external_url: string | null;
  file_type: string | null;
  is_required: boolean;
  sort_order: number;
};

type OnboardingTask = {
  id: string;
  task_key: string;
  task_label: string;
  status: "pending" | "in_progress" | "complete" | "na";
  notes: string | null;
};

// Fallback document set — mirrors migration 019 seed so the page is useful even
// before the table is populated (federal forms link to always-current sources).
const FALLBACK_DOCS: OnboardingDoc[] = [
  { id: "i9", title: "Form I-9 (Employment Eligibility Verification)", description: "Official USCIS Form I-9. Complete Section 1 by your first day.", category: "forms", storage_path: null, external_url: "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf", file_type: "pdf", is_required: true, sort_order: 1 },
  { id: "w4", title: "Form W-4 (Employee's Withholding Certificate)", description: "Official IRS Form W-4 for federal tax withholding.", category: "forms", storage_path: null, external_url: "https://www.irs.gov/pub/irs-pdf/fw4.pdf", file_type: "pdf", is_required: true, sort_order: 2 },
  { id: "tx", title: "Texas New Hire Reporting", description: "Texas new-hire reporting (employer-submitted).", category: "forms", storage_path: null, external_url: "https://portal.cs.oag.state.tx.us/wps/portal/employer", file_type: "link", is_required: false, sort_order: 3 },
  { id: "handbook", title: "Kynda Coffee Employee Handbook", description: "Read and acknowledge. Also available in the Handbook section.", category: "handbook", storage_path: null, external_url: "/staff/handbook", file_type: "link", is_required: true, sort_order: 4 },
  { id: "training", title: "Specialty Coffee Training Packet", description: "Printable companion to the online Barista & Baker Academy.", category: "training", storage_path: null, external_url: "/training", file_type: "link", is_required: true, sort_order: 5 },
];

const CATEGORY_META: Record<string, { label: string; icon: typeof FileText; className: string }> = {
  forms: { label: "Government Forms", icon: ShieldCheck, className: "bg-blue-600 text-white" },
  handbook: { label: "Handbook & Policies", icon: BookOpen, className: "bg-purple-600 text-white" },
  training: { label: "Training Materials", icon: GraduationCap, className: "bg-emerald-600 text-white" },
  checklist: { label: "Checklists", icon: ClipboardCheck, className: "bg-forest text-sand" },
  policy: { label: "Policies", icon: FileText, className: "bg-amber-600 text-white" },
  other: { label: "Other", icon: FileText, className: "bg-slate-600 text-white" },
};

const SUPABASE_STORAGE_BASE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "") + "/storage/v1/object/public";

function docHref(doc: OnboardingDoc): string {
  if (doc.external_url) return doc.external_url;
  if (doc.storage_path) return `${SUPABASE_STORAGE_BASE}/${doc.storage_path}`;
  return "#";
}

export default async function OnboardingHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  // Documents (graceful fallback if table not yet migrated)
  let docs: OnboardingDoc[] = FALLBACK_DOCS;
  try {
    const { data } = await supabase
      .from("onboarding_documents")
      .select("id, title, description, category, storage_path, external_url, file_type, is_required, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (data && data.length > 0) docs = data as OnboardingDoc[];
  } catch {
    // keep fallback
  }

  // This user's onboarding tasks (if any have been assigned by a manager)
  let tasks: OnboardingTask[] = [];
  try {
    const { data } = await supabase
      .from("onboarding_progress")
      .select("id, task_key, task_label, status, notes")
      .eq("hire_email", user.email ?? "")
      .order("created_at", { ascending: true });
    if (data) tasks = data as OnboardingTask[];
  } catch {
    // no tasks yet
  }

  // Group documents by category
  const byCategory = new Map<string, OnboardingDoc[]>();
  for (const doc of docs) {
    const arr = byCategory.get(doc.category) ?? [];
    arr.push(doc);
    byCategory.set(doc.category, arr);
  }
  const categoryOrder = ["forms", "handbook", "training", "checklist", "policy", "other"];
  const orderedCategories = categoryOrder.filter((c) => byCategory.has(c));

  const completed = tasks.filter((t) => t.status === "complete").length;
  const totalTasks = tasks.length;

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10">
      <div className="mb-8">
        <Link href="/staff" className="text-sm text-mocha hover:text-forest">← Staff Portal</Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-forest">New Employee</p>
        <h1 className="mt-1 font-heading text-4xl font-bold text-espresso">Onboarding Hub</h1>
        <p className="mt-2 max-w-prose text-mocha">
          Everything you need to get started at Kynda Coffee in one place — required forms, the
          employee handbook, and your training materials. Download, complete, and bring questions to
          your manager.
        </p>
      </div>

      {/* Personal onboarding tracker (only if a manager assigned tasks) */}
      {totalTasks > 0 && (
        <div className="mb-10 rounded-2xl border border-forest/30 bg-forest/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-espresso">Your Onboarding Checklist</h2>
            <span className="rounded-full bg-forest px-3 py-1 text-sm font-semibold text-sand">
              {completed}/{totalTasks} done
            </span>
          </div>
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 rounded-xl bg-card px-4 py-3">
                {task.status === "complete" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                ) : task.status === "in_progress" ? (
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-mocha/40" />
                )}
                <div className="min-w-0">
                  <p className={`font-medium ${task.status === "complete" ? "text-mocha line-through" : "text-espresso"}`}>
                    {task.task_label}
                  </p>
                  {task.notes && <p className="mt-0.5 text-sm text-mocha">{task.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Document library grouped by category */}
      <div className="space-y-8">
        {orderedCategories.map((category) => {
          const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
          const Icon = meta.icon;
          return (
            <section key={category}>
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.className}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-xl font-bold text-espresso">{meta.label}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(byCategory.get(category) ?? []).map((doc) => {
                  const href = docHref(doc);
                  const isExternal = href.startsWith("http");
                  const isLink = doc.file_type === "link";
                  return (
                    <a
                      key={doc.id}
                      href={href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="group flex items-start gap-3 rounded-xl border border-latte/20 bg-card p-4 transition hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-md"
                    >
                      <div className="mt-0.5 text-forest">
                        {isLink ? <ExternalLink className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-espresso group-hover:text-forest">{doc.title}</h3>
                          {doc.is_required && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Required</span>
                          )}
                        </div>
                        {doc.description && <p className="mt-1 text-sm text-mocha">{doc.description}</p>}
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-forest/30 bg-forest/5 p-5 text-sm text-mocha">
        <p className="font-semibold text-espresso">Manager note</p>
        Federal forms (I-9, W-4) link to the official, always-current government sources so they&apos;re
        never out of date. Internal documents are managed in the admin portal and stored in our own
        Supabase — we own all our data.
      </div>
    </div>
  );
}
