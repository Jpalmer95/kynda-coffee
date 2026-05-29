"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Text, Rect, Transformer } from "react-konva";
import Konva from "konva";
import { Trash2, RotateCw, Upload, Type, Eye, EyeOff } from "lucide-react";
import type { PrintfulProduct } from "@/lib/printful/catalog";

export interface DesignLayer {
  id: string;
  type: "generated" | "sticker" | "upload" | "text" | "logo";
  url?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  name?: string;
  visible?: boolean;
}

interface DesignCanvasProps {
  product: PrintfulProduct;
  view: "front" | "back";
  onViewChange: (view: "front" | "back") => void;
  onSave: (layers: DesignLayer[], productId: string) => void;
  onDesignChange: (layers: DesignLayer[]) => void;
  initialDesignUrl?: string;
}

export function DesignCanvas({
  product,
  view,
  onViewChange,
  onSave,
  onDesignChange,
  initialDesignUrl,
}: DesignCanvasProps) {
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<string | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textValue, setTextValue] = useState("");
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Load mockup image
  const [mockupImage, setMockupImage] = useState<HTMLImageElement | null>(null);
  const currentMockupUrl = view === "front" ? product.mockupImages.front : product.mockupImages.back;

  useEffect(() => {
    if (!currentMockupUrl) {
      setMockupImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = currentMockupUrl;
    img.onload = () => setMockupImage(img);
    img.onerror = () => setMockupImage(null);
  }, [currentMockupUrl]);

  // Auto-add initial design as a layer
  useEffect(() => {
    if (initialDesignUrl && layers.length === 0) {
      addImageLayer(initialDesignUrl, "generated");
    }
  }, [initialDesignUrl]);

  // Notify parent on any layer change
  useEffect(() => {
    onDesignChange(layers);
  }, [layers, onDesignChange]);

  // Attach transformer to selected layer
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const stage = stageRef.current;
    
    if (selectedLayerId) {
      const node = stage.findOne(`#${selectedLayerId}`);
      if (node) {
        transformerRef.current.nodes([node]);
      } else {
        transformerRef.current.nodes([]);
      }
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedLayerId, layers]);

  const addImageLayer = useCallback((imageUrl: string, type: DesignLayer["type"]) => {
    const newLayer: DesignLayer = {
      id: `layer_${Date.now()}`,
      type,
      url: imageUrl,
      x: 310,
      y: 310,
      scaleX: 0.5,
      scaleY: 0.5,
      rotation: 0,
      opacity: 1,
      name: type === "logo" ? "Kynda Logo" : type === "generated" ? "AI Design" : "Upload",
      visible: true,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, []);

  const addTextLayer = useCallback(() => {
    if (!textValue.trim()) return;
    const newLayer: DesignLayer = {
      id: `layer_${Date.now()}`,
      type: "text",
      text: textValue.trim(),
      fontSize: 48,
      fontFamily: "var(--font-heading), EB Garamond, serif",
      color: "#1B1C1A",
      x: 310,
      y: 310,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
      name: textValue.trim().slice(0, 20),
      visible: true,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setTextValue("");
    setShowTextDialog(false);
  }, [textValue]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      addImageLayer(dataUrl, "upload");
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    if (!selectedLayerId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const saveDesign = async () => {
    onSave(layers, product.id);
  };

  const STAGE_WIDTH = 620;
  const STAGE_HEIGHT = 620;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      {product.mockupImages.back && (
        <div className="flex gap-2">
          <button
            onClick={() => onViewChange("front")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              view === "front"
                ? "bg-forest text-sand"
                : "bg-card text-espresso border border-latte/30"
            }`}
          >
            Front
          </button>
          <button
            onClick={() => onViewChange("back")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              view === "back"
                ? "bg-forest text-sand"
                : "bg-card text-espresso border border-latte/30"
            }`}
          >
            Back
          </button>
        </div>
      )}

      {/* Canvas */}
      <div
        className="relative rounded-xl overflow-hidden border border-latte/30 shadow-sm mx-auto"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      >
        <Stage
          ref={stageRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          className="cursor-crosshair"
          onClick={(e) => {
            if (e.target === e.target.getStage()) {
              setSelectedLayerId(null);
            }
          }}
        >
          <Layer>
            {/* Product Background */}
            {mockupImage ? (
              <KonvaImage
                image={mockupImage}
                x={10}
                y={10}
                width={600}
                height={600}
              />
            ) : (
              <Rect
                x={10}
                y={10}
                width={600}
                height={600}
                fill="#F5F3EF"
                stroke="#C3C8C1"
                strokeWidth={2}
              />
            )}

            {/* Design Layers */}
            {layers.map((layer) => {
              if (!layer.visible && layer.visible !== undefined) return null;

              if (layer.type === "text") {
                return (
                  <Text
                    key={layer.id}
                    id={layer.id}
                    text={layer.text || ""}
                    x={layer.x}
                    y={layer.y}
                    fontSize={layer.fontSize || 48}
                    fontFamily={layer.fontFamily}
                    fill={layer.color || "#1B1C1A"}
                    rotation={layer.rotation}
                    opacity={layer.opacity}
                    draggable
                    onClick={() => setSelectedLayerId(layer.id)}
                    onTap={() => setSelectedLayerId(layer.id)}
                    onDragEnd={(e) => {
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.id === layer.id
                            ? { ...l, x: e.target.x(), y: e.target.y() }
                            : l
                        )
                      );
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.id === layer.id
                            ? {
                                ...l,
                                x: node.x(),
                                y: node.y(),
                                scaleX: node.scaleX(),
                                scaleY: node.scaleY(),
                                rotation: node.rotation(),
                              }
                            : l
                        )
                      );
                    }}
                  />
                );
              }

              // Image layers (generated, sticker, upload, logo)
              return (
                <KonvaImage
                  key={layer.id}
                  id={layer.id}
                  image={(() => {
                    const img = new window.Image();
                    img.src = layer.url || "";
                    return img;
                  })()}
                  x={layer.x}
                  y={layer.y}
                  scaleX={layer.scaleX}
                  scaleY={layer.scaleY}
                  rotation={layer.rotation}
                  opacity={layer.opacity}
                  draggable
                  onClick={() => setSelectedLayerId(layer.id)}
                  onTap={() => setSelectedLayerId(layer.id)}
                  onDragEnd={(e) => {
                    setLayers((prev) =>
                      prev.map((l) =>
                        l.id === layer.id
                          ? { ...l, x: e.target.x(), y: e.target.y() }
                          : l
                      )
                    );
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    setLayers((prev) =>
                      prev.map((l) =>
                        l.id === layer.id
                          ? {
                              ...l,
                              x: node.x(),
                              y: node.y(),
                              scaleX: node.scaleX(),
                              scaleY: node.scaleY(),
                              rotation: node.rotation(),
                            }
                          : l
                      )
                    );
                  }}
                />
              );
            })}

            {/* Transformer */}
            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition">
            <Upload size={16} />
            Upload Image
          </div>
        </label>

        <button
          onClick={() => setShowTextDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition"
        >
          <Type size={16} />
          Add Text
        </button>

        <button
          onClick={deleteSelected}
          disabled={!selectedLayerId}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-latte/30 hover:border-red-500 disabled:opacity-50 rounded-lg text-sm text-red-600 transition"
        >
          <Trash2 size={16} />
          Delete
        </button>

        <button
          onClick={saveDesign}
          className="btn-accent text-sm px-6 py-2 ml-auto"
        >
          Save Design
        </button>
      </div>

      {/* Layer List */}
      {layers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-espresso">Layers ({layers.length})</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                  selectedLayerId === layer.id
                    ? "bg-forest/10 border border-forest/30"
                    : "bg-card hover:bg-latte/10"
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className="text-mocha hover:text-espresso"
                >
                  {layer.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <div className="flex-1 truncate">
                  <span className="font-medium">{layer.name || layer.type}</span>
                  <span className="text-[10px] uppercase tracking-wider ml-2 opacity-60">
                    {layer.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoadingImage && (
        <div className="text-sm text-amber-600">Processing...</div>
      )}

      {/* Text Dialog */}
      {showTextDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Text</h3>
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Your custom text..."
              className="w-full px-4 py-3 border border-latte rounded-lg mb-4 text-espresso"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowTextDialog(false)}
                className="flex-1 px-4 py-2 bg-card border border-latte rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addTextLayer}
                disabled={!textValue.trim()}
                className="flex-1 btn-accent"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
