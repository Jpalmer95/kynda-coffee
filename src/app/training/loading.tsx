export default function Loading() {
  return (
    <div className="section-padding">
      <div className="container-max animate-pulse">
        <div className="h-8 w-48 rounded bg-latte/20" />
        <div className="mt-2 h-4 w-72 rounded bg-latte/20" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-latte/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
