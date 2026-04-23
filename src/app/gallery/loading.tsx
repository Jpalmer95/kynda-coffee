export default function Loading() {
  return (
    <div className="section-padding">
      <div className="container-max animate-pulse">
        <div className="h-8 w-48 rounded bg-latte/20" />
        <div className="mt-2 h-4 w-96 rounded bg-latte/20" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-latte/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
