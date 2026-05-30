"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Clock,
  Navigation,
  Phone,
  Mail,
  Car,
  Coffee,
} from "lucide-react";

const ADDRESS = {
  street: "4315 FM 2147",
  city: "Horseshoe Bay",
  state: "TX",
  zip: "78657",
};

const FULL_ADDRESS = `${ADDRESS.street}, ${ADDRESS.city}, ${ADDRESS.state} ${ADDRESS.zip}`;

// OpenStreetMap embed (no API key required)
const MAP_EMBED =
  "https://www.openstreetmap.org/export/embed.html?bbox=-98.43%2C30.55%2C-98.38%2C30.60&layer=mapnik&marker=30.5805%2C-98.4056";

const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(FULL_ADDRESS)}`;

// Hours: 7am–5pm daily
const HOURS = [
  { day: "Monday", hours: "7:00 AM – 5:00 PM", hours24: "0700-1700" },
  { day: "Tuesday", hours: "7:00 AM – 5:00 PM", hours24: "0700-1700" },
  { day: "Wednesday", hours: "7:00 AM – 5:00 PM", hours24: "0700-1700" },
  { day: "Thursday", hours: "7:00 AM – 5:00 PM", hours24: "0700-1700" },
  { day: "Friday", hours: "7:00 AM – 5:00 PM", hours24: "0700-1700" },
  { day: "Saturday", hours: "7:00 AM – 5:00 PM", hours24: "0700-1700" },
  { day: "Sunday", hours: "7:00 AM – 5:00 PM", hours24: "0700-1700" },
];

function isOpenNow(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = hours * 100 + minutes;
  return time >= 700 && time < 1700;
}

function getCurrentDayIndex(): number {
  // JS: 0=Sunday, 1=Monday, ... 6=Saturday
  // Our array: 0=Monday, ... 6=Sunday
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function LocationClient() {
  const [openNow, setOpenNow] = useState(false);
  const [todayIndex, setTodayIndex] = useState(0);

  useEffect(() => {
    setOpenNow(isOpenNow());
    setTodayIndex(getCurrentDayIndex());
    // Update every minute
    const interval = setInterval(() => setOpenNow(isOpenNow()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="relative bg-surface px-6 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800">
            <MapPin className="h-8 w-8 text-sand" />
          </div>
          <h1 className="font-heading text-4xl font-semibold text-sand sm:text-5xl">
            Find Us
          </h1>
          <p className="mt-3 text-lg text-sand/80">
            {FULL_ADDRESS}
          </p>
          <div className="mt-4 inline-flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                openNow ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span className={`text-sm font-medium ${openNow ? "text-green-300" : "text-red-300"}`}>
              {openNow ? "Open Now" : "Closed"}
            </span>
          </div>
        </div>
      </section>

      {/* MAP + INFO */}
      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          {/* Map */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="aspect-[4/3] w-full">
              <iframe
                src={MAP_EMBED}
                className="h-full w-full border-0"
                allowFullScreen
                loading="lazy"
                title="Kynda Coffee location map"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border p-4">
              <span className="text-sm text-muted-foreground">OpenStreetMap</span>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-accent inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
              >
                <Navigation className="h-4 w-4" />
                Get Directions
              </a>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Hours */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                Hours
              </h2>
              <div className="mt-4 divide-y divide-border">
                {HOURS.map((h, i) => (
                  <div
                    key={h.day}
                    className={`flex items-center justify-between py-2.5 text-sm ${
                      i === todayIndex ? "font-semibold" : ""
                    }`}
                  >
                    <span className={i === todayIndex ? "text-primary" : "text-foreground"}>
                      {h.day}
                      {i === todayIndex && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(today)</span>
                      )}
                    </span>
                    <span className={i === todayIndex ? "text-primary" : "text-muted-foreground"}>
                      {h.hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-foreground">
                <Phone className="h-5 w-5 text-primary" />
                Contact
              </h2>
              <div className="mt-4 space-y-3">
                <a
                  href="tel:+15122196781"
                  className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  (512) 219-6781
                </a>
                <a
                  href="mailto:hello@kyndacoffee.com"
                  className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  hello@kyndacoffee.com
                </a>
              </div>
            </div>

            {/* Parking */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-foreground">
                <Car className="h-5 w-5 text-primary" />
                Parking
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Free parking available in front of the building. Curbside ordering available —
                select &quot;Curbside&quot; when placing your order and describe your vehicle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="border-t border-border bg-card px-6 py-12">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            What We Offer
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Coffee, label: "Specialty Coffee" },
              { icon: MapPin, label: "Dine In" },
              { icon: Car, label: "Curbside" },
              { icon: Navigation, label: "Delivery via DoorDash" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center rounded-xl bg-background p-6"
              >
                <item.icon className="h-6 w-6 text-primary" />
                <span className="mt-3 text-sm font-medium text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
