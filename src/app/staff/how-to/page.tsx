import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wrench, ArrowLeft } from "lucide-react";
import { normalizeRole, isTeamMember } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export const metadata = { title: "How-To Guides | Kynda Coffee Staff" };

interface HowToGuide {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content: string;
  image_url: string | null;
  video_url: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  equipment: "Equipment",
  "cold-brew": "Cold Brew",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  safety: "Safety",
  opening: "Opening",
  closing: "Closing",
  other: "Other",
};

const CATEGORY_ORDER = ["equipment", "cold-brew", "cleaning", "maintenance", "safety", "opening", "closing", "other"];

export default async function StaffHowToPage() {
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

  if (!profile || !isTeamMember(normalizeRole((profile as any).role))) {
    redirect("/account");
  }

  let guides: HowToGuide[] = [];
  try {
    const { data, error } = await supabase
      .from("howto_guides")
      .select("id, title, category, description, content, image_url, video_url")
      .eq("is_active", true)
      .order("category")
      .order("sort_order");

    if (!error && data) guides = data as HowToGuide[];
  } catch {
    // table may not exist yet
  }

  // Group by category
  const byCategory = new Map<string, HowToGuide[]>();
  for (const g of guides) {
    const arr = byCategory.get(g.category) ?? [];
    arr.push(g);
    byCategory.set(g.category, arr);
  }
  const orderedCats = CATEGORY_ORDER.filter((c) => byCategory.has(c));

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10">
      <div className="mb-8">
        <Link href="/staff" className="text-sm text-mocha hover:text-forest">← Staff Portal</Link>
        <div className="mt-4 flex items-center gap-2 text-forest">
          <Wrench className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Staff Resources</span>
        </div>
        <h1 className="mt-2 font-heading text-4xl font-bold text-espresso">How-To Guides</h1>
        <p className="mt-2 text-mocha">Step-by-step guides for equipment cleaning, cold brew, and more.</p>
      </div>

      {guides.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center">
          <Wrench className="mx-auto h-12 w-12 text-mocha/40" />
          <p className="mt-4 text-mocha">No guides available yet.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {orderedCats.map((cat) => (
            <section key={cat}>
              <h2 className="mb-4 font-heading text-xl font-bold text-espresso">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {byCategory.get(cat)!.map((g) => (
                  <details key={g.id} className="group rounded-2xl border border-latte/20 bg-card overflow-hidden">
                    <summary className="flex cursor-pointer items-center gap-3 p-4 hover:bg-latte/5">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-espresso">{g.title}</h3>
                        {g.description && <p className="mt-1 text-sm text-mocha line-clamp-1">{g.description}</p>}
                      </div>
                      <ArrowLeft className="h-4 w-4 shrink-0 text-mocha transition-transform group-open:rotate-[-90deg]" />
                    </summary>
                    <div className="border-t border-latte/10 px-4 py-4">
                      {g.video_url && (
                        <video src={g.video_url} controls className="mb-3 max-h-48 w-full rounded-lg" />
                      )}
                      {g.image_url && (
                        <img src={g.image_url} alt="" className="mb-3 max-h-48 w-full rounded-lg object-cover" />
                      )}
                      <div className="max-h-[60vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-espresso/90">
                        {g.content}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
