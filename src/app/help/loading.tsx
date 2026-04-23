export default function Loading() {
  return (
    <div className="section-padding">
      <div className="container-max max-w-3xl animate-pulse">
        <div className="h-8 w-48 rounded bg-latte/20" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-latte/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
