"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/catalog", label: "POS Catalog", icon: ListChecks },
  { href: "/admin/kds", label: "KDS", icon: MonitorCheck },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/promo-codes", label: "Promo Codes", icon: Tag },
  { href: "/admin/gift-cards", label: "Gift Cards", icon: Gift },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/designs", label: "Designs", icon: Sparkles },
  { href: "/admin/training", label: "Training", icon: GraduationCap },
  { href: "/admin/marketing", label: "Marketing", icon: Share2 },
  { href: "/admin/square", label: "Square", icon: CreditCard },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 border-b border-latte/20 bg-surface text-sand shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="font-heading text-xl font-bold tracking-tight">
              Kynda Admin
            </span>
            <div className="h-5 w-px bg-latte/40 dark:bg-latte/20" />
            <span className="text-sm font-medium tracking-wider text-sand-50 uppercase">
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
        <aside className="hidden lg:block w-64 sticky top-[69px] h-[calc(100vh-69px)] border-r border-latte/20 bg-surface text-sand overflow-y-auto">
          <nav className="p-4 space-y-1.5" aria-label="Admin navigation">
            {ADMIN_LINKS.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border",
                    isActive
                      ? "bg-forest/10 border-forest text-forest dark:text-forest-400 shadow-[inset_0_0_8px_rgba(74,222,128,0.15)]"
                      : "border-transparent text-sand-50 hover:bg-white/5 hover:text-white"
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
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-latte/20 bg-surface pb-safe"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
          aria-label="Admin mobile navigation"
        >
          <div className="flex items-center justify-around px-2 pt-2">
            {ADMIN_LINKS.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 min-w-[3.5rem] transition-colors",
                    isActive ? "text-forest dark:text-forest-400" : "text-sand-50"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <link.icon
                    className={cn("h-5 w-5", isActive && "text-forest dark:text-forest-400")}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  <span className="text-[10px] font-medium leading-none">
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
