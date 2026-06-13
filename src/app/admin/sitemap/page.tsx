import type { Metadata } from "next";
import Link from "next/link";
import { Map as MapIcon, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Site Map — Admin",
};

/**
 * /admin/sitemap — the master legend of EVERY route on kyndacoffee.com.
 * One place for the owner to jump anywhere: storefront, ordering surfaces,
 * account, staff portal, and every admin tool (including pages that aren't
 * in the sidebar). Keep this in sync when adding routes.
 */

interface RouteEntry {
  path: string;
  label: string;
  note?: string;
}

interface RouteGroup {
  title: string;
  blurb?: string;
  routes: RouteEntry[];
}

const GROUPS: RouteGroup[] = [
  {
    title: "Admin — Daily Operations",
    routes: [
      { path: "/admin", label: "Dashboard", note: "stats overview" },
      { path: "/admin/kds", label: "KDS (in portal)", note: "kitchen display inside admin" },
      { path: "/kds", label: "KDS (full-screen)", note: "tablet surface, no site chrome; ?board=parking etc." },
      { path: "/admin/orders", label: "Orders", note: "all orders, click into details" },
      { path: "/admin/inbox", label: "Inbox", note: "contact messages + catering requests (NOT in sidebar)" },
      { path: "/admin/careers", label: "Careers", note: "job openings + applications" },
      { path: "/admin/schedule", label: "Schedule", note: "staff shifts + requests (NOT in sidebar)" },
      { path: "/admin/inventory", label: "Inventory", note: "MenuMetrics stock + pars (NOT in sidebar)" },
      { path: "/admin/team", label: "Team & Access", note: "roles + invite new members" },
      { path: "/admin/notifications", label: "Notifications", note: "push/alert settings (NOT in sidebar)" },
    ],
  },
  {
    title: "Admin — Catalog & Commerce",
    routes: [
      { path: "/admin/products", label: "Products", note: "shop products; /new to create" },
      { path: "/admin/catalog", label: "POS Catalog", note: "Square-synced items + channel visibility" },
      { path: "/admin/pricing", label: "Pricing Rules", note: "per-category margin targets" },
      { path: "/admin/specials", label: "Monthly Specials", note: "(NOT in sidebar)" },
      { path: "/admin/promo-codes", label: "Promo Codes" },
      { path: "/admin/gift-cards", label: "Gift Cards" },
      { path: "/admin/subscriptions", label: "Subscriptions", note: "coffee club members (NOT in sidebar)" },
      { path: "/admin/designs", label: "Designs", note: "studio moderation + curated picks" },
      { path: "/admin/qr-tables", label: "QR Tables", note: "generate table QR codes" },
      { path: "/admin/square", label: "Square Sync" },
      { path: "/admin/image-sync", label: "Image Sync" },
      { path: "/admin/b2b", label: "B2B / Wholesale", note: "leads + accounts pipeline (NOT in sidebar)" },
    ],
  },
  {
    title: "Admin — Money & Intelligence (owner only)",
    routes: [
      { path: "/admin/accounting", label: "Accounting", note: "P&L, transactions" },
      { path: "/admin/analytics", label: "Analytics" },
      { path: "/admin/insights", label: "Insights", note: "AI business insights (NOT in sidebar)" },
      { path: "/admin/customers", label: "Customers" },
      { path: "/admin/affiliates", label: "Affiliates / Referrals", note: "(NOT in sidebar)" },
      { path: "/admin/data-export", label: "Data Export", note: "(NOT in sidebar)" },
      { path: "/admin/settings", label: "Settings" },
    ],
  },
  {
    title: "Admin — Marketing",
    routes: [
      { path: "/admin/marketing", label: "Marketing Hub" },
      { path: "/admin/marketing/approvals", label: "Approvals", note: "approve agent-drafted content (NOT in sidebar)" },
      { path: "/admin/marketing/chat", label: "AI Chat" },
      { path: "/admin/marketing/content-drop", label: "Content Drop", note: "(NOT in sidebar)" },
      { path: "/admin/marketing/images", label: "Images" },
      { path: "/admin/marketing/social", label: "Social Posts" },
      { path: "/admin/newsletters", label: "Newsletters", note: "(NOT in sidebar)" },
      { path: "/admin/training", label: "Training Admin" },
    ],
  },
  {
    title: "Customer Ordering Surfaces",
    blurb: "Every way a customer (or agent) can order.",
    routes: [
      { path: "/menu", label: "Menu", note: "browse + order ahead" },
      { path: "/order", label: "QR / Table Order", note: "?table=X from table QR codes" },
      { path: "/qr-menu", label: "QR Menu", note: "scan-to-browse" },
      { path: "/qr-order", label: "QR Order" },
      { path: "/kiosk", label: "Kiosk", note: "in-store tablet, staff-attended" },
      { path: "/shop", label: "Shop", note: "beans, retail; /shop/cart, /shop/checkout" },
      { path: "/shop/merch", label: "Merch Shop", note: "Printful print-on-demand" },
      { path: "/studio", label: "Design Studio", note: "custom merch designer" },
      { path: "/gift-cards", label: "Gift Cards" },
      { path: "/track-order", label: "Track Order" },
      { path: "/.well-known/agent.json", label: "Agent Manifest", note: "AI-agent ordering entry point (JSON)" },
    ],
  },
  {
    title: "Marketing / Info Pages",
    routes: [
      { path: "/", label: "Home" },
      { path: "/about", label: "Our Story" },
      { path: "/contact", label: "Contact", note: "form + join-team tab + map" },
      { path: "/careers", label: "Careers", note: "public openings + applications" },
      { path: "/catering", label: "Catering", note: "quote request form" },
      { path: "/wholesale", label: "Wholesale", note: "B2B inquiry form" },
      { path: "/location", label: "Location" },
      { path: "/gallery", label: "Gallery" },
      { path: "/blog", label: "Blog" },
      { path: "/rewards", label: "Rewards / Loyalty" },
      { path: "/refer", label: "Referrals" },
      { path: "/faq", label: "FAQ" },
      { path: "/help", label: "Help" },
      { path: "/search", label: "Search" },
      { path: "/shipping", label: "Shipping Info" },
      { path: "/size-guide", label: "Size Guide" },
      { path: "/terms", label: "Terms" },
      { path: "/privacy", label: "Privacy" },
      { path: "/accessibility", label: "Accessibility" },
    ],
  },
  {
    title: "Account & Auth",
    routes: [
      { path: "/account", label: "Account / Sign In", note: "magic-link login" },
      { path: "/device-login", label: "Device Sign-In", note: "shared tablets (KDS) — owner approval code" },
      { path: "/account/orders", label: "Order History" },
      { path: "/account/rewards", label: "My Rewards" },
      { path: "/account/subscriptions", label: "Coffee Club" },
      { path: "/account/addresses", label: "Addresses" },
      { path: "/account/favorites", label: "Favorites" },
      { path: "/account/notifications", label: "Notification Prefs" },
      { path: "/account/profile", label: "Profile" },
    ],
  },
  {
    title: "Staff Portal (staff tier+)",
    routes: [
      { path: "/staff", label: "Staff Home" },
      { path: "/staff/schedule", label: "My Schedule" },
      { path: "/staff/chat", label: "Team Chat" },
      { path: "/staff/checklists", label: "Checklists", note: "opening/closing" },
      { path: "/staff/recipes", label: "Recipes" },
      { path: "/staff/par-counts", label: "Par Counts" },
      { path: "/staff/waste-log", label: "Waste Log" },
      { path: "/staff/handbook", label: "Handbook" },
      { path: "/staff/onboarding", label: "Onboarding" },
      { path: "/training", label: "Training Modules" },
    ],
  },
];

export default function AdminSitemapPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-sand">
            <MapIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-espresso">Site Map</h1>
            <p className="text-sm text-mocha">
              Every route on kyndacoffee.com — including admin tools not shown in the sidebar.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {GROUPS.map((group) => (
            <div key={group.title} className="rounded-2xl border border-latte/20 bg-card p-5">
              <h2 className="font-heading text-lg font-semibold text-espresso">{group.title}</h2>
              {group.blurb && <p className="mt-1 text-xs text-mocha">{group.blurb}</p>}
              <ul className="mt-3 space-y-1.5">
                {group.routes.map((r) => (
                  <li key={r.path} className="flex items-baseline gap-2 text-sm">
                    <Link
                      href={r.path}
                      className="inline-flex shrink-0 items-center gap-1 font-medium text-forest hover:underline"
                    >
                      {r.label}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                    <code className="shrink-0 text-xs text-mocha/80">{r.path}</code>
                    {r.note && <span className="text-xs text-mocha/70">— {r.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-mocha">
          Routes marked &quot;NOT in sidebar&quot; are fully functional pages reachable only by URL (or from here).
        </p>
      </div>
    </div>
  );
}
