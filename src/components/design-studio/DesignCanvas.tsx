"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import { Trash2, RotateCw, Download, Upload, Palette } from "lucide-react";

export interface DesignLayer {
  id: string;
  type: "generated" | "sticker" | "upload";
  url: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  name?: string;
}

interface ProductMockup {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
}

const PRODUCT_MOCKUPS: ProductMockup[] = [
  {
    id: "mug",
    name: "Ceramic Mug",
    imageUrl: "/images/mockups/mug-isometric.png", // replace with real assets
    width: 600,
    height: 600,
  },
  {
    id: "tshirt",
    name: "Classic Tee",
    imageUrl: "/images/mockups/tshirt-front.png",
    width: 600,
    height: 700,
  },
  {
    id: "glass",
    name: "Glass Cup",
    imageUrl: "/images/mockups/glass-cup.png",
    width: 500,
    height: 700,
  },
  {
    id: "tote",
    name: "Tote Bag",
    imageUrl: "/images/mockups/tote-bag.png",
    width: 650,
    height: 650,
  },
];

interface DesignCanvasProps {
  onSave: (layers: DesignLayer[], productId: string) => void;
  onPriceChange: (price: number) => void;
  initialDesignUrl?: string;
}

export function DesignCanvas({ onSave, onPriceChange, initialDesignUrl }: DesignCanvasProps) {
  const [selectedProduct, setSelectedProduct] = useState("mug");
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const currentMockup = PRODUCT_MOCKUPS.find((p) => p.id === selectedProduct)!;

  // Load product mockup image
  const [mockupImage, setMockupImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = currentMockup.imageUrl;
    img.onload = () => setMockupImage(img);
  }, [currentMockup.imageUrl]);

  // Add a new generated layer (from API)
  const addGeneratedLayer = useCallback((imageUrl: string) => {
    const newLayer: DesignLayer = {
      id: `layer_${Date.now()}`,
      type: "generated",
      url: imageUrl,
      x: 0.5,
      y: 0.45,
      scaleX: 0.55,
      scaleY: 0.55,
      rotation: 0,
      opacity: 1,
      name: "AI Design",
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    onPriceChange(24); // temporary price, will be replaced by real pricing logic
  }, [onPriceChange]);

  // Add user-uploaded PNG / sticker (no background)
  const addUploadedLayer = useCallback((imageUrl: string) => {
    const newLayer: DesignLayer = {
      id: `layer_${Date.now()}`,
      type: "upload",
      url: imageUrl,
      x: 0.5,
      y: 0.5,
      scaleX: 0.4,
      scaleY: 0.4,
      rotation: 0,
      opacity: 1,
      name: "Custom Upload",
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, []);

  // Handle file upload (user PNGs)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      addUploadedLayer(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Update a layer
  const updateLayer = (id: string, changes: Partial<DesignLayer>) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...changes } : layer))
    );
  };

  // Delete selected layer
  const deleteSelected = () => {
    if (!selectedLayerId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  // Export final composite (for Printful / preview)
  const exportDesign = async (): Promise<{ png: string; layers: DesignLayer[] }> => {
    if (!stageRef.current) throw new Error("Stage not ready");

    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
    return {
      png: dataUrl,
      layers: layers,
    };
  };

  // Save design locally
  const saveCurrentDesign = async () => {
    const exported = await exportDesign();
    onSave(exported.layers, selectedProduct);
  };

  // Background removal helper (calls FAL)
  const removeBackground = async (layerUrl: string) => {
    try {
      setIsLoadingImage(layerUrl);
      const res = await fetch("/api/designs/remove-bg", {
        method: "POST",
        body: JSON.stringify({ image_url: layerUrl }),
      });
      const data = await res.json();
      if (!data.url) throw new Error("Background removal failed");

      // Replace the layer URL with the processed image
      setLayers((prev) =>
        prev.map((l) =>
          l.url === layerUrl ? { ...l, url: data.url, type: "sticker" } : l
        )
      );
    } catch (err) {
      alert("Background removal failed. Please try a different image.");
    } finally {
      setIsLoadingImage(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Product Selector */}
      <div className="flex gap-3 flex-wrap">
        {PRODUCT_MOCKUPS.map((product) => (
          <button
            key={product.id}
            onClick={() => setSelectedProduct(product.id)}
            className={`px-5 py-2 rounded-full text-sm border transition ${
              selectedProduct === product.id
                ? "bg-espresso text-white border-espresso"
                : "bg-white text-espresso border-latte/30 hover:bg-latte/5"
            }`}
          >
            {product.name}
          </button>
        ))}
      </div>

      {/* Canvas Area */}
      <div className="relative bg-[#f8f5f0] rounded-[24px] overflow-hidden border border-latte/30 shadow-sm mx-auto" style={{ width: 620, height: 620 }}>
        <Stage
          ref={stageRef}
          width={620}
          height={620}
          className="cursor-crosshair"
        >
          <Layer>
            {/* Product Background */}
            {mockupImage && (
              <KonvaImage
                image={mockupImage}
                x={10}
                y={10}
                width={600}
                height={600}
              />
            )}

            {/* Editable Design Layers */}
            {layers.map((layer, i) => {
              const img = new window.Image();
              img.src = layer.url;

              return (
                <KonvaImage
                  key={layer.id}
                  image={img}
                  x={layer.x * 620 - (img.width * layer.scaleX) / 2}
                  y={layer.y * 620 - (img.height * layer.scaleY) / 2}
                  scaleX={layer.scaleX}
                  scaleY={layer.scaleY}
                  rotation={layer.rotation}
                  opacity={layer.opacity}
                  draggable
                  onClick={() => setSelectedLayerId(layer.id)}
                  onDragEnd={(e) =>
                    updateLayer(layer.id, {
                      x: (e.target.x() + (img.width * layer.scaleX) / 2) / 620,
                      y: (e.target.y() + (img.height * layer.scaleY) / 2) / 620,
                    })
                  }
                  onTransformEnd={(e) => {
                    const node = e.target as any;
                    updateLayer(layer.id, {
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY(),
                      rotation: node.rotation(),
                    });
                  }}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Layer Controls */}
      <div className="flex justify-between items-center px-2">
        <div className="flex gap-3">
          <button
            onClick={deleteSelected}
            disabled={!selectedLayerId}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border hover:bg-red-50 text-red-600 disabled:opacity-50"
          >
            <Trash2 size={15} /> Delete Layer
          </button>

          <button
            onClick={saveCurrentDesign}
            className="btn-accent text-sm px-6 py-2 flex gap-2"
          >
            <Download size={15} /> Save to My Designs
          </button>
        </div>

        <label className="cursor-pointer">
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <div className="flex items-center gap-2 px-4 py-2 border hover:bg-white/70 rounded-[20px] text-sm">
            <Upload size={15} /> Upload PNG / Sticker
          </div>
        </label>
      </div>

      {/* Layer List */}
      <div className="text-sm text-mocha">
        {layers.length > 0 && (
          <>
            <div className="font-medium mb-2">Layers ({layers.length})</div>
            {layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex justify-between items-center transition ${
                  selectedLayerId === layer.id ? "bg-latte text-espresso" : "hover:bg-latte/40"
                }`}
              >
                <span>{layer.name || "Design"}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-60">{layer.type}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {isLoadingImage && <div className="text-amber-500 text-xs">Processing background removal...</div>}
    </div>
  );
}
