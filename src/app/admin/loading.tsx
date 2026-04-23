export default function AdminLoading() {
  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Header skeleton */}
        <div className="mb-6 sm:mb-8 flex items-center gap-3">
          <div className="h-7 w-7 sm:h-8 sm:w-8 animate-pulse rounded-lg bg-latte/20" />
          <div>
            <div className="h-7 w-32 sm:h-8 animate-pulse rounded bg-latte/20" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-latte/20" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="mb-8 sm:mb-10 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-latte/20 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="h-4 w-4 animate-pulse rounded bg-latte/20" />
                <div className="h-3.5 w-3.5 animate-pulse rounded bg-latte/20" />
              </div>
              <div className="mt-2 h-4 w-20 animate-pulse rounded bg-latte/20" />
              <div className="mt-1 h-6 w-16 animate-pulse rounded bg-latte/20" />
            </div>
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="h-6 w-20 animate-pulse rounded bg-latte/20 mb-4" />
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl border border-latte/20 bg-white p-4 sm:p-6">
              <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-xl bg-latte/20" />
              <div className="flex-1">
                <div className="h-5 w-24 animate-pulse rounded bg-latte/20" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-latte/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
