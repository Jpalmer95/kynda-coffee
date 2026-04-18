export default function AdminPage() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <h1 className="font-heading text-3xl font-bold text-espresso">Dashboard</h1>
        <p className="mt-2 text-mocha">Kynda Coffee admin panel</p>

        {/* Stats grid placeholder */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Quick links */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/products", label: "Products" },
            { href: "/admin/orders", label: "Orders" },
            { href: "/admin/designs", label: "AI Designs" },
            { href: "/admin/marketing", label: "Marketing" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-xl border border-latte/20 bg-white p-4 text-center font-medium text-espresso transition-colors hover:bg-latte/10"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
