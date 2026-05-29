"use client";

import { type ProductVariant } from "@/lib/printful/catalog";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelectVariant: (variant: ProductVariant) => void;
}

export function VariantSelector({ variants, selectedVariant, onSelectVariant }: VariantSelectorProps) {
  // Separate sizes and colors
  const sizes = variants.filter((v) => v.size && !v.color);
  const colors = variants.filter((v) => v.color && !v.size);
  const singleVariants = variants.filter((v) => !v.size && !v.color);

  return (
    <div className="space-y-4">
      {/* Size Selection */}
      {sizes.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-mocha mb-2 uppercase tracking-wider">
            Size
          </label>
          <div className="flex gap-2 flex-wrap">
            {sizes.map((variant) => {
              const isSelected = selectedVariant?.size === variant.size;
              return (
                <button
                  key={variant.id.toString() + variant.size}
                  onClick={() => onSelectVariant(variant)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isSelected
                      ? "bg-forest text-sand"
                      : "bg-card text-espresso border border-latte/30 hover:border-forest/50"
                  }`}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Selection */}
      {colors.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-mocha mb-2 uppercase tracking-wider">
            Color
          </label>
          <div className="flex gap-3 flex-wrap">
            {colors.map((variant) => {
              const isSelected = selectedVariant?.color === variant.color;
              return (
                <button
                  key={variant.id.toString() + variant.color}
                  onClick={() => onSelectVariant(variant)}
                  className="group flex flex-col items-center gap-1"
                  title={variant.colorName}
                >
                  <div
                    className={`w-10 h-10 rounded-full border-2 transition ${
                      isSelected
                        ? "border-forest scale-110 shadow-md"
                        : "border-latte/30 group-hover:border-latte"
                    }`}
                    style={{
                      backgroundColor: variant.color,
                      boxShadow: isSelected ? "0 0 0 2px var(--accent-forest)" : undefined,
                    }}
                  />
                  <span className="text-xs text-mocha">{variant.colorName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Single Variants (phone models, etc.) */}
      {singleVariants.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-mocha mb-2 uppercase tracking-wider">
            Model
          </label>
          <div className="flex gap-2 flex-wrap">
            {singleVariants.map((variant) => {
              const isSelected = selectedVariant?.name === variant.name;
              return (
                <button
                  key={variant.id.toString()}
                  onClick={() => onSelectVariant(variant)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isSelected
                      ? "bg-forest text-sand"
                      : "bg-card text-espresso border border-latte/30 hover:border-forest/50"
                  }`}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
