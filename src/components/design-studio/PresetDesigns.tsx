"use client";

import { useState } from "react";
import {
  DEFAULT_DESIGNS,
  STYLE_CATEGORIES,
  KYND_LOGO,
  type DefaultDesign,
} from "@/lib/printful/catalog";
import { Heart, Star } from "lucide-react";

interface PresetDesignsProps {
  onSelectDesign: (design: DefaultDesign | { id: string; name: string; url: string; type: "sticker" }) => void;
  selectedProductId: string;
}

export function PresetDesigns({ onSelectDesign, selectedProductId }: PresetDesignsProps) {
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [showKyndaLogo, setShowKyndaLogo] = useState(false);

  const trendingDesigns = DEFAULT_DESIGNS.filter((d) => d.trending);
  const filteredDesigns =
    styleFilter === "all"
      ? DEFAULT_DESIGNS
      : DEFAULT_DESIGNS.filter((d) => d.style === styleFilter);

  // Filter designs that match the selected product
  const matchingDesigns = filteredDesigns.filter((d) => d.productId === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Quick Add: Kynda Logo */}
      <div className="bg-card/50 rounded-xl p-4 border border-latte/20">
        <h3 className="text-sm font-semibold text-espresso mb-3 flex items-center gap-2">
          <Star size={16} className="text-forest" />
          Quick Add: Kynda Logo
        </h3>
        <button
          onClick={() => onSelectDesign(KYND_LOGO)}
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-background border border-latte/30 hover:border-forest/50 hover:shadow-sm transition"
        >
          <div className="w-12 h-12 rounded bg-card flex items-center justify-center overflow-hidden">
            <img src={KYND_LOGO.url} alt="Kynda Logo" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-espresso">Kynda Coffee Logo</div>
            <div className="text-xs text-mocha">Add to any product</div>
          </div>
          <div className="text-xs font-medium text-forest">Add</div>
        </button>
      </div>

      {/* Trending Designs */}
      {trendingDesigns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-espresso mb-3 flex items-center gap-2">
            <Heart size={16} className="text-red-500 fill-red-500" />
            Trending Designs
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {trendingDesigns.slice(0, 6).map((design) => (
              <button
                key={design.id}
                onClick={() => onSelectDesign(design)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-latte/20 hover:border-forest/50 transition"
              >
                <img
                  src={design.imageUrl}
                  alt={design.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <div className="text-xs text-white font-medium line-clamp-1">{design.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Style Filter */}
      <div>
        <h3 className="text-sm font-semibold text-espresso mb-3">Browse by Style</h3>
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setStyleFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              styleFilter === "all"
                ? "bg-forest text-sand"
                : "bg-card text-espresso border border-latte/30"
            }`}
          >
            All
          </button>
          {STYLE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setStyleFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                styleFilter === cat.id
                  ? "bg-forest text-sand"
                  : "bg-card text-espresso border border-latte/30"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filtered Designs Grid */}
        <div className="grid grid-cols-2 gap-3">
          {(matchingDesigns.length > 0 ? matchingDesigns : filteredDesigns).map((design) => (
            <button
              key={design.id}
              onClick={() => onSelectDesign(design)}
              className="group relative rounded-lg overflow-hidden border border-latte/20 hover:border-forest/50 transition"
            >
              <div className="aspect-square bg-card">
                <img
                  src={design.imageUrl}
                  alt={design.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-2 bg-background">
                <div className="text-xs font-medium text-espresso line-clamp-1">{design.name}</div>
                {design.seasonal && (
                  <div className="text-[10px] text-orange-600 font-medium mt-0.5">Seasonal</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
