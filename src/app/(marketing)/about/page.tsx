export default function AboutPage() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Our Story
          </h1>

          <div className="mt-8 prose prose-lg text-mocha">
            <p>
              Kynda Coffee started with a dream, a lot of late nights, and zero
              outside funding. Founded in late 2019 and opened in March 2020 — right
              at the start of everything — we&apos;ve built this shop with our own
              hands.
            </p>
            <p>
              From barista to baker, manager to electrician, plumber to graphic
              designer — every role has been filled by someone who believes that
              specialty coffee should be organic, honest, and crafted with care.
            </p>
            <p>
              Six years later, our team has grown, our community has rallied around
              us, and our commitment remains the same: serve the top 5% of coffee
              beans from around the world, roasted locally, with a smile.
            </p>
            <p>
              Whether you&apos;re grabbing your morning ritual, ordering beans to
              brew at home, or designing your own Kynda merch — you&apos;re part of
              this story.
            </p>
          </div>

          <div className="mt-12 rounded-2xl bg-espresso p-8 text-center">
            <h2 className="font-heading text-2xl font-bold text-cream">
              Visit Us in Horseshoe Bay
            </h2>
            <address className="mt-4 not-italic text-latte/70">
              <p>4315 FM 2147</p>
              <p>Horseshoe Bay, TX 78657</p>
              <p className="mt-2">(512) 219-6781</p>
            </address>
          </div>
        </div>
      </div>
    </section>
  );
}
