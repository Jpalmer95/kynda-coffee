export default function AccountLoading() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-2xl">
        <div className="h-8 w-48 animate-pulse rounded bg-latte/20" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-latte/20" />

        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-latte/20 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-pulse rounded bg-latte/20" />
                <div>
                  <div className="h-5 w-32 animate-pulse rounded bg-latte/20" />
                  <div className="mt-1 h-3 w-48 animate-pulse rounded bg-latte/20" />
                </div>
              </div>
              <div className="h-5 w-5 animate-pulse rounded bg-latte/20" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
