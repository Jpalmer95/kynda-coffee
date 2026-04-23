export default function Loading() {
  return (
    <div className="section-padding">
      <div className="container-max max-w-3xl animate-pulse">
        <div className="h-8 w-48 rounded bg-latte/20" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full rounded bg-latte/20" />
          <div className="h-4 w-5/6 rounded bg-latte/20" />
          <div className="h-32 w-full rounded-xl bg-latte/20" />
        </div>
      </div>
    </div>
  );
}
