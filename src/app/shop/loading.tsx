export default function ShopLoading() {
  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Header skeleton */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-40 animate-pulse rounded bg-latte/20" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-latte/20" />
          </div>
          <div className="h-10 w-full sm:w-72 animate-pulse rounded-xl bg-latte/20" />
        </div>

        {/* Filter pills skeleton */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-24 flex-shrink-0 animate-pulse rounded-full bg-latte/20" />
          ))}
        </div>

        {/* Product grid skeleton */}
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-latte/20 bg-white p-3 sm:p-4">
              <div className="aspect-square w-full animate-pulse rounded-xl bg-latte/20" />
              <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-latte/20" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-latte/20" />
              <div className="mt-3 flex items-center justify-between">
                <div className="h-6 w-16 animate-pulse rounded bg-latte/20" />
                <div className="h-8 w-20 animate-pulse rounded-lg bg-latte/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
