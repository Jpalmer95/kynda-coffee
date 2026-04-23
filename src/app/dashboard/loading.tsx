export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-latte/20" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-latte/20" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-xl bg-latte/20" />
    </div>
  );
}
