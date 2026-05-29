"use client";

import { ExternalLink } from "lucide-react";

/**
 * Delivery platform links for Kynda Coffee
 * Update these URLs when the storefronts are set up on DoorDash/Uber Eats
 */
const DELIVERY_PLATFORMS = [
  {
    id: "doordash",
    name: "DoorDash",
    url: "https://www.doordash.com/store/kynda-coffee",
    color: "#FF3008",
    bgColor: "bg-[#FF3008]",
    tagline: "Fast delivery to your door",
    logo: "🚗",
  },
  {
    id: "ubereats",
    name: "Uber Eats",
    url: "https://www.ubereats.com/store/kynda-coffee",
    color: "#06C167",
    bgColor: "bg-[#06C167]",
    tagline: "Uber Eats delivery",
    logo: "🛵",
  },
];

interface DeliveryPlatformsProps {
  /** Show as compact inline (for menu page sidebar) vs full panel */
  compact?: boolean;
}

export function DeliveryPlatforms({ compact = false }: DeliveryPlatformsProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-mocha">
          Prefer delivery?
        </p>
        <div className="flex gap-2">
          {DELIVERY_PLATFORMS.map((platform) => (
            <a
              key={platform.id}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                "flex items-center gap-2 rounded-lg border border-latte/40 bg-card px-3 py-2 text-sm",
                "text-espresso hover:border-forest/50 hover:shadow-sm transition-all",
                "min-h-[44px]",
              ].join(" ")}
            >
              <span className="text-base">{platform.logo}</span>
              <span className="font-medium">{platform.name}</span>
              <ExternalLink className="h-3 w-3 text-mocha" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-latte/30 bg-card p-6 text-center shadow-sm">
      <div className="mb-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest/10 text-2xl">
          🚚
        </div>
        <h3 className="font-heading text-xl font-bold text-espresso">
          Want it delivered?
        </h3>
        <p className="mt-2 text-sm text-mocha">
          Order through our delivery partners for fresh Kynda Coffee brought right to your door.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DELIVERY_PLATFORMS.map((platform) => (
          <a
            key={platform.id}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "group flex flex-col items-center gap-2 rounded-xl border border-latte/40 bg-background p-4",
              "hover:border-forest/50 hover:shadow-md transition-all min-h-[100px]",
              "justify-center",
            ].join(" ")}
          >
            <span className="text-3xl">{platform.logo}</span>
            <span className="font-heading text-lg font-bold text-espresso group-hover:text-forest">
              {platform.name}
            </span>
            <span className="text-xs text-mocha">{platform.tagline}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-forest">
              Order now <ExternalLink className="h-3 w-3" />
            </span>
          </a>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-mocha">
        Pricing and delivery times set by each platform. Menu may vary slightly.
      </p>
    </div>
  );
}
