import Link from "next/link";
import { Coffee, Heart, Award, MapPin, Phone, Clock } from "lucide-react";

export const metadata = {
  title: "Our Story | Kynda Coffee",
  description: "Kynda Coffee is an independently owned specialty coffee shop in Horseshoe Bay, Texas. Organic beans, scratch kitchen, and a whole lot of heart since 2020.",
};

export default function AboutPage() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mx-auto max-w-3xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso">
              Our Story
            </h1>
            <p className="mt-3 text-base sm:text-lg text-mocha">
              Built from the ground up with grit, gratitude, and great coffee.
            </p>
          </div>

          {/* Story Content */}
          <div className="prose prose-lg prose-espresso max-w-none text-mocha space-y-4">
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

          {/* Values */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-latte/20 bg-white p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Coffee className="h-6 w-6 text-rust" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold text-espresso">Organic & Specialty</h3>
              <p className="mt-1 text-sm text-mocha">Top 5% of beans, roasted locally</p>
            </div>
            <div className="rounded-xl border border-latte/20 bg-white p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Heart className="h-6 w-6 text-rust" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold text-espresso">Community First</h3>
              <p className="mt-1 text-sm text-mocha">Locally owned, community built</p>
            </div>
            <div className="rounded-xl border border-latte/20 bg-white p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Award className="h-6 w-6 text-rust" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold text-espresso">Zero Outside Funding</h3>
              <p className="mt-1 text-sm text-mocha">Bootstrapped with hard work</p>
            </div>
          </div>

          {/* Visit Card */}
          <div className="mt-12 rounded-2xl bg-espresso p-6 sm:p-8 text-center">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-cream">
              Visit Us in Horseshoe Bay
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 text-left sm:text-center">
              <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                <MapPin className="h-5 w-5 text-latte/70 flex-shrink-0" />
                <address className="not-italic text-sm text-latte/80">
                  <p>4315 FM 2147</p>
                  <p>Horseshoe Bay, TX 78657</p>
                </address>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                <Phone className="h-5 w-5 text-latte/70 flex-shrink-0" />
                <p className="text-sm text-latte/80">
                  <a href="tel:+15122196781" className="hover:text-cream transition-colors">
                    (512) 219-6781
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                <Clock className="h-5 w-5 text-latte/70 flex-shrink-0" />
                <div className="text-sm text-latte/80">
                  <p>Mon – Fri: 6:30 AM – 5:00 PM</p>
                  <p>Sat – Sun: 7:00 AM – 5:00 PM</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <a
                href="https://maps.google.com/?q=4315+FM+2147+Horseshoe+Bay+TX+78657"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-accent"
              >
                Get Directions
              </a>
              <Link href="/contact" className="btn-secondary bg-white/10 text-cream border-white/20 hover:bg-white/20">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
