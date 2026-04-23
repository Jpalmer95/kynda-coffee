export default function SearchLoading() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl mx-auto">
        {/* Search input skeleton */}
        <div className="h-12 w-full animate-pulse rounded-xl bg-latte/20" />

        {/* Results skeleton */}
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-latte/20 bg-white p-4"
            >
              <div className="h-20 w-20 flex-shrink-0 animate-pulse rounded-lg bg-latte/20" />
              <div className="flex-1">
                <div className="h-5 w-48 animate-pulse rounded bg-latte/20" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-latte/20" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-latte/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
