export default function Loading() {
  return (
    <section className="section-padding">
      <div className="container-max flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-latte/20 border-t-rust" role="status" aria-label="Loading" />
          <p className="mt-4 text-sm text-mocha">Loading...</p>
        </div>
      </div>
    </section>
  );
}
