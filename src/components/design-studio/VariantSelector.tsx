"use client";

import {
  type PrintfulProduct,
  type ProductVariant,
  getUniqueColors,
  getUniqueSizes,
  resolveVariant,
} from "@/lib/printful/catalog";

interface VariantSelectorProps {
  product: PrintfulProduct;
  selectedVariant: ProductVariant | null;
  onSelectVariant: (variant: ProductVariant) => void;
}

/**
 * Variant picker for the real Printful size × color matrix.
 * Picking a size keeps the current color (and vice versa); the concrete
 * Printful variant_id is resolved from the combination.
 */
export function VariantSelector({ product, selectedVariant, onSelectVariant }: VariantSelectorProps) {
  const colors = getUniqueColors(product);
  const sizes = getUniqueSizes(product);

  const showColors = colors.length > 1;
  const showSizes = sizes.length > 1;

  const currentSize = selectedVariant?.size ?? null;
  const currentColor = selectedVariant?.colorName ?? null;

  const pickSize = (size: string) => {
    const v = resolveVariant(product, size, currentColor);
    if (v) onSelectVariant(v);
  };

  const pickColor = (colorName: string) => {
    const v = resolveVariant(product, currentSize, colorName);
    if (v) onSelectVariant(v);
  };

  if (!showColors && !showSizes) return null;

  return (
    <div className="space-y-4">
      {/* Color Selection */}
      {showColors && (
        <div>
          <label className="block text-xs font-medium text-mocha mb-2 uppercase tracking-wider">
            Color{currentColor ? ` — ${currentColor}` : ""}
          </label>
          <div className="flex gap-3 flex-wrap">
            {colors.map((c) => {
              const isSelected = currentColor === c.colorName;
              return (
                <button
                  key={c.colorName}
                  onClick={() => pickColor(c.colorName)}
                  className="group flex flex-col items-center gap-1"
                  title={c.colorName}
                >
                  <div
                    className={`w-10 h-10 rounded-full border-2 transition ${
                      isSelected
                        ? "border-forest scale-110 shadow-md"
                        : "border-latte/30 group-hover:border-latte"
                    }`}
                    style={{
                      backgroundColor: c.color,
                      boxShadow: isSelected ? "0 0 0 2px var(--accent-forest)" : undefined,
                    }}
                  />
                  <span className="text-xs text-mocha">{c.colorName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size / Model Selection */}
      {showSizes && (
        <div>
          <label className="block text-xs font-medium text-mocha mb-2 uppercase tracking-wider">
            {product.id === "phone-case" ? "Model" : "Size"}
          </label>
          <div className="flex gap-2 flex-wrap">
            {sizes.map((size) => {
              const isSelected = currentSize === size;
              return (
                <button
                  key={size}
                  onClick={() => pickSize(size)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isSelected
                      ? "bg-forest text-sand"
                      : "bg-card text-espresso border border-latte/30 hover:border-forest/50"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
