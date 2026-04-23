export default function RewardsLoading() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-4xl animate-pulse">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-latte/20" />
          <div className="mx-auto mt-4 h-8 w-48 rounded-lg bg-latte/20" />
          <div className="mx-auto mt-2 h-5 w-80 rounded bg-latte/20" />
          <div className="mx-auto mt-6 flex justify-center gap-3">
            <div className="h-10 w-32 rounded-full bg-latte/20" />
            <div className="h-10 w-32 rounded-full bg-latte/20" />
          </div>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-latte/20 bg-white p-6 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-latte/20" />
              <div className="mx-auto h-5 w-24 rounded bg-latte/20" />
              <div className="mx-auto h-3 w-full rounded bg-latte/20" />
            </div>
          ))}
        </div>

        <div className="mt-12 sm:mt-16 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-latte/20 bg-white p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-latte/20 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 rounded bg-latte/20" />
                  <div className="h-3 w-full rounded bg-latte/20" />
                  <div className="h-3 w-2/3 rounded bg-latte/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
