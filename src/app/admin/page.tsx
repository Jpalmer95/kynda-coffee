import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Palette,
  RefreshCw,
  Megaphone,
  Settings,
  GraduationCap,
} from "lucide-react";

export default function AdminPage() {
  const sections = [
    {
      href: "/admin/products",
      label: "Products",
      desc: "Manage catalog, prices, inventory",
      icon: Package,
    },
    {
      href: "/admin/orders",
      label: "Orders",
      desc: "View and manage all orders",
      icon: ShoppingCart,
    },
    {
      href: "/admin/designs",
      label: "AI Designs",
      desc: "Review and publish AI-generated designs",
      icon: Palette,
    },
    {
      href: "/admin/square",
      label: "Square Sync",
      desc: "Sync POS catalog, inventory, and orders",
      icon: RefreshCw,
    },
    {
      href: "/admin/marketing",
      label: "Marketing Agent",
      desc: "AI-powered email, SMS, and social campaigns",
      icon: Megaphone,
    },
    {
      href: "/admin/training",
      label: "Team Training",
      desc: "Employee progress, completions, and course management",
      icon: GraduationCap,
    },
  ];

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-8 flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8 text-espresso" />
          <div>
            <h1 className="font-heading text-3xl font-bold text-espresso">
              Dashboard
            </h1>
            <p className="text-sm text-mocha">Kynda Coffee admin panel</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Today's Revenue", value: "$—" },
            { label: "Orders", value: "—" },
            { label: "Customers", value: "—" },
            { label: "Subscriptions", value: "—" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-latte/20 bg-white p-6"
            >
              <p className="text-sm text-mocha">{stat.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold text-espresso">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Admin Sections */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-latte/20 bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <section.icon className="h-6 w-6 text-mocha transition-colors group-hover:text-rust" />
              <h2 className="mt-3 font-heading text-lg font-semibold text-espresso">
                {section.label}
              </h2>
              <p className="mt-1 text-sm text-mocha">{section.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
