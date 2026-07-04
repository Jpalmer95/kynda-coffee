"use client";

import { Coffee, MapPin, ShoppingBag, Truck } from "lucide-react";
import type { QrFulfillmentMode } from "@/lib/orders/qr-order";

interface FulfillmentOption {
  mode: QrFulfillmentMode | "delivery";
  icon: typeof MapPin;
  title: string;
  desc: string;
  eta?: string;
  disabled?: boolean;
}

const FULFILLMENT_OPTIONS: FulfillmentOption[] = [
  {
    mode: "table",
    icon: MapPin,
    title: "At the Table",
    desc: "Scan the QR code at your table — coming soon!",
    eta: "Coming Soon",
    disabled: true,
  },
  {
    mode: "lobby",
    icon: Coffee,
    title: "In the Lobby",
    desc: "Order from where you are — grab it at the counter",
    eta: "Ready in 10–15 min",
  },
  {
    mode: "pickup",
    icon: ShoppingBag,
    title: "Curbside",
    desc: "Park outside, describe your car, we bring it to you",
    eta: "Ready in 15–20 min",
  },
  {
    mode: "delivery",
    icon: Truck,
    title: "Delivery",
    desc: "Order via DoorDash or Uber Eats for home delivery",
    eta: "30–45 min",
  },
];

interface FulfillmentModeSelectorProps {
  selectedMode: QrFulfillmentMode | "delivery" | null;
  onSelect: (mode: QrFulfillmentMode | "delivery") => void;
}

export function FulfillmentModeSelector({
  selectedMode,
  onSelect,
}: FulfillmentModeSelectorProps) {
  return (
    <div className="w-full">
      <h2 className="font-heading text-xl font-bold text-espresso mb-4">
        How would you like your order?
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {FULFILLMENT_OPTIONS.map((option) => {
          const isSelected = selectedMode === option.mode;
          const Icon = option.icon;
          return (
            <button
              key={option.mode}
              onClick={() => !option.disabled && onSelect(option.mode)}
              disabled={option.disabled}
              className={[
                "group relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all",
                "min-h-[120px] sm:min-h-[140px]",
                option.disabled
                  ? "border-latte/20 bg-latte/5 opacity-60 cursor-not-allowed"
                  : isSelected
                    ? "border-forest bg-forest/5 shadow-md ring-2 ring-forest/30"
                    : "border-latte/40 bg-card hover:border-forest/50 hover:shadow-sm",
              ].join(" ")}
              type="button"
            >
              {isSelected && !option.disabled && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-forest text-sand">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              )}
              {option.disabled && (
                <span className="absolute top-2 right-2 rounded-full bg-mocha/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mocha">
                  Soon
                </span>
              )}
              <Icon
                className={[
                  "h-7 w-7 mb-2",
                  isSelected ? "text-forest" : "text-mocha group-hover:text-forest",
                ].join(" ")}
              />
              <h3 className="font-heading text-base font-bold text-espresso">
                {option.title}
              </h3>
              <p className="mt-1 text-xs text-mocha line-clamp-2">{option.desc}</p>
              {option.eta && (
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-forest/80">
                  {option.eta}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
