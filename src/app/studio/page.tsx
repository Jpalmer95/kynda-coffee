"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Wand2,
  ShoppingBag,
  RotateCcw,
  Download,
  Loader2,
  Coffee,
  Shirt,
  Wine,
  Package,
  Star,
  TrendingUp,
  Palette,
} from "lucide-react";
import { useCartStore } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";

// ---- Types ----

type ProductTarget = "mug" | "tshirt" | "glass" | "tote";

interface GeneratedDesign {
  image_url: string;
  prompt: string;
}

// ---- Style Presets ----

const STYLE_PRESETS = [
  {
    id: "coffee-art",
    name: "Coffee Art",
    description: "Latte art, warm tones, artisan vibes",
    prompt_suffix: "latte art, coffee beans, warm tones, artisan style",
    icon: "☕",
  },
  {
    id: "nature-texas",
    name: "Hill Country",
    description: "Texas wildflowers, live oaks, rustic",
    prompt_suffix: "Texas Hill Country, wildflowers, live oaks, rustic aesthetic",
    icon: "🌿",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean lines, modern, simple",
    prompt_suffix: "clean lines, minimal design, modern typography, simple elegant",
    icon: "◻️",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Retro poster, distressed texture",
    prompt_suffix: "retro vintage poster style, distressed texture, classic typography",
    icon: "📻",
  },
  {
    id: "abstract",
    name: "Abstract",
    description: "Artistic patterns, coffee-inspired",
    prompt_suffix: "abstract art, artistic patterns, coffee-inspired colors",
    icon: "🎨",
  },
  {
    id: "bold-typography",
    name: "Typography",
    description: "Bold lettering, coffee quotes",
    prompt_suffix: "bold typography, coffee quotes, modern lettering, graphic design",
    icon: "✏️",
  },
];

// ---- Product Targets ----

const PRODUCT_TARGETS: {
  id: ProductTarget;
  name: string;
  icon: typeof Coffee;
  price: number;
  mockupClass: string;
}[] = [
  { id: "mug", name: "Mug", icon: Coffee, price: 2400, mockupClass: "rounded-full" },
  { id: "tshirt", name: "T-Shirt", icon: Shirt, price: 3200, mockupClass: "rounded-lg" },
  { id: "glass", name: "Glass", icon: Wine, price: 2200, mockupClass: "rounded-b-full" },
  { id: "tote", name: "Tote", icon: Package, price: 1800, mockupClass: "rounded-lg" },
];

// ---- Trending Prompts ----

const TRENDING_PROMPTS = [
  "A minimalist coffee cup with steam forming a heart shape",
  "Texas hill country sunset with a coffee cup silhouette",
  "Abstract coffee swirl in warm brown and rust tones",
  "Vintage coffee shop sign with 'Kynda' in retro lettering",
  "Geometric coffee bean pattern in earth tones",
  "Watercolor latte art with floral accents",
  "Bold 'But First, Coffee' in modern typography",
  "Coffee plant botanical illustration",
];

// ---- Main Component ----

export default function DesignStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductTarget>("mug");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesign, setGeneratedDesign] = useState<GeneratedDesign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedDesign[]>([]);
  const addItem = useCartStore((s) => s.addItem);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedDesign(null);

    try {
      const res = await fetch("/api/designs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style_preset: selectedStyle
            ? STYLE_PRESETS.find((s) => s.id === selectedStyle)?.prompt_suffix
            : undefined,
          product_type: selectedProduct,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed");
      }

      const design: GeneratedDesign = {
        image_url: data.image_url,
        prompt: data.prompt,
      };

      setGeneratedDesign(design);
      setHistory((prev) => [design, ...prev].slice(0, 8));

      if (data.demo_mode) {
        setError("Demo mode — add your FAL key for real AI generation");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleAddToCart() {
    if (!generatedDesign) return;

    const target = PRODUCT_TARGETS.find((t) => t.id === selectedProduct)!;

    // Create a pseudo-product for the cart
    const customProduct = {
      id: `custom-${Date.now()}`,
      slug: `custom-${selectedProduct}-${Date.now()}`,
      name: `Custom Kynda ${target.name}`,
      description: `Custom designed: "${prompt.slice(0, 60)}..."`,
      category: `merch-${selectedProduct === "tshirt" ? "apparel" : selectedProduct === "mug" ? "mugs" : "accessories"}` as any,
      price_cents: target.price,
      images: [generatedDesign.image_url],
      is_active: true,
      is_featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addItem(customProduct, 1, {
      size: selectedProduct === "tshirt" ? "M" : undefined,
    });
  }

  function handleUsePrompt(preset: string) {
    setPrompt(preset);
    inputRef.current?.focus();
  }

  return (
    <section className="section-padding">
      <div className="container-max">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rust/10 px-4 py-1.5 text-sm font-medium text-rust">
            <Sparkles className="h-4 w-4" />
            AI-Powered
          </div>
          <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
            Design Studio
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-mocha">
            Describe your vision. Our AI brings it to life. Preview it on real
            products and add to cart.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left: Design Canvas */}
          <div className="space-y-6">
            {/* Prompt Input */}
            <div className="rounded-2xl border border-latte/20 bg-white p-6">
              <label className="mb-2 block text-sm font-medium text-espresso">
                Describe your design
              </label>
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A minimalist coffee cup with steam forming a heart shape..."
                rows={3}
                className="input-field resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />

              {/* Style Presets */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-mocha/60">
                  Style
                </label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style.id}
                      onClick={() =>
                        setSelectedStyle(
                          selectedStyle === style.id ? null : style.id
                        )
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedStyle === style.id
                          ? "bg-espresso text-cream"
                          : "bg-latte/20 text-mocha hover:bg-latte/40"
                      }`}
                    >
                      {style.icon} {style.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="btn-primary mt-4 w-full py-4 text-base"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    Generate Design
                  </>
                )}
              </button>

              {error && (
                <p className={`mt-2 text-center text-sm ${error.includes("Demo mode") ? "text-mocha" : "text-red-500"}`}>{error}</p>
              )}
            </div>

            {/* Generated Design Preview */}
            <div className="rounded-2xl border border-latte/20 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-semibold text-espresso">
                  Preview
                </h2>
                {generatedDesign && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerate}
                      className="rounded-full p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
                      title="Regenerate"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <a
                      href={generatedDesign.image_url}
                      download="kynda-design.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-2 text-mocha transition-colors hover:bg-latte/20 hover:text-espresso"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Preview Area */}
              <div className="mt-4">
                {isGenerating ? (
                  <div className="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-latte/20 to-cream">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-rust" />
                      <p className="mt-3 text-sm text-mocha">
                        Creating your design...
                      </p>
                      <p className="mt-1 text-xs text-mocha/60">
                        This usually takes 5-15 seconds
                      </p>
                    </div>
                  </div>
                ) : generatedDesign ? (
                  <div className="space-y-4">
                    {/* Raw design */}
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
                      <img
                        src={generatedDesign.image_url}
                        alt="Generated design"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    {/* Product Mockup */}
                    <div className="rounded-xl bg-cream p-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-mocha/60">
                        Preview on {PRODUCT_TARGETS.find((t) => t.id === selectedProduct)?.name}
                      </p>
                      <div className="flex items-center justify-center">
                        <div
                          className={`relative h-48 w-48 overflow-hidden ${
                            PRODUCT_TARGETS.find((t) => t.id === selectedProduct)?.mockupClass
                          } bg-gradient-to-br from-stone-200 to-stone-300 shadow-lg`}
                        >
                          <img
                            src={generatedDesign.image_url}
                            alt="Design on product"
                            className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] rounded object-cover opacity-90"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Add to Cart */}
                    <button
                      onClick={handleAddToCart}
                      className="btn-accent w-full py-4 text-base"
                    >
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      Add Custom {PRODUCT_TARGETS.find((t) => t.id === selectedProduct)?.name} to Cart —{" "}
                      {formatPrice(
                        PRODUCT_TARGETS.find((t) => t.id === selectedProduct)?.price ?? 0
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-latte/10 to-cream">
                    <div className="text-center">
                      <Palette className="mx-auto h-12 w-12 text-latte/40" />
                      <p className="mt-3 text-sm text-mocha/60">
                        Your design will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="rounded-2xl border border-latte/20 bg-white p-6">
                <h2 className="font-heading text-lg font-semibold text-espresso">
                  Recent Designs
                </h2>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {history.map((design, i) => (
                    <button
                      key={i}
                      onClick={() => setGeneratedDesign(design)}
                      className="aspect-square overflow-hidden rounded-lg border border-latte/20 transition-all hover:border-espresso hover:shadow-md"
                    >
                      <img
                        src={design.image_url}
                        alt={`Design ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Options Sidebar */}
          <div className="space-y-6">
            {/* Product Selection */}
            <div className="rounded-2xl border border-latte/20 bg-white p-6">
              <h2 className="font-heading text-lg font-semibold text-espresso">
                Product
              </h2>
              <p className="mt-1 text-xs text-mocha/60">
                Choose where your design goes
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {PRODUCT_TARGETS.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => setSelectedProduct(target.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      selectedProduct === target.id
                        ? "border-espresso bg-espresso/5"
                        : "border-latte/20 hover:border-latte"
                    }`}
                  >
                    <target.icon
                      className={`h-6 w-6 ${
                        selectedProduct === target.id
                          ? "text-espresso"
                          : "text-mocha"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        selectedProduct === target.id
                          ? "text-espresso"
                          : "text-mocha"
                      }`}
                    >
                      {target.name}
                    </span>
                    <span className="text-xs text-mocha/60">
                      {formatPrice(target.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Prompts */}
            <div className="rounded-2xl border border-latte/20 bg-white p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rust" />
                <h2 className="font-heading text-lg font-semibold text-espresso">
                  Trending Ideas
                </h2>
              </div>
              <p className="mt-1 text-xs text-mocha/60">
                Click to use as starting point
              </p>
              <div className="mt-4 space-y-2">
                {TRENDING_PROMPTS.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleUsePrompt(suggestion)}
                    className="w-full rounded-lg bg-cream px-3 py-2.5 text-left text-sm text-mocha transition-all hover:bg-latte/30 hover:text-espresso"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Curated Collections */}
            <div className="rounded-2xl border border-latte/20 bg-white p-6">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-rust" />
                <h2 className="font-heading text-lg font-semibold text-espresso">
                  Collections
                </h2>
              </div>
              <p className="mt-1 text-xs text-mocha/60">
                Curated design themes
              </p>
              <div className="mt-4 space-y-2">
                {["Coffee Vibes", "Hill Country", "Trending Now", "Seasonal"].map(
                  (collection) => (
                    <button
                      key={collection}
                      className="w-full rounded-lg border border-latte/20 bg-white px-4 py-3 text-left text-sm font-medium text-mocha transition-all hover:border-espresso hover:text-espresso"
                    >
                      {collection}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
