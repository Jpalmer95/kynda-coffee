export default function BlogLoading() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-4xl animate-pulse">
        {/* Hero skeleton */}
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-latte/20" />
          <div className="mx-auto mt-4 h-8 w-64 rounded-lg bg-latte/20" />
          <div className="mx-auto mt-2 h-5 w-96 rounded bg-latte/20" />
        </div>

        {/* Featured post skeleton */}
        <div className="mt-10 sm:mt-12 grid sm:grid-cols-2 rounded-2xl border border-latte/20 bg-white overflow-hidden">
          <div className="aspect-video bg-latte/20" />
          <div className="p-6 sm:p-8 space-y-3">
            <div className="h-4 w-20 rounded bg-latte/20" />
            <div className="h-6 w-3/4 rounded bg-latte/20" />
            <div className="h-4 w-full rounded bg-latte/20" />
            <div className="h-4 w-2/3 rounded bg-latte/20" />
            <div className="h-3 w-32 rounded bg-latte/20" />
          </div>
        </div>

        {/* Post grid skeleton */}
        <div className="mt-10 sm:mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-latte/20 bg-white overflow-hidden">
              <div className="aspect-video bg-latte/20" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-16 rounded bg-latte/20" />
                <div className="h-5 w-3/4 rounded bg-latte/20" />
                <div className="h-3 w-full rounded bg-latte/20" />
                <div className="h-3 w-24 rounded bg-latte/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
