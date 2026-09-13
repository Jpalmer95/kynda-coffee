import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Car,
  CheckCircle2,
  Coffee,
  Home,
  MapPin,
  Navigation,
  Trees,
  Circle,
} from "lucide-react";
import { MovingGallery } from "@/components/moving/MovingGallery";
import { MovingUpdatesForm } from "@/components/moving/MovingUpdatesForm";
import {
  KYNDA_TODAY_PHOTOS,
  MOVE_FAQS,
  MOVE_TIMELINE,
  NEW_LOCATION,
  NEW_LOCATION_DIRECTIONS_URL,
  NEW_LOCATION_FEATURES,
  NEW_LOCATION_MAPS_URL,
  NEW_LOCATION_OSM_EMBED,
  resolveGallerySlots,
} from "@/lib/moving/content";

export const metadata: Metadata = {
  title: "We're Moving — Winter 2026 | Kynda Coffee",
  description:
    "Kynda Coffee is relocating to 4909 RM 2147, Horseshoe Bay, TX 78657 — our own new shop just one minute down the road from our current location. Details, timelines, and design renders.",
  alternates: { canonical: "https://kyndacoffee.com/moving" },
  openGraph: {
    title: "Kynda Coffee is moving — one minute down RM 2147",
    description:
      "We're relocating to 4909 RM 2147, Horseshoe Bay, TX 78657 this Winter 2026. Same team, same beans, more room to grow.",
    url: "https://kyndacoffee.com/moving",
    type: "website",
  },
};

const FEATURE_ICONS = [Car, Navigation, Trees, Home] as const;

export default function MovingPage() {
  const slots = resolveGallerySlots();

  return (
    <>
      {/* Hero */}
      <section className="bg-surface px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-sand/25 bg-sand/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-sand">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              Relocating {NEW_LOCATION.openingWindow}
            </span>
            <h1 className="mt-5 font-heading text-3xl font-bold text-sand sm:text-4xl lg:text-5xl">
              We&apos;re moving — one minute down RM 2147
            </h1>
            <p className="mt-4 text-base text-sand/80 sm:text-lg">
              Kynda Coffee is moving into a brand-new shop{" "}
              <span className="font-semibold text-sand">that we own</span> at{" "}
              {NEW_LOCATION.street}, {NEW_LOCATION.city}, {NEW_LOCATION.state}{" "}
              {NEW_LOCATION.zip}. Same team, same beans, same scratch kitchen — with
              the room to grow we&apos;ve been borrowing from a parking lot.
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
                See what&apos;s coming
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Address card */}
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-sand/20 bg-sand/5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand/10">
                  <MapPin className="h-5 w-5 text-sand" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-sand/60">
                    The new address
                  </p>
                  <p className="font-heading text-lg font-semibold text-sand">
                    {NEW_LOCATION.street}
                  </p>
                  <p className="text-sm text-sand/80">
                    {NEW_LOCATION.city}, {NEW_LOCATION.state} {NEW_LOCATION.zip}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-sand/80 sm:text-right">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-sand/60">
                    Distance
                  </dt>
                  <dd className="font-medium text-sand">~1 minute away</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-sand/60">
                    Opening
                  </dt>
                  <dd className="font-medium text-sand">
                    {NEW_LOCATION.openingWindow}
                  </dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 border-t border-sand/15 pt-4 text-sm text-sand/70">
              Our current shop on RM 2147 stays open as usual until move week — nothing
              changes for you until the doors close at the old place and open at the
              new one.
            </p>
          </div>
        </div>
      </section>

      {/* Why we're moving */}
      <section className="section-padding">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
              Why we&apos;re moving
            </h2>
            <div className="mt-4 space-y-4 text-base text-mocha">
              <p>
                Kynda has been leasing our current space since we opened. Leasing
                works right up until it doesn&apos;t: the building, the parking lot,
                and the schedule were never really ours to plan around.
              </p>
              <p>
                Buying a lot on the same stretch of RM 2147 means Kynda puts down
                permanent roots — and we get to design a coffee shop around how you
                actually use it: quick counter pickups, a table to work from, room for
                retail and gatherings, and parking that doesn&apos;t require a strategy.
              </p>
              <p className="font-medium text-espresso">
                We stayed on RM 2147 on purpose. One minute down the road means the
                neighborhood, the walk-up regulars, and the morning route don&apos;t
                change — only the building does.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's coming */}
      <section className="bg-card section-padding">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
              What&apos;s coming with us
            </h2>
            <p className="mt-3 text-base text-mocha">
              The new site is purpose-built for Kynda — here&apos;s what the plan
              actually includes.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6">
            {NEW_LOCATION_FEATURES.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? Coffee;
              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-latte/20 bg-background p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest/10">
                    <Icon className="h-5 w-5 text-forest" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold text-espresso">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-mocha">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Renders / upload slots */}
      <section id="renders" className="section-padding scroll-mt-24">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
              The new space
            </h2>
            <p className="mt-3 text-base text-mocha">
              Design renderings and previews of the new shop. We&apos;ll swap in the
              final artwork as it comes off the drawing board — click any tile to
              enlarge it.
            </p>
          </div>
          <div className="mt-10">
            <MovingGallery slots={slots} />
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-surface section-padding">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-heading text-2xl font-bold text-sand sm:text-3xl">
              Where we are in the process
            </h2>
            <p className="mt-3 text-base text-sand/75">
              We&apos;ll keep this honest and current — check back for milestone
              updates.
            </p>

            <ol className="mt-8 space-y-6">
              {MOVE_TIMELINE.map((step) => (
                <li key={step.label} className="flex gap-4">
                  <span className="mt-0.5 shrink-0">
                    {step.status === "done" ? (
                      <CheckCircle2
                        className="h-6 w-6 text-forest-300"
                        aria-hidden="true"
                      />
                    ) : step.status === "active" ? (
                      <Circle
                        className="h-6 w-6 animate-pulse text-sand"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle className="h-6 w-6 text-sand/35" aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <p className="font-heading text-base font-semibold text-sand">
                      {step.label}
                    </p>
                    <p className="mt-1 text-sm text-sand/70">{step.detail}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-sand/50">
                      {step.status === "done"
                        ? "Complete"
                        : step.status === "active"
                          ? "In progress"
                          : "Upcoming"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Same Kynda, new home */}
      <section className="section-padding">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
              Same Kynda, new home
            </h2>
            <p className="mt-3 text-base text-mocha">
              The coffee, the pastries, the people, and the playlist all come with us.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {KYNDA_TODAY_PHOTOS.map((photo) => (
              <figure
                key={photo.src}
                className="overflow-hidden rounded-3xl border border-latte/20 bg-card"
              >
                <div className="relative aspect-square w-full">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="px-5 py-4 text-sm text-mocha">
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Map + directions */}
      <section className="bg-card section-padding">
        <div className="container-max">
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
                Finding the new shop
              </h2>
              <p className="mt-3 text-base text-mocha">
                {NEW_LOCATION.summary} If you can find us today, you can find the new
                place — head west on RM 2147 and look for our driveway.
              </p>
              <div className="mt-6 space-y-3">
                <a
                  href={NEW_LOCATION_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full justify-center sm:w-auto"
                >
                  <Navigation className="mr-2 h-4 w-4" aria-hidden="true" />
                  Get directions
                </a>
                <p className="text-sm text-mocha/80">
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
              <ul className="mt-6 space-y-2 text-sm text-mocha">
                <li className="flex items-start gap-2">
                  <Car className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
                  Seven parking spaces, including an ADA-accessible space by the entry.
                </li>
                <li className="flex items-start gap-2">
                  <Coffee
                    className="mt-0.5 h-4 w-4 shrink-0 text-forest"
                    aria-hidden="true"
                  />
                  Online ordering, rewards, and gift cards all carry over.
                </li>
              </ul>
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

      {/* FAQ */}
      <section className="section-padding">
        <div className="container-max">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-heading text-2xl font-bold text-espresso sm:text-3xl">
              Moving questions
            </h2>
            <dl className="mt-8 divide-y divide-latte/20 border-y border-latte/20">
              {MOVE_FAQS.map((item) => (
                <div key={item.q} className="py-5">
                  <dt className="font-heading text-base font-semibold text-espresso">
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-sm text-mocha">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Updates signup */}
      <section className="bg-surface px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="container-max">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold text-sand sm:text-3xl">
              Get the move updates
            </h2>
            <p className="mt-3 text-base text-sand/80">
              We&apos;ll email you the renderings, construction milestones, and the
              opening date — nothing else.
            </p>
            <div className="mt-8 flex justify-center">
              <MovingUpdatesForm />
            </div>
            <p className="mt-8 text-sm text-sand/70">
              Still ordering coffee today?{" "}
              <Link
                href="/menu"
                className="underline underline-offset-2 hover:text-sand"
              >
                Check the menu
              </Link>{" "}
              or{" "}
              <Link
                href="/location"
                className="underline underline-offset-2 hover:text-sand"
              >
                visit our current shop
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
