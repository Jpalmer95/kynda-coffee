export default function DesignStudioPage() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Design Studio
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-mocha">
            Browse trending designs, generate unique patterns with AI, and see your
            creation on mugs, tees, glassware, and more.
          </p>
        </div>

        {/* Placeholder — will become the interactive design tool */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Design Canvas */}
          <div className="rounded-2xl border border-latte/20 bg-white p-8">
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Create Your Design
            </h2>
            <div className="mt-4 aspect-square rounded-xl bg-latte/20 flex items-center justify-center">
              <p className="text-mocha text-sm">AI design canvas coming soon</p>
            </div>
          </div>

          {/* Product Preview */}
          <div className="rounded-2xl border border-latte/20 bg-white p-8">
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Preview on Products
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {["Mug", "T-Shirt", "Glass", "Tote"].map((product) => (
                <div
                  key={product}
                  className="aspect-square rounded-xl bg-latte/20 flex items-center justify-center"
                >
                  <span className="text-sm text-mocha">{product}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trending Designs */}
        <div className="mt-16">
          <h2 className="font-heading text-2xl font-bold text-espresso">
            Trending Designs
          </h2>
          <p className="mt-2 text-mocha">
            Curated collections refreshed weekly.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["Coffee Vibes", "Hill Country", "Trending Now", "Seasonal"].map(
              (collection) => (
                <div
                  key={collection}
                  className="aspect-square rounded-xl bg-latte/20 flex items-center justify-center cursor-pointer transition-shadow hover:shadow-lg"
                >
                  <span className="font-medium text-mocha">{collection}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
