"use client";

import React, { useState, useCallback, useRef } from "react";
import type { Product } from "@/types";
import {
  Sparkles,
  Package,
  Palette,
  Wand2,
  ShoppingCart,
  Info,
} from "lucide-react";
import {
  DesignCanvas,
  type DesignCanvasHandle,
  type DesignLayer,
} from "@/components/design-studio/DesignCanvas";
import { ProductCatalog } from "@/components/design-studio/ProductCatalog";
import { VariantSelector } from "@/components/design-studio/VariantSelector";
import { PresetDesigns } from "@/components/design-studio/PresetDesigns";
import { useCartStore } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import {
  PRINTFUL_CATALOG,
  type PrintfulProduct,
  type ProductVariant,
  type DefaultDesign,
  KYND_LOGO,
  calculateRetailPrice,
} from "@/lib/printful/catalog";

type StudioTab = "products" | "presets" | "generate";

const DEFAULT_PRODUCT = PRINTFUL_CATALOG[0]; // Unisex Tee

export default function DesignStudioPage() {
  const canvasRef = useRef<DesignCanvasHandle>(null);

  const [activeTab, setActiveTab] = useState<StudioTab>("products");
  const [selectedProduct, setSelectedProduct] = useState<PrintfulProduct>(DEFAULT_PRODUCT);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [view, setView] = useState<"front" | "back">("front");

  // AI Generation state
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<{
    url: string;
    prompt: string;
  } | null>(null);
  const [credits, setCredits] = useState({ free: 10, paid: 0 });

  // Canvas state
  const [currentLayers, setCurrentLayers] = useState<DesignLayer[]>([]);

  const addItem = useCartStore((s) => s.addItem);
  const retailPrice = calculateRetailPrice(selectedProduct, selectedVariant || undefined);

  const handleSelectProduct = useCallback(
    (product: PrintfulProduct) => {
      setSelectedProduct(product);
      setSelectedVariant(null);
      setView("front");
      // Clear the canvas on product change
      canvasRef.current?.clearLayers();
    },
    []
  );

  const handleDesignChange = useCallback((layers: DesignLayer[]) => {
    setCurrentLayers(layers);
  }, []);

  const handleSave = useCallback(
    (layers: DesignLayer[], productId: string) => {
      // TODO: Wire to Supabase saved_designs
      console.log("Design saved:", { layers, productId });
      alert("Design saved to your account!");
    },
    []
  );

  // Imperative add-to-canvas
  const addImageToCanvas = useCallback(
    (
      design:
        | DefaultDesign
        | { id: string; name: string; url: string; type: "sticker" }
    ) => {
      const imageUrl =
        "imageUrl" in design && design.imageUrl ? design.imageUrl : (design as any).url;
      const type = (design as any).type === "sticker" ? "sticker" : "generated";
      if (imageUrl) {
        canvasRef.current?.addLayerFromUrl(imageUrl, type as any, design.name);
        setActiveTab("products");
      }
    },
    []
  );

  const addKyndaLogo = useCallback(() => {
    canvasRef.current?.addLayerFromUrl(KYND_LOGO.url, "logo", KYND_LOGO.name);
  }, []);

  const generateDesign = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/designs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style_preset: style,
          product_type: selectedProduct.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Generation failed");
        return;
      }

      setGeneratedPreview({ url: data.image_url, prompt: data.prompt });
      if (data.credits_remaining) setCredits(data.credits_remaining);

      // Auto-add to canvas
      canvasRef.current?.addLayerFromUrl(
        data.image_url,
        "generated",
        "AI Design"
      );
      setActiveTab("products");
    } catch {
      alert("Something went wrong generating the design.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToCart = () => {
    if (currentLayers.length === 0) {
      alert("Add something to your design first — upload art, pick a preset, or generate with AI!");
      return;
    }

    const product: Product = {
      id: `custom-${selectedProduct.id}-${Date.now()}`,
      slug: `custom-${selectedProduct.id}`,
      name: `Custom ${selectedProduct.name}`,
      description: `Custom designed ${selectedProduct.name}${
        selectedVariant?.size ? ` - ${selectedVariant.size}` : ""
      }${selectedVariant?.colorName ? ` (${selectedVariant.colorName})` : ""}`,
      category:
        selectedProduct.category === "apparel"
          ? "merch-apparel"
          : selectedProduct.category === "drinkware"
            ? "merch-drinkware"
            : selectedProduct.category === "wall-art"
              ? "merch-wall-art"
              : "merch-accessories",
      price_cents: retailPrice,
      images: [selectedProduct.imageUrl],
      source: "design_studio",
      track_inventory: false,
      is_active: true,
      is_featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      design_data: {
        product_id: selectedProduct.id,
        printful_product_id: selectedProduct.printfulId,
        printful_variant_id: selectedVariant?.id,
        variant_size: selectedVariant?.size,
        variant_color: selectedVariant?.colorName,
        layers: currentLayers,
        view,
      },
    } as Product;

    addItem(product, 1);
    window.location.href = "/cart";
  };

  const hasDesign = currentLayers.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-24 text-espresso">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-forest/10 px-4 py-1.5 rounded-full text-forest text-sm mb-4">
          <Sparkles size={14} />
          AI-Powered Custom Merch
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight">
          Design Studio
        </h1>
        <p className="text-lg text-mocha mt-3 max-w-2xl mx-auto">
          Pick a product, add your design, and order custom merch shipped to your door.
        </p>
      </div>

      {/* Main Layout */}
      <div className="grid lg:grid-cols-[1fr_620px] gap-8 lg:gap-12">
        {/* Left Panel: Tabs + Content */}
        <div className="order-2 lg:order-1">
          {/* Product Info Bar */}
          <div className="bg-card rounded-xl p-4 mb-6 border border-latte/20">
            <div className="flex items-start gap-3">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{selectedProduct.name}</h2>
                <p className="text-sm text-mocha line-clamp-1">
                  {selectedProduct.description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">
                  {formatPrice(retailPrice)}
                </div>
                <div className="text-xs text-mocha">Made to order</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-card/50 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "products"
                  ? "bg-background text-espresso shadow-sm"
                  : "text-mocha hover:text-espresso"
              }`}
            >
              <Package size={16} /> Product
            </button>
            <button
              onClick={() => setActiveTab("presets")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "presets"
                  ? "bg-background text-espresso shadow-sm"
                  : "text-mocha hover:text-espresso"
              }`}
            >
              <Palette size={16} /> Designs
            </button>
            <button
              onClick={() => setActiveTab("generate")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "generate"
                  ? "bg-background text-espresso shadow-sm"
                  : "text-mocha hover:text-espresso"
              }`}
            >
              <Wand2 size={16} /> AI Create
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === "products" && (
              <div className="space-y-6">
                <ProductCatalog
                  selectedProduct={selectedProduct}
                  onSelectProduct={handleSelectProduct}
                />
                <div className="border-t border-latte/20 pt-6">
                  <VariantSelector
                    variants={selectedProduct.variants}
                    selectedVariant={selectedVariant}
                    onSelectVariant={setSelectedVariant}
                  />
                </div>
              </div>
            )}

            {activeTab === "presets" && (
              <PresetDesigns
                onSelectDesign={addImageToCanvas}
                selectedProductId={selectedProduct.id}
              />
            )}

            {activeTab === "generate" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-mocha mb-2 uppercase tracking-wider">
                    Describe Your Vision
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A minimalist coffee cup with steam forming a heart shape..."
                    className="w-full min-h-[120px] px-4 py-3 border border-latte/30 rounded-xl placeholder:text-mocha/50 text-espresso bg-background resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-mocha mb-2 uppercase tracking-wider">
                    Style Inspiration
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: "coffee-art", label: "☕ Coffee Art" },
                      { id: "nature-texas", label: "🌿 Hill Country" },
                      { id: "minimal", label: "⬜ Minimal" },
                      { id: "vintage", label: "📻 Vintage" },
                      { id: "abstract", label: "🎨 Abstract" },
                      { id: "bold-typography", label: "✏️ Typography" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStyle(style === s.id ? null : s.id)}
                        className={`px-4 py-2 rounded-full text-sm border transition ${
                          style === s.id
                            ? "bg-forest text-sand border-forest"
                            : "border-latte/30 hover:border-forest/50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={generateDesign}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full py-4 rounded-xl bg-surface disabled:opacity-50 text-sand text-lg font-medium flex items-center justify-center gap-2 transition hover:bg-surface-800"
                >
                  {isGenerating ? (
                    <>
                      <Wand2 size={20} className="animate-spin" />
                      Creating your design...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate with AI
                    </>
                  )}
                </button>

                <div className="text-xs text-center text-mocha">
                  {credits.free} free generations left this month
                </div>

                {generatedPreview && (
                  <div className="rounded-xl overflow-hidden border border-latte/20">
                    <img
                      src={generatedPreview.url}
                      alt="Generated design"
                      className="w-full aspect-square object-cover"
                    />
                    <div className="p-3 bg-card text-center">
                      <button
                        onClick={() => setActiveTab("products")}
                        className="text-sm text-forest font-medium"
                      >
                        ✓ Added to canvas — go customize it!
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Canvas + Cart */}
        <div className="order-1 lg:order-2">
          <div className="sticky top-24 space-y-4">
            <DesignCanvas
              ref={canvasRef}
              product={selectedProduct}
              view={view}
              onViewChange={setView}
              onSave={handleSave}
              onDesignChange={handleDesignChange}
              initialDesignUrl={null}
            />

            {/* Cart / Order Section */}
            <div className="bg-card rounded-xl p-4 border border-latte/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-mocha">Total</div>
                  <div className="text-3xl font-bold tabular-nums">
                    {formatPrice(retailPrice)}
                  </div>
                </div>
                <div className="text-right text-xs text-mocha space-y-0.5">
                  <div>Made to order</div>
                  <div>Ships in 5–8 business days</div>
                  {selectedVariant?.size && <div>Size: {selectedVariant.size}</div>}
                  {selectedVariant?.colorName && (
                    <div>Color: {selectedVariant.colorName}</div>
                  )}
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!hasDesign}
                className="w-full py-4 rounded-xl bg-forest text-white font-medium text-lg flex items-center justify-center gap-2 transition hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={20} />
                {hasDesign ? "Add to Cart" : "Add Something to Your Design First"}
              </button>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 text-xs text-mocha">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p>
                All custom merch is printed and shipped on demand. Designs are moderated for
                appropriate content. Returns accepted for defects only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
