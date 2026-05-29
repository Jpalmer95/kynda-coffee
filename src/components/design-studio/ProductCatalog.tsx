"use client";

import { useState } from "react";
import {
  PRINTFUL_CATALOG,
  type PrintfulProduct,
  type ProductCategory,
  calculateRetailPrice,
} from "@/lib/printful/catalog";
import { formatPrice } from "@/lib/utils";

interface ProductCatalogProps {
  selectedProduct: PrintfulProduct | null;
  onSelectProduct: (product: PrintfulProduct) => void;
}

export function ProductCatalog({ selectedProduct, onSelectProduct }: ProductCatalogProps) {
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");

  const categories: { id: ProductCategory | "all"; label: string }[] = [
    { id: "all", label: "All Products" },
    { id: "apparel", label: "Apparel" },
    { id: "drinkware", label: "Drinkware" },
    { id: "accessories", label: "Accessories" },
    { id: "wall-art", label: "Wall Art" },
    { id: "home-living", label: "Home & Living" },
  ];

  const filteredProducts =
    categoryFilter === "all"
      ? PRINTFUL_CATALOG
      : PRINTFUL_CATALOG.filter((p) => p.category === categoryFilter);

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              categoryFilter === cat.id
                ? "bg-surface text-sand"
                : "bg-card text-espresso border border-latte/30 hover:border-forest/50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const isSelected = selectedProduct?.id === product.id;
          const basePrice = calculateRetailPrice(product);

          return (
            <button
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className={`group relative rounded-xl overflow-hidden border-2 transition ${
                isSelected
                  ? "border-forest shadow-md"
                  : "border-latte/20 hover:border-latte/50"
              }`}
            >
              {/* Product Image */}
              <div className="aspect-square bg-card relative overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-forest/10 flex items-center justify-center">
                    <div className="bg-forest text-sand px-3 py-1 rounded-full text-xs font-medium">
                      Selected
                    </div>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3 bg-background">
                <h3 className="font-medium text-sm text-espresso line-clamp-1">{product.name}</h3>
                <p className="text-xs text-mocha mt-1">From {formatPrice(basePrice)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
