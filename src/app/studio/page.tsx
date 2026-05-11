"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Save, CreditCard, RotateCcw } from 'lucide-react';
import { DesignCanvas, DesignLayer } from '@/components/studio/DesignCanvas';
import { useCartStore } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';

const PRODUCT_MOCKUPS: Record<string, string> = {
  mug: '/product-mockups/mug-white.png',
  tshirt: '/product-mockups/tshirt-white.png',
  glass: '/product-mockups/glass-clear.png',
  tote: '/product-mockups/tote-canvas.png',
};

const PRODUCT_PRICES: Record<string, number> = {
  mug: 2400,
  tshirt: 3200,
  glass: 2200,
  tote: 1800,
};

export default function StudioPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<'mug' | 'tshirt' | 'glass' | 'tote'>('mug');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesign, setGeneratedDesign] = useState<{ url: string; prompt: string } | null>(null);
  const [currentLayers, setCurrentLayers] = useState<DesignLayer[]>([]);
  const [credits, setCredits] = useState<{ free: number; paid: number }>({ free: 10, paid: 0 });

  const addToCart = useCartStore(s => s.addItem);

  const generate = async () => {
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Generation failed');
        return;
      }

      const designData = { url: data.image_url, prompt: data.prompt };
      setGeneratedDesign(designData);
      
      if (data.credits_remaining) setCredits(data.credits_remaining);
    } catch (e) {
      alert('Generation failed. We are working on it.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async (layers: DesignLayer[]) => {
    // Future: call POST /api/designs/save
    alert('Design saved to your private library (coming with Supabase auth)!');
  };

  const handleAddToCart = () => {
    if (!generatedDesign) return;

    addToCart({
      id: `custom-${selectedProduct}-${Date.now()}`,
      name: `Custom ${selectedProduct}`,
      price: PRODUCT_PRICES[selectedProduct],
      quantity: 1,
      image: currentLayers[0]?.url || generatedDesign.url,
      customization: {
        productType: selectedProduct,
        prompt: generatedDesign.prompt,
        layers: currentLayers,
      },
    });
    
    window.location.href = '/cart';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-12 pb-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center px-5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs uppercase tracking-widest font-semibold mb-4 shadow-sm">
          ✨ AI-Powered
        </div>
        <h1 className="font-heading text-6xl font-semibold tracking-tight">Design Studio</h1>
        <p className="mt-3 text-xl text-gray-600">Describe your vision. Our AI brings it to life on real merchandise.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Left: Prompt + Styles */}
        <div>
          <div className="mb-5 text-sm font-medium tracking-widest text-gray-500">DESCRIBE YOUR VISION</div>
          
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            placeholder="A minimalist coffee cup with steam forming a heart shape..."
            className="w-full resize-y px-5 py-4 text-2xl leading-tight text-espresso border rounded-3xl focus:outline-none focus:ring-2 focus:ring-rust/40 placeholder:text-gray-400"
          />

          <div className="mt-4">
            <div className="mb-2 text-xs text-gray-500 tracking-widest">STYLE INSPIRATION</div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "coffee-art", label: "☕ Coffee Art" },
                { id: "nature-texas", label: "🌿 Hill Country" },
                { id: "minimal", label: "⬜ Minimal" },
                { id: "vintage", label: "📻 Vintage" },
                { id: "abstract", label: "🎨 Abstract" },
                { id: "bold-typography", label: "✏️ Typography" },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id === style ? null : s.id)}
                  className={`px-4 py-1 rounded-full text-sm transition-all border ${style === s.id ? 'bg-black text-white border-black' : 'hover:bg-gray-100'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={generate} 
            disabled={isGenerating || !prompt.trim()} 
            className="btn-accent mt-6 w-full flex gap-3 items-center justify-center py-4 text-xl disabled:opacity-60"
          >
            {isGenerating ? 'Generating…' : '✨ Generate Design'}
          </button>

          <p className="text-xs text-center mt-4 text-gray-500">
            10 free creations per month. <Link href="#credits">Buy more • Upload your own</Link>
          </p>

          {/* Product picker and price preview */}
          <div className="mt-8">
            <div className="font-medium tracking-widest text-xs text-gray-500 mb-2">APPLY TO</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(['mug', 'tshirt', 'glass', 'tote'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProduct(p)}
                  className={`px-5 py-4 flex justify-between border rounded-2xl transition-all ${selectedProduct === p && "border-espresso bg-white shadow font-semibold"}`}
                >
                  <span className="capitalize">{p}</span>
                  <span>{formatPrice(PRODUCT_PRICES[p])}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Canvas Preview */}
        <div>
          {generatedDesign ? (
            <DesignCanvas 
              productMockup={PRODUCT_MOCKUPS[selectedProduct]} 
              initialDesign={generatedDesign}
              onLayersChange={setCurrentLayers}
              onSave={handleSaveToLibrary}
            />
          ) : (
            <div className="min-h-[600px] bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400">
              Your generated design will appear here.<br /> Try a prompt on the left.
            </div>
          )}

          {/* Pricing + Add to Cart */}
          {generatedDesign && currentLayers.length > 0 && (
            <div className="mt-6 flex items-center justify-between bg-white p-6 rounded-3xl border text-sm">
              <div>
                <div className="font-heading text-3xl tracking-tight">{formatPrice(PRODUCT_PRICES[selectedProduct])}</div>
                <div className="text-xs text-gray-500">+ Shipping calculated at checkout</div>
              </div>
              <button onClick={handleAddToCart} className="btn-accent text-lg px-10">Add to cart</button>
            </div>
          )}
        </div>
      </div>

      {/* Footer notes / legal + credits */}
      <p className="mt-16 text-center text-xs text-gray-400">
        All content is user-generated. Kynda Coffee is not responsible for any intellectual property issues.
      </p>
    </div>
  );
}