"use client";

import React, { useState } from 'react';
import type { Product } from '@/types';
import { Sparkles, Save, CreditCard } from 'lucide-react';
import { DesignCanvas, DesignLayer } from '@/components/design-studio/DesignCanvas';
import { useCartStore } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';

const PRODUCT_MARKUP: Record<string, { baseCents: number; multiplier: number }> = {
  mug:    { baseCents: 850, multiplier: 2.8 },
  tshirt: { baseCents: 1280, multiplier: 2.5 },
  glass:  { baseCents: 780, multiplier: 2.8 },
  tote:   { baseCents: 650, multiplier: 2.8 },
};

function getRetailPrice(p: string): number {
  const r = PRODUCT_MARKUP[p];
  return r ? Math.round(r.baseCents * r.multiplier) : 2400;
}

export default function DesignStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<'mug' | 'tshirt' | 'glass' | 'tote'>('mug');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesign, setGeneratedDesign] = useState<{ url: string; prompt: string } | null>(null);
  const [currentLayers, setCurrentLayers] = useState<DesignLayer[]>([]);
  const [credits, setCredits] = useState({ free: 10, paid: 0 });
  
  const addItem = useCartStore(s => s.addItem);

  const generateDesign = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/designs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style_preset: style,
          product_type: selectedProduct,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Generation failed");
        return;
      }

      setGeneratedDesign({ url: data.image_url, prompt: data.prompt });
      if (data.credits_remaining) setCredits(data.credits_remaining);
    } catch {
      alert("Something went wrong generating the design.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToCart = () => {
    if (!generatedDesign) return;

    const product: Product = {
      id: `custom-${Date.now()}`,
      slug: `custom-${selectedProduct}`,
      name: `Custom ${selectedProduct}`,
      description: generatedDesign.prompt,
      category:
        selectedProduct === "tshirt"
          ? "merch-apparel"
          : selectedProduct === "mug"
            ? "merch-mugs"
            : selectedProduct === "glass"
              ? "merch-glassware"
              : "merch-accessories",
      price_cents: getRetailPrice(selectedProduct),
      images: [generatedDesign.url],
      source: "online",
      track_inventory: false,
      is_active: true,
      is_featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Product;

    addItem(product, 1);

    window.location.href = '/cart';
  };

  const handleSaveDesign = (layers: DesignLayer[]) => {
    // In the next phase this will hit Supabase saved_designs
    alert("Design saved! (Will be automatically saved to your account soon)");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-10 pb-20 text-espresso">
      <div className="text-center mb-14">
        <div className="inline bg-[#f0ebff] px-4 py-1 text-sm rounded-full text-[#6b3fcf]">✨ AI-Powered</div>
        <h1 className="font-heading text-6xl mt-3 tracking-tighter">Design Studio</h1>
        <p className="text-xl text-mocha mt-3">Create custom merch that is truly yours.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
        {/* Prompt + Controls */}
        <div>
          <div>
            <div className="uppercase text-xs font-medium tracking-[1.5px] text-mocha mb-2">DESCRIBE YOUR VISION</div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A minimalist coffee cup with steam forming a heart shape..."
              className="w-full min-h-[110px] text-2xl px-6 py-5 border border-latte/30 rounded-3xl placeholder:text-gray-300"
            />
          </div>

          <div className="mt-5">
            <div className="uppercase text-xs tracking-widest text-mocha mb-3">STYLE INSPIRATION</div>
            {[
              "☕ Coffee Art","🌿 Hill Country","⬜ Minimal","📻 Vintage","🎨 Abstract","✏️ Typography"
            ].map((label, index) => {
              const id = ["coffee-art","nature-texas","minimal","vintage","abstract","bold-typography"][index];
              return (
                <button
                  key={index}
                  onClick={() => setStyle(id === style ? null : id)}
                  className={`mr-2 mb-2 px-5 py-1.5 rounded-2xl text-sm border ${style === id ? "border-rust bg-rust text-white" : "border-latte/30"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button 
            onClick={generateDesign}
            disabled={isGenerating || !prompt.trim()}
            className="mt-6 w-full py-4 rounded-3xl bg-espresso disabled:bg-gray-300 text-white text-lg font-medium flex items-center justify-center gap-2"
          >
            {isGenerating ? "Creating your design..." : "✨ Generate with AI"}
          </button>

          <div className="mt-4 text-xs text-center text-gray-500">
            {credits.free} free generations left this month. Upload your own PNG anytime.
          </div>
        </div>

        {/* Canvas + Product + Cart */}
        <div>
          <DesignCanvas 
            onSave={handleSaveDesign}
            onPriceChange={() => {}}
            initialDesignUrl={generatedDesign?.url}
          />

          {generatedDesign && (
            <div className="mt-8 flex items-center justify-between px-2">
              <div>
                <div className="font-mono text-4xl tabular-nums tracking-tighter">
                  {formatPrice(getRetailPrice(selectedProduct))}
                </div>
                <div className="text-sm text-gray-500">Made to order • Ships in 5–8 days</div>
              </div>
              <div>
                <button onClick={handleAddToCart} className="font-medium px-10 py-4 bg-rust text-white rounded-3xl">
                  Add to cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs mt-24 text-gray-400">
        All designs are user-generated. We perform basic moderation on inappropriate content.
      </p>
    </div>
  );
}
