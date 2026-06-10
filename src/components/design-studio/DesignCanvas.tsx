"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Stage, Layer, Image as KonvaImage, Text, Rect, Transformer } from "react-konva";
import Konva from "konva";
import { Trash2, Upload, Type, Eye, EyeOff, RotateCcw, Package, Undo2, Redo2 } from "lucide-react";
import { type PrintfulProduct, getHostedMockupUrl } from "@/lib/printful/catalog";

// ============================================================
// Types
// ============================================================

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

export interface DesignCanvasHandle {
  addLayerFromUrl: (url: string, type: DesignLayer["type"], name?: string) => void;
  clearLayers: () => void;
  getLayers: () => DesignLayer[];
  loadLayers: (layers: DesignLayer[]) => void;
  exportThumbnail: () => string | null; // Returns dataURL or null
}

interface DesignCanvasProps {
  product: PrintfulProduct;
  view: "front" | "back";
  onViewChange: (view: "front" | "back") => void;
  onSave: (layers: DesignLayer[], productId: string) => void;
  onDesignChange: (layers: DesignLayer[]) => void;
  initialDesignUrl?: string | null;
}

// ============================================================
// useImage hook — loads an image once and caches it
// ============================================================

function useImage(url: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setImage(null);
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return image;
}

/**
 * Loads an image from `primary` URL; on failure, falls back to `fallbackUrl`.
 * Used for mockup images so the canvas always shows *something* even when
 * Printful CDN URLs 404 before the admin sync has run.
 */
function useImageWithFallback(
  primary: string | undefined,
  fallbackUrl: string | undefined
): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!primary) {
      setImage(null);
      return;
    }

    let cancelled = false;
    let triedFallback = false;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (cancelled) return;
      if (!triedFallback && fallbackUrl) {
        triedFallback = true;
        img.src = fallbackUrl;
      } else {
        setImage(null);
      }
    };
    img.src = primary;

    return () => {
      cancelled = true;
    };
  }, [primary, fallbackUrl]);

  return image;
}

// ============================================================
// DesignCanvasLayer — loads its own image and renders via Konva
// ============================================================

function DesignCanvasLayer({
  layer,
  isSelected,
  onSelect,
  onUpdate,
}: {
  layer: DesignLayer;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (changes: Partial<DesignLayer>) => void;
}) {
  const image = useImage(layer.url);

  if (!layer.visible && layer.visible !== undefined) return null;

  if (layer.type === "text") {
    return (
      <Text
        id={layer.id}
        text={layer.text || ""}
        x={layer.x}
        y={layer.y}
        fontSize={layer.fontSize || 48}
        fontFamily={layer.fontFamily || " EB Garamond, Georgia, serif"}
        fill={layer.color || "#1B1C1A"}
        rotation={layer.rotation}
        opacity={layer.opacity}
        scaleX={layer.scaleX}
        scaleY={layer.scaleY}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onUpdate({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          onUpdate({
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
    );
  }

  if (!image) return null;

  return (
    <KonvaImage
      id={layer.id}
      image={image}
      x={layer.x}
      y={layer.y}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      rotation={layer.rotation}
      opacity={layer.opacity}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onUpdate({ x: e.target.x(), y: e.target.y() });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        onUpdate({
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

// ============================================================
// DesignCanvas
// ============================================================

export const DesignCanvas = forwardRef<DesignCanvasHandle, DesignCanvasProps>(
  function DesignCanvas(
    { product, view, onViewChange, onSave, onDesignChange, initialDesignUrl },
    ref
  ) {
    const [layers, setLayers] = useState<DesignLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [showTextDialog, setShowTextDialog] = useState(false);
    const [textValue, setTextValue] = useState("");
    const [textColor, setTextColor] = useState("#1B1C1A");
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    // ── Undo / Redo history (Epic 8 canvas polish) ──
    // Every tracked mutation snapshots the previous layer state; undo/redo swap
    // between the stacks. Capped at 50 steps. `historyVersion` only exists to
    // re-render the toolbar's disabled states (refs don't trigger renders).
    const undoStackRef = useRef<DesignLayer[][]>([]);
    const redoStackRef = useRef<DesignLayer[][]>([]);
    const [, setHistoryVersion] = useState(0);

    const setLayersTracked = useCallback(
      (updater: (prev: DesignLayer[]) => DesignLayer[]) => {
        setLayers((prev) => {
          undoStackRef.current.push(prev);
          if (undoStackRef.current.length > 50) undoStackRef.current.shift();
          redoStackRef.current = [];
          return updater(prev);
        });
        setHistoryVersion((v) => v + 1);
      },
      []
    );

    const undo = useCallback(() => {
      setLayers((current) => {
        const prev = undoStackRef.current.pop();
        if (!prev) return current;
        redoStackRef.current.push(current);
        return prev;
      });
      setSelectedLayerId(null);
      setHistoryVersion((v) => v + 1);
    }, []);

    const redo = useCallback(() => {
      setLayers((current) => {
        const next = redoStackRef.current.pop();
        if (!next) return current;
        undoStackRef.current.push(current);
        return next;
      });
      setSelectedLayerId(null);
      setHistoryVersion((v) => v + 1);
    }, []);

    // Mockup image — try Supabase-hosted (from admin sync), fall back to product imageUrl
  const supabaseMockupUrl = getHostedMockupUrl(product.id, view);
    const mockupImage = useImageWithFallback(supabaseMockupUrl, product.imageUrl);

    // Auto-add initial design
    useEffect(() => {
      if (initialDesignUrl && layers.length === 0) {
        addLayerFromUrl(initialDesignUrl, "generated", "AI Design");
      }

    }, [initialDesignUrl]);

    // Parent callback on changes
    useEffect(() => {
      onDesignChange(layers);
    }, [layers, onDesignChange]);

    // Attach transformer to selected layer
    useEffect(() => {
      if (!transformerRef.current || !stageRef.current) return;
      if (selectedLayerId) {
        const node = stageRef.current.findOne(`#${selectedLayerId}`);
        transformerRef.current.nodes(node ? [node as Konva.Node] : []);
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer()?.batchDraw();
    }, [selectedLayerId, layers, mockupImage]); // mockupImage ensures stage is ready

    // Imperative API for parent
    const addLayerFromUrl = useCallback(
      (url: string, type: DesignLayer["type"], name?: string) => {
        const newLayer: DesignLayer = {
          id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          url,
          x: 200 + Math.random() * 200,
          y: 200 + Math.random() * 200,
          scaleX: type === "logo" ? 0.25 : 0.45,
          scaleY: type === "logo" ? 0.25 : 0.45,
          rotation: 0,
          opacity: 1,
          name: name || (type === "logo" ? "Kynda Logo" : "Design"),
          visible: true,
        };
        setLayersTracked((prev) => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);
      },
      [setLayersTracked]
    );

    const clearLayers = useCallback(() => {
      setLayersTracked(() => []);
      setSelectedLayerId(null);
    }, [setLayersTracked]);

    const getLayers = useCallback(() => layers, [layers]);

    const loadLayers = useCallback((newLayers: DesignLayer[]) => {
      setLayers(newLayers);
      setSelectedLayerId(null);
      // Loading a saved design starts a fresh history.
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    }, []);

    const exportThumbnail = useCallback((): string | null => {
      if (!stageRef.current) return null;
      try {
        return stageRef.current.toDataURL({ pixelRatio: 0.5, mimeType: "image/jpeg", quality: 0.7 });
      } catch {
        return null;
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({ addLayerFromUrl, clearLayers, getLayers, loadLayers, exportThumbnail }),
      [addLayerFromUrl, clearLayers, getLayers, loadLayers, exportThumbnail]
    );

    const updateLayer = (id: string, changes: Partial<DesignLayer>) => {
      setLayersTracked((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...changes } : l))
      );
    };

    const addTextLayer = useCallback(() => {
      if (!textValue.trim()) return;
      const newLayer: DesignLayer = {
        id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "text",
        text: textValue.trim(),
        fontSize: 48,
        fontFamily: "'EB Garamond', Georgia, serif",
        color: textColor,
        x: 200,
        y: 280,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        name: textValue.trim().slice(0, 20),
        visible: true,
      };
      setLayersTracked((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
      setTextValue("");
      setShowTextDialog(false);
    }, [textValue, textColor, setLayersTracked]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        addLayerFromUrl(dataUrl, "upload", file.name.split(".")[0]);
      };
      reader.readAsDataURL(file);
    };

    const deleteSelected = () => {
      if (!selectedLayerId) return;
      setLayersTracked((prev) => prev.filter((l) => l.id !== selectedLayerId));
      setSelectedLayerId(null);
    };

    const resetSelection = () => setSelectedLayerId(null);

    const rotateSelected = () => {
      if (!selectedLayerId) return;
      updateLayer(selectedLayerId, {
        rotation: (layers.find((l) => l.id === selectedLayerId)?.rotation || 0) - 90,
      });
    };

    const saveDesign = () => onSave(layers, product.id);

    const STAGE_WIDTH = 620;
    const STAGE_HEIGHT = 620;

    return (
      <div className="space-y-4">
        {/* View Toggle */}
        {product.mockupImages.back && (
          <div className="flex gap-2">
            {(["front", "back"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition ${
                  view === v
                    ? "bg-forest text-sand"
                    : "bg-card text-espresso border border-latte/30 hover:border-forest/50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div
          className="relative rounded-xl overflow-hidden border border-latte/30 shadow-soft mx-auto bg-background"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, maxWidth: "100%" }}
        >
          <Stage
            ref={stageRef}
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            onClick={(e) => {
              if (e.target === e.target.getStage()) resetSelection();
            }}
          >
            <Layer>
              {/* Product Mockup Background */}
              {mockupImage ? (
                <KonvaImage
                  image={mockupImage}
                  x={10}
                  y={10}
                  width={600}
                  height={600}
                  listening={false}
                />
              ) : (
                <Rect
                  x={10}
                  y={10}
                  width={600}
                  height={600}
                  fill="#F5F3EF"
                  cornerRadius={8}
                  listening={false}
                />
              )}

              {/* Design Layers */}
              {layers.map((layer) => (
                <DesignCanvasLayer
                  key={layer.id}
                  layer={layer}
                  isSelected={selectedLayerId === layer.id}
                  onSelect={() => setSelectedLayerId(layer.id)}
                  onUpdate={(changes) => updateLayer(layer.id, changes)}
                />
              ))}

              {/* Transformer */}
              <Transformer
                ref={transformerRef}
                rotateEnabled
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) return oldBox;
                  return newBox;
                }}
              />
            </Layer>
          </Stage>

          {/* Empty state */}
          {layers.length === 0 && !mockupImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-mocha pointer-events-none gap-3">
              <Package size={48} className="text-latte/50" />
              <p className="text-sm font-medium">{product.name}</p>
              <p className="text-xs text-mocha/60">Upload or generate a design to preview on this product</p>
            </div>
          )}
          {layers.length === 0 && mockupImage && (
            <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
              <div className="bg-background/80 backdrop-blur px-4 py-2 rounded-full text-xs text-mocha border border-latte/20">
                Pick a design or upload your own to get started
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={undo}
            disabled={undoStackRef.current.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition disabled:opacity-40 disabled:hover:border-latte/30"
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={redoStackRef.current.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition disabled:opacity-40 disabled:hover:border-latte/30"
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 size={14} />
          </button>

          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition">
              <Upload size={14} /> Upload
            </div>
          </label>

          <button
            onClick={() => addLayerFromUrl("/images/logos/kynda-logo-black.png", "logo", "Kynda Logo")}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition"
          >
            ☕ Add Logo
          </button>

          <button
            onClick={() => setShowTextDialog(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition"
          >
            <Type size={14} /> Text
          </button>

          {selectedLayerId && (
            <>
              <button
                onClick={rotateSelected}
                className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition"
                title="Rotate 90°"
              >
                <RotateCcw size={14} />
              </button>

              <button
                onClick={deleteSelected}
                className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-red-500/30 hover:border-red-500 hover:text-red-600 rounded-lg text-sm transition"
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}

          {layers.length > 0 && (
            <button
              onClick={saveDesign}
              className="btn-accent text-sm px-5 py-2 ml-auto"
            >
              Save Design
            </button>
          )}
        </div>

        {/* Layers List */}
        {layers.length > 0 && (
          <div className="space-y-1.5 bg-card/50 rounded-lg p-3 border border-latte/20">
            <div className="text-xs font-medium text-mocha uppercase tracking-wider mb-2">
              Layers ({layers.length}) — drag on canvas to reposition
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs cursor-pointer transition ${
                    selectedLayerId === layer.id
                      ? "bg-forest/10 ring-1 ring-forest/30"
                      : "hover:bg-background"
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { visible: !(layer.visible !== false) });
                    }}
                    className="text-mocha hover:text-espresso shrink-0"
                    aria-label="Toggle visibility"
                  >
                    {layer.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <span className="flex-1 truncate text-espresso font-medium">
                    {layer.name || layer.type}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-mocha/70">
                    {layer.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text Dialog */}
        {showTextDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl p-6 shadow-2xl max-w-md w-full">
              <h3 className="text-lg font-heading font-semibold mb-4">Add Custom Text</h3>
              <input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Your custom text..."
                className="w-full px-4 py-3 border border-latte rounded-lg mb-4 text-espresso bg-background"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addTextLayer()}
              />
              <div className="mb-4">
                <label className="block text-xs font-medium text-mocha mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { c: "#1B1C1A", name: "Espresso" },
                    { c: "#FFFFFF", name: "White" },
                    { c: "#061B0E", name: "Forest" },
                    { c: "#BA1A1A", name: "Red" },
                    { c: "#A67C52", name: "Bronze" },
                    { c: "#434843", name: "Slate" },
                  ].map(({ c, name }) => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      title={name}
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        textColor === c ? "border-forest scale-110 shadow-md" : "border-latte/30"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTextDialog(false);
                    setTextValue("");
                  }}
                  className="flex-1 px-4 py-2 bg-card border border-latte/30 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addTextLayer}
                  disabled={!textValue.trim()}
                  className="flex-1 btn-accent disabled:opacity-50"
                >
                  Add Text
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
