import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FileText, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

// Default handbook content (used when database table doesn't exist)
const DEFAULT_HANDBOOK = [
  {
    id: "welcome",
    title: "Welcome to Kynda Coffee",
    content: [
      "Welcome to the Kynda Coffee team! We're a specialty coffee shop located in Horseshoe Bay, Texas, dedicated to serving exceptional coffee and creating memorable experiences for our guests.",
      "Our mission is simple: source the best beans, craft every drink with care, and make every customer feel at home.",
      "This handbook covers everything you need to know as a barista. Please read through each section and reach out to your manager with any questions.",
    ],
  },
  {
    id: "dress-code",
    title: "Dress Code & Appearance",
    content: [
      "• Kynda Coffee branded shirt (provided on your first day)",
      "• Dark-colored pants or jeans (no rips/tears)",
      "• Non-slip closed-toe shoes (required for safety)",
      "• Clean apron (provided)",
      "• Minimal jewelry — avoid rings/bracelets that could fall into drinks",
      "• Hair tied back if it touches your shoulders",
      "• Natural-looking nails — no nail chips that could fall into drinks",
    ],
  },
  {
    id: "customer-service",
    title: "Customer Service Standards",
    content: [
      "Greet every customer within 10 seconds of them approaching the counter.",
      "Use the Kynda welcome: 'Hi, welcome to Kynda! What can I get started for you today?'",
      "Learn regulars' names and usual orders — this is our superpower.",
      "If a customer seems unsure, offer recommendations. Ask if they prefer hot/cold, sweet/bold, light/strong.",
      "If a drink doesn't meet standards, remake it — no questions asked.",
      "Thank every customer by name if you know it.",
      "Handle complaints with grace: listen, apologize, fix it, offer something extra.",
    ],
  },
  {
    id: "drink-standards",
    title: "Drink Quality Standards",
    content: [
      "Espresso shots must be pulled within the ideal 25-30 second window.",
      "If a shot runs outside this window, discard and repull.",
      "Milk must be steamed to silky microfoam — no large bubbles.",
      "Serve drinks within 30 seconds of completion. Lattes lose their art fast!",
      "Taste-test new recipes and syrups before serving to customers.",
      "If you're unsure about a drink — ask a teammate before it leaves the bar.",
      "Always use the correct cup size for each drink (follow the recipe cards).",
    ],
  },
  {
    id: "food-safety",
    title: "Food Safety & Hygiene",
    content: [
      "Wash hands thoroughly before making drinks, after handling money, and after touching your face.",
      "Change gloves between tasks (especially raw food → ready-to-eat).",
      "Use color-coded cutting boards: red for meat, green for produce.",
      "Check expiration dates daily — first in, first out.",
      "Keep cooler temperatures logged (target: 33-40°F).",
      "Report any equipment issues immediately to your manager.",
      "If you're sick — stay home. We have sick pay, don't risk our customers.",
    ],
  },
  {
    id: "cash-handling",
    title: "Cash Handling & POS",
    content: [
      "Each barista is responsible for their own cash drawer during a shift.",
      "Count drawer at open — record starting amount.",
      "Count drawer at close — record ending amount. Discrepancies over $5 must be reported.",
      "Never share your POS login with another barista.",
      "Void transactions require manager approval and a note explaining why.",
      "Handle cash carefully — count change back to the customer aloud.",
      "End-of-shift tip pool is divided evenly among working baristas.",
    ],
  },
  {
    id: "schedule",
    title: "Scheduling & Punctuality",
    content: [
      "Schedules are posted two weeks in advance.",
      "Arrive 10 minutes before your shift to prep — don't cut into work time.",
      "To request time off, submit at least 2 weeks in advance via the scheduling system.",
      "Shift swaps require manager approval and both parties' consent.",
      "If you're running late, call the shop ASAP — don't text, call.",
      "No-call no-show is grounds for immediate termination.",
      "Three unexcused tardies = written warning.",
    ],
  },
  {
    id: "safety",
    title: "Safety & Emergency Procedures",
    content: [
      "Know the locations of the fire extinguisher, first aid kit, and AED.",
      "All spills must be cleaned immediately — use 'Wet Floor' sign.",
      "In case of fire: evacuate via posted exit routes, gather at the parking lot.",
      "Robbery: comply, don't resist, call 911 after the person leaves.",
      "Injured customer/employee: first aid first, then 911 if serious, then log incident.",
      "All injuries must be reported to your manager and logged in the incident book.",
      "You have the right to refuse service to anyone who makes you feel unsafe.",
    ],
  },
];

export default async function StaffHandbookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account");

  // Try to fetch from database, fall back to default content
  let sections = DEFAULT_HANDBOOK;
  try {
    const { data, error } = await supabase
      .from("handbook_sections")
      .select("*")
      .order("order_index");

    if (!error && data && data.length > 0) {
      sections = data.map((s) => ({
        id: s.id,
        title: s.title,
        content: Array.isArray(s.content) ? s.content : [s.content],
      }));
    }
  } catch {
    // Use default sections
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-purple-600">
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">
            Staff Reference
          </span>
        </div>
        <h1 className="mt-2 font-heading text-4xl font-bold text-espresso">
          Employee Handbook
        </h1>
        <p className="mt-2 text-mocha">
          Policies, procedures, and everything you need to succeed at Kynda Coffee.
        </p>
      </div>

      {/* Table of contents */}
      <nav className="mb-10 rounded-xl border border-latte/20 bg-card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-mocha">
          Table of Contents
        </h2>
        <ul className="space-y-1.5">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex items-center gap-2 text-sm text-espresso hover:text-forest"
              >
                <span className="text-xs text-mocha w-5">{i + 1}.</span>
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sections */}
      <div className="space-y-12">
        {sections.map((section, i) => (
          <section key={section.id} id={section.id} className="scroll-mt-8">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest text-sand text-sm font-bold">
                {i + 1}
              </span>
              <h2 className="font-heading text-2xl font-bold text-espresso pt-0.5">
                {section.title}
              </h2>
            </div>
            <div className="space-y-3 pl-11">
              {section.content.map((paragraph, j) => (
                <p key={j} className="text-sm text-espresso leading-relaxed whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Acknowledge section */}
      <div className="mt-12 rounded-xl border-l-4 border-forest bg-card p-6">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-forest mt-0.5" />
          <div>
            <h3 className="font-heading text-lg font-bold text-espresso mb-2">
              Acknowledgment
            </h3>
            <p className="text-sm text-mocha mb-4">
              By working at Kynda Coffee, you agree to follow the policies and standards outlined in this handbook. Updates will be communicated via team meetings and this page.
            </p>
            <p className="text-xs text-mocha italic">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
