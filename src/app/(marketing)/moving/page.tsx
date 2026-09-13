import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Navigation } from "lucide-react";
import { MovingGallery } from "@/components/moving/MovingGallery";
import {
  NEW_LOCATION,
  NEW_LOCATION_DIRECTIONS_URL,
  NEW_LOCATION_MAPS_URL,
  NEW_LOCATION_OSM_EMBED,
  ONLINE_ORDERING_WINDOW,
  ORDERING_LINKS,
  resolveGallerySlots,
} from "@/lib/moving/content";

export const metadata: Metadata = {
  title: "We're Moving — Winter 2026 | Kynda Coffee",
  description:
    "Kynda Coffee is moving to 4909 RM 2147, Horseshoe Bay, TX 78657 — the first location we've ever owned, just one minute down the road. Renders, map, and online ordering while we build.",
  alternates: { canonical: "https://kyndacoffee.com/moving" },
  openGraph: {
    title: "Kynda Coffee is moving — one minute down RM 2147",
    description:
      "Same coffee, pastries, team, and owners — moving into our very own first owned location at 4909 RM 2147 this Winter 2026.",
    url: "https://kyndacoffee.com/moving",
    type: "website",
  },
};

export default function MovingPage() {
  const slots = resolveGallerySlots();

  return (
    <>
      {/* We're moving */}
      <section className="bg-surface px-4 pb-12 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-heading text-3xl font-bold text-sand sm:text-4xl lg:text-5xl">
              We&apos;re moving
            </h1>
            <p className="mt-4 text-base text-sand/85 sm:text-lg">
              Kynda Coffee is moving to{" "}
              <span className="font-semibold text-sand">
                {NEW_LOCATION.street}, {NEW_LOCATION.city}, {NEW_LOCATION.state}{" "}
                {NEW_LOCATION.zip}
              </span>{" "}
              — just one minute down the road, and the first location we&apos;ve ever
              owned.
            </p>
            <p className="mt-4 text-base text-sand/75">
              Same coffee, same pastries, same team, same owners. Only the address
              changes.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={NEW_LOCATION_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full justify-center sm:w-auto"
              >
                <Navigation className="mr-2 h-4 w-4" aria-hidden="true" />
                Get directions
              </a>
              <Link
                href="#renders"
                className="btn-secondary w-full justify-center border-sand/30 text-sand hover:bg-sand/10 sm:w-auto"
              >
                See the renders
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-sand/25 bg-sand/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-sand">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Grand opening {NEW_LOCATION.openingWindow}
            </p>
          </div>
        </div>
      </section>

      {/* Renders */}
      <section id="renders" className="section-padding scroll-mt-24">
        <div className="container-max">
          <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
            The new shop
          </h2>
          <p className="mt-2 text-base text-mocha">
            Renderings of what we&apos;re building. Click any image to enlarge it.
          </p>
          <div className="mt-8">
            <MovingGallery slots={slots} />
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="bg-card section-padding">
        <div className="container-max">
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.4fr] lg:gap-10">
            <div>
              <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
                Where we&apos;re going
              </h2>
              <p className="mt-3 flex items-start gap-2 text-base text-mocha">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
                <span>
                  {NEW_LOCATION.street}
                  <br />
                  {NEW_LOCATION.city}, {NEW_LOCATION.state} {NEW_LOCATION.zip}
                </span>
              </p>
              <a
                href={NEW_LOCATION_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-5 w-full justify-center sm:w-auto"
              >
                <Navigation className="mr-2 h-4 w-4" aria-hidden="true" />
                Get directions
              </a>
              <p className="mt-3 text-sm text-mocha/80">
                Or open it in{" "}
                <a
                  href={NEW_LOCATION_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-espresso"
                >
                  Google Maps
                </a>
                .
              </p>
            </div>
            <div className="overflow-hidden rounded-3xl border border-latte/20">
              <iframe
                src={NEW_LOCATION_OSM_EMBED}
                title="Map of the new Kynda Coffee location on RM 2147"
                className="h-[320px] w-full border-0 sm:h-[420px]"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Online ordering during the transition */}
      <section className="section-padding">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
              Order online while we build
            </h2>
            <p className="mt-3 text-base text-mocha">
              Our online shop stays open the whole time — {ONLINE_ORDERING_WINDOW} — so
              you can keep ordering coffee beans and merch until we open the doors at
              the new shop.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {ORDERING_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group rounded-3xl border border-latte/20 bg-card p-5 transition-colors hover:border-forest/40 focus-visible:ring-2 focus-visible:ring-forest"
                >
                  <p className="font-heading text-base font-semibold text-espresso">
                    {link.label}
                  </p>
                  <p className="mt-1 text-sm text-mocha">{link.detail}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-forest">
                    Shop now
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
