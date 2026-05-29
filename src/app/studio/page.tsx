"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Product } from "@/types";
import {
  Sparkles,
  Package,
  Palette,
  Wand2,
  ShoppingCart,
  Info,
  Save,
  FolderOpen,
  Trash2,
  Check,
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
  PRODUCT_MARKUP,
  type PrintfulProduct,
  type ProductVariant,
  type DefaultDesign,
  KYND_LOGO,
  calculateRetailPrice,
} from "@/lib/printful/catalog";

type StudioTab = "products" | "presets" | "generate" | "saved";

interface SavedDesign {
  id: string;
  name: string;
  product_id: string | null;
  variant_id: number | null;
  product_type: string | null;
  layers: DesignLayer[];
  view: string;
  thumbnail_url: string | null;
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PRODUCT = PRINTFUL_CATALOG[0]; // Unisex Tee
const AUTOSAVE_DELAY_MS = 30_000; // 30 seconds of inactivity

export default function DesignStudioPage() {
  const canvasRef = useRef<DesignCanvasHandle>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Design persistence state
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "unsaved" | "saving" | "error">("idle");
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);

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
    // Mark as unsaved when layers change (and we have layers)
    if (layers.length > 0) {
      setSaveStatus("unsaved");
    }
  }, []);

  // ── Autosave: fires 30s after the last canvas change ──
  useEffect(() => {
    if (saveStatus !== "unsaved" || currentLayers.length === 0) return;

    // Clear any existing timer
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      handleSaveDesign(true);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLayers, saveStatus]);

  // ── Save design to Supabase ──
  async function handleSaveDesign(isAutosave = false) {
    if (currentLayers.length === 0) return;
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      // Generate thumbnail from canvas
      const thumbnail = canvasRef.current?.exportThumbnail() || null;

      const payload = {
        id: currentDesignId || undefined,
        name: currentDesignId ? undefined : `${selectedProduct.name} Design`,
        product_id: selectedProduct.id,
        variant_id: selectedVariant?.id || null,
        product_type: selectedProduct.id,
        layers: currentLayers,
        view,
        thumbnail_url: thumbnail,
        prompt: prompt || null,
      };

      const res = await fetch("/api/designs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Likely not authenticated — silently skip autosave errors
        if (!isAutosave) console.error("Save failed:", data.error);
        setSaveStatus("error");
        return;
      }

      // Track the design ID so future saves update instead of creating duplicates
      if (data.design?.id) {
        setCurrentDesignId(data.design.id);
      }
      setSaveStatus("saved");

      // Refresh saved designs list if we're on the saved tab
      if (activeTab === "saved") {
        fetchSavedDesigns();
      }
    } catch {
      setSaveStatus("error");
      if (!isAutosave) alert("Failed to save design. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Load saved designs from Supabase ──
  async function fetchSavedDesigns() {
    setIsLoadingDesigns(true);
    try {
      const res = await fetch("/api/designs/save");
      if (!res.ok) {
        setSavedDesigns([]);
        return;
      }
      const data = await res.json();
      setSavedDesigns(data.designs ?? []);
    } catch {
      setSavedDesigns([]);
    } finally {
      setIsLoadingDesigns(false);
    }
  }

  // ── Load a saved design back onto the canvas ──
  function handleLoadDesign(design: SavedDesign) {
    // Restore the product if different
    const product = PRINTFUL_CATALOG.find(
      (p) => p.id === design.product_id || p.id === design.product_type
    );
    if (product) {
      setSelectedProduct(product);
      // Restore variant if available
      if (design.variant_id) {
        const variant = product.variants.find((v) => v.id === design.variant_id);
        if (variant) setSelectedVariant(variant);
      }
    }

    // Restore view
    if (design.view === "back" || design.view === "front") {
      setView(design.view);
    }

    // Load layers onto canvas
    canvasRef.current?.loadLayers(design.layers);
    setCurrentLayers(design.layers);
    setCurrentDesignId(design.id);
    setSaveStatus("saved");
    setActiveTab("products");
  }

  // ── Delete a saved design ──
  async function handleDeleteDesign(designId: string) {
    if (!confirm("Delete this design?")) return;

    try {
      await fetch(`/api/designs/${designId}`, { method: "DELETE" });
      setSavedDesigns((prev) => prev.filter((d) => d.id !== designId));
      if (currentDesignId === designId) {
        setCurrentDesignId(null);
        setSaveStatus("idle");
      }
    } catch {
      alert("Failed to delete design.");
    }
  }

  // ── Tab switch: load designs when switching to saved tab ──
  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedDesigns();
    }
  }, [activeTab]);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

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
      // Content moderation gate — check prompt before generation
      const modRes = await fetch("/api/designs/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt.trim() }),
      });
      const modData = await modRes.json();

      if (!modData.safe) {
        alert(modData.message || "Your prompt contains inappropriate content. Please revise.");
        return;
      }

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

  const handleAddToCart = async () => {
    if (currentLayers.length === 0) {
      alert("Add something to your design first — upload art, pick a preset, or generate with AI!");
      return;
    }

    // Profitability guardrail — verify margin before proceeding
    const markup = PRODUCT_MARKUP[selectedProduct.category];
    const baseCost = selectedProduct.basePriceCents + (selectedVariant?.additionalPriceCents || 0);
    const profitCents = retailPrice - baseCost - markup.shippingBufferCents;

    if (profitCents < 100) {
      // Less than $1 profit — block the order
      alert("This product configuration doesn't meet our pricing requirements. Please select a different variant or contact us.");
      return;
    }

    // Image moderation gate — check canvas thumbnail before adding to cart
    if (isSaving) return; // Don't double-submit

    try {
      const thumbnail = canvasRef.current?.exportThumbnail();
      if (thumbnail) {
        const modRes = await fetch("/api/designs/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: thumbnail }),
        });
        const modData = await modRes.json();

        if (!modData.safe) {
          alert(modData.message || "This design contains inappropriate content and cannot be ordered.");
          return;
        }
      }
    } catch {
      // Fail open — Printful also moderates at production time
      console.warn("Image moderation check failed, proceeding with order");
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
    window.location.href = "/shop/merch/checkout";
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
              onClick={() => setActiveTab("saved")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "saved"
                  ? "bg-background text-espresso shadow-sm"
                  : "text-mocha hover:text-espresso"
              }`}
            >
              <FolderOpen size={16} /> My Designs
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

            {activeTab === "saved" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-xl">My Saved Designs</h3>
                  <button
                    onClick={fetchSavedDesigns}
                    className="text-sm text-forest hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {isLoadingDesigns ? (
                  <div className="text-center py-12 text-mocha">
                    Loading your designs...
                  </div>
                ) : savedDesigns.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen size={40} className="mx-auto text-mocha/40 mb-3" />
                    <p className="text-mocha">No saved designs yet.</p>
                    <p className="text-sm text-mocha/70 mt-1">
                      Create a design and hit Save to see it here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {savedDesigns.map((design) => (
                      <div
                        key={design.id}
                        className="group relative bg-card rounded-xl border border-latte/20 overflow-hidden hover:shadow-hover transition cursor-pointer"
                        onClick={() => handleLoadDesign(design)}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square bg-muted">
                          {design.thumbnail_url ? (
                            <img
                              src={design.thumbnail_url}
                              alt={design.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-mocha/40">
                              <Package size={32} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-2.5">
                          <div className="text-sm font-medium truncate">
                            {design.name}
                          </div>
                          <div className="text-xs text-mocha truncate">
                            {PRINTFUL_CATALOG.find(
                              (p) => p.id === design.product_id || p.id === design.product_type
                            )?.name || design.product_id || "Custom"}{" "}
                            · {new Date(design.updated_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Delete button (visible on hover) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDesign(design.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete design"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
              onSave={() => handleSaveDesign(false)}
              onDesignChange={handleDesignChange}
              initialDesignUrl={null}
            />

            {/* Save Button + Status */}
            <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-latte/20">
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check size={14} /> Saved
                  </span>
                )}
                {saveStatus === "unsaved" && (
                  <span className="text-amber-600">Unsaved changes</span>
                )}
                {saveStatus === "saving" && (
                  <span className="text-mocha">Saving...</span>
                )}
                {saveStatus === "error" && (
                  <span className="text-red-500">Save failed</span>
                )}
                {saveStatus === "idle" && (
                  <span className="text-mocha">No design yet</span>
                )}
              </div>
              <button
                onClick={() => handleSaveDesign(false)}
                disabled={!hasDesign || isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-forest/10 text-forest hover:bg-forest/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {isSaving ? "Saving..." : "Save Design"}
              </button>
            </div>

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
