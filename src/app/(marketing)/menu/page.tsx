export default function MenuPage() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Our Menu
          </h1>
          <p className="mt-3 text-lg text-mocha">
            Organic specialty coffee and scratch kitchen — order for pickup or dine in.
          </p>
        </div>

        {/* Menu sections placeholder */}
        {["Espresso Drinks", "Cold Drinks", "Specialty", "Scratch Kitchen"].map(
          (section) => (
            <div key={section} className="mb-12">
              <h2 className="font-heading text-2xl font-bold text-espresso">
                {section}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-latte/20 bg-white p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-espresso">Menu Item {i}</h3>
                        <p className="mt-1 text-sm text-mocha">Description here</p>
                      </div>
                      <span className="font-medium text-espresso">$X.XX</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Order CTA */}
        <div className="mt-8 rounded-2xl bg-espresso p-8 text-center">
          <h2 className="font-heading text-2xl font-bold text-cream">
            Ready to Order?
          </h2>
          <p className="mt-2 text-latte/70">
            Order ahead for pickup or scan the QR code in-store.
          </p>
          <button className="btn-accent mt-6">Order for Pickup</button>
        </div>
      </div>
    </section>
  );
}
