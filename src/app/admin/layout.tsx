"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ListChecks,
  ShoppingCart,
  MonitorCheck,
  Users,
  BarChart3,
  Settings,
  ArrowLeft,
  Tag,
  Gift,
  Sparkles,
  GraduationCap,
  Share2,
  CreditCard,
  QrCode,
  BotMessageSquare,
  ImageIcon,
  Briefcase,
  Inbox,
  CalendarDays,
  Boxes,
  Building2,
  Map as MapIcon,
  Zap,
  Search,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/kds", label: "KDS", icon: MonitorCheck },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/chat", label: "Team Chat", icon: BotMessageSquare },
  { href: "/admin/media", label: "Team Media", icon: ImageIcon },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/catalog", label: "POS Catalog", icon: ListChecks },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/team", label: "Team & Access", icon: Users },
  { href: "/admin/careers", label: "Careers", icon: Briefcase },
  { href: "/admin/b2b", label: "B2B / Wholesale", icon: Building2 },
  { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag },
  { href: "/admin/gift-cards", label: "Gift Cards", icon: Gift },
  { href: "/admin/pricing", label: "Pricing Rules", icon: Tag },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/strategist", label: "AI Strategist", icon: Brain },
  { href: "/admin/designs", label: "Designs", icon: Sparkles },
  { href: "/admin/training", label: "Training", icon: GraduationCap },
  { href: "/admin/marketing", label: "Marketing", icon: Share2 },
  { href: "/admin/marketing/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/marketing/chat", label: "AI Chat", icon: BotMessageSquare },
  { href: "/admin/marketing/images", label: "Images", icon: ImageIcon },
  { href: "/admin/marketing/social", label: "Social", icon: Share2 },
  { href: "/admin/marketing/validator", label: "X Validator", icon: Zap },
  { href: "/admin/square", label: "Square", icon: CreditCard },
  { href: "/admin/image-sync", label: "Image Sync", icon: ImageIcon },
  { href: "/admin/qr-tables", label: "QR Tables", icon: QrCode },
  { href: "/admin/sitemap", label: "Site Map", icon: MapIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navQuery, setNavQuery] = useState("");

  const filteredLinks = useMemo(() => {
    if (!navQuery.trim()) return ADMIN_LINKS;
    const q = navQuery.toLowerCase();
    return ADMIN_LINKS.filter(
      (link) =>
        link.label.toLowerCase().includes(q) ||
        link.href.toLowerCase().includes(q)
    );
  }, [navQuery]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 border-b border-latte bg-surface text-sand shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="font-heading text-xl font-bold tracking-tight text-white drop-shadow-sm">
            Kynda Admin
          </span>
          <div className="h-5 w-px bg-latte" />
          <span className="text-sm font-medium tracking-[0.05em] font-body text-mocha uppercase">
            Management Portal
          </span>
        </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg text-sm text-sand hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Live Site</span>
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 sticky top-[69px] h-[calc(100vh-69px)] border-r border-latte bg-surface text-sand overflow-y-auto">
          <div className="p-4 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mocha/60" />
              <input
                type="text"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Filter pages…"
                className="w-full rounded-lg border border-latte/30 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-sand placeholder:text-mocha/50 focus:border-forest/50 focus:outline-none"
              />
            </div>
          </div>
          <nav className="px-4 pb-4 space-y-1.5" aria-label="Admin navigation">
            {filteredLinks.length === 0 && (
              <p className="px-3 py-4 text-xs text-mocha/60">No pages match "{navQuery}"</p>
            )}
            {filteredLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors border",
                    isActive
                      ? "bg-forest-300/10 border-forest-300/30 text-forest-300"
                      : "border-transparent text-mocha hover:bg-white/5 hover:text-white"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <link.icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Top Nav */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-latte bg-surface pb-safe"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
          aria-label="Admin mobile navigation"
        >
          <div className="flex items-center justify-around px-2 pt-2">
            {(navQuery ? filteredLinks : ADMIN_LINKS).map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 min-w-[3.5rem] transition-colors",
                    isActive ? "text-forest-300" : "text-mocha"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <link.icon
                    className={cn("h-5 w-5", isActive && "text-forest-300")}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  <span className="text-[10px] font-medium leading-none tracking-widest mt-1 uppercase text-mocha">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
