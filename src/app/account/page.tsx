import Link from "next/link";

export default function AccountPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-espresso">My Account</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { href: "/account/orders", title: "Order History", desc: "View past orders and tracking" },
            { href: "/account/subscriptions", title: "Coffee Club", desc: "Manage your subscription" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-latte/20 bg-white p-6 transition-shadow hover:shadow-lg"
            >
              <h2 className="font-heading text-lg font-semibold text-espresso">
                {link.title}
              </h2>
              <p className="mt-1 text-sm text-mocha">{link.desc}</p>
            </Link>
          ))}
        </div>

        {/* Auth placeholder */}
        <div className="mt-12 rounded-xl border border-latte/20 bg-white p-8 text-center">
          <p className="text-mocha">Sign in to manage your account.</p>
          <button className="btn-primary mt-4">Sign In</button>
        </div>
      </div>
    </section>
  );
}
