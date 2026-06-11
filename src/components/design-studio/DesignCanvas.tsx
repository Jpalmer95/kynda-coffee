"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Stage, Layer, Image as KonvaImage, Text, Rect, Group, Transformer } from "react-konva";
import Konva from "konva";
import {
  Trash2,
  Upload,
  Type,
  Eye,
  EyeOff,
  RotateCcw,
  Package,
  Undo2,
  Redo2,
  Copy,
  ChevronUp,
  ChevronDown,
  Pencil,
  Shirt,
  PenTool,
} from "lucide-react";
import { type PrintfulProduct, type ProductVariant, getBestProductImage } from "@/lib/printful/catalog";

// ============================================================
// Coordinate system
// ------------------------------------------------------------
// All layer positions are stored in a VIRTUAL 1000x1000 space.
// The Stage is rendered at the container's real width and scaled
// by (displaySize / 1000), so the full work area is ALWAYS visible
// regardless of screen size — nothing can land off-canvas.
// ============================================================

const VIRTUAL = 1000;

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
  variant?: ProductVariant | null;
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

/** Loads `primary`, falls back to `fallbackUrl` on failure. */
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
      if (!triedFallback && fallbackUrl && fallbackUrl !== primary) {
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
// DesignCanvasLayer — renders one layer via Konva
// ============================================================

function DesignCanvasLayer({
  layer,
  onSelect,
  onUpdate,
  onEditText,
  interactive,
}: {
  layer: DesignLayer;
  onSelect: () => void;
  onUpdate: (changes: Partial<DesignLayer>) => void;
  onEditText?: () => void;
  interactive: boolean;
}) {
  const image = useImage(layer.url);

  if (layer.visible === false) return null;

  // Keep the layer's anchor point inside the virtual canvas while dragging
  const dragBound = (pos: { x: number; y: number }) => ({
    x: Math.max(20, Math.min(VIRTUAL - 20, pos.x)),
    y: Math.max(20, Math.min(VIRTUAL - 20, pos.y)),
  });

  const common = {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
    rotation: layer.rotation,
    opacity: layer.opacity,
    draggable: interactive,
    listening: interactive,
    dragBoundFunc: dragBound,
    onClick: onSelect,
    onTap: onSelect,
    onDragStart: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onUpdate({ x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      onUpdate({
        x: node.x(),
        y: node.y(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
      });
    },
  };

  if (layer.type === "text") {
    return (
      <Text
        {...common}
        text={layer.text || ""}
        fontSize={layer.fontSize || 64}
        fontFamily={layer.fontFamily || "'EB Garamond', Georgia, serif"}
        fill={layer.color || "#1B1C1A"}
        onDblClick={onEditText}
        onDblTap={onEditText}
      />
    );
  }

  if (!image) return null;

  // Center-origin so rotation/scaling pivots around the middle
  return (
    <KonvaImage
      {...common}
      image={image}
      offsetX={image.naturalWidth / 2}
      offsetY={image.naturalHeight / 2}
    />
  );
}

// ============================================================
// DesignCanvas
// ============================================================

export const DesignCanvas = forwardRef<DesignCanvasHandle, DesignCanvasProps>(
  function DesignCanvas(
    { product, variant, view, onViewChange, onSave, onDesignChange, initialDesignUrl },
    ref
  ) {
    const [layers, setLayers] = useState<DesignLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [showTextDialog, setShowTextDialog] = useState(false);
    const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
    const [textValue, setTextValue] = useState("");
    const [textColor, setTextColor] = useState("#1B1C1A");
    const [mode, setMode] = useState<"design" | "preview">("design");
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    // ── Responsive sizing: the stage always shows the FULL virtual canvas ──
    const containerRef = useRef<HTMLDivElement>(null);
    const [displaySize, setDisplaySize] = useState(620);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const measure = () => {
        const w = el.clientWidth;
        if (w > 0) setDisplaySize(w);
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const stageScale = displaySize / VIRTUAL;

    // ── Undo / Redo history ──
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

    // Mockup image — color-matched variant photo first, then product photo
    const primaryMockup = getBestProductImage(product, variant);
    const mockupImage = useImageWithFallback(primaryMockup, product.imageUrl);

    // Aspect-fit the mockup photo inside the virtual canvas
    const mockupFit = (() => {
      if (!mockupImage) return { x: 0, y: 0, w: VIRTUAL, h: VIRTUAL };
      const iw = mockupImage.naturalWidth || 1;
      const ih = mockupImage.naturalHeight || 1;
      const s = Math.min(VIRTUAL / iw, VIRTUAL / ih);
      const w = iw * s;
      const h = ih * s;
      return { x: (VIRTUAL - w) / 2, y: (VIRTUAL - h) / 2, w, h };
    })();

    const printArea = product.canvasPrintArea ?? { x: 250, y: 250, w: 500, h: 500 };

    // Auto-add initial design
    useEffect(() => {
      if (initialDesignUrl && layers.length === 0) {
        addLayerFromUrl(initialDesignUrl, "generated", "AI Design");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDesignUrl]);

    // Parent callback on changes
    useEffect(() => {
      onDesignChange(layers);
    }, [layers, onDesignChange]);

    // Attach transformer to selected layer (design mode only)
    useEffect(() => {
      if (!transformerRef.current || !stageRef.current) return;
      if (selectedLayerId && mode === "design") {
        const node = stageRef.current.findOne(`#${selectedLayerId}`);
        transformerRef.current.nodes(node ? [node as Konva.Node] : []);
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer()?.batchDraw();
    }, [selectedLayerId, layers, mockupImage, mode]);

    // Keyboard: Delete/Backspace removes the selected layer
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Delete" && e.key !== "Backspace") return;
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable) return;
        if (!selectedLayerId) return;
        e.preventDefault();
        setLayersTracked((prev) => prev.filter((l) => l.id !== selectedLayerId));
        setSelectedLayerId(null);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [selectedLayerId, setLayersTracked]);

    // ── Imperative API ──
    // New layers spawn CENTERED in the product's print area, scaled to fit.
    const addLayerFromUrl = useCallback(
      (url: string, type: DesignLayer["type"], name?: string) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const targetW = printArea.w * (type === "logo" ? 0.45 : 0.7);
          const targetH = printArea.h * (type === "logo" ? 0.45 : 0.7);
          const scale = Math.min(
            targetW / (img.naturalWidth || 1),
            targetH / (img.naturalHeight || 1)
          );
          const newLayer: DesignLayer = {
            id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type,
            url,
            // Center of print area (image uses center-origin offsets)
            x: printArea.x + printArea.w / 2,
            y: printArea.y + printArea.h / 2,
            scaleX: scale,
            scaleY: scale,
            rotation: 0,
            opacity: 1,
            name: name || (type === "logo" ? "Kynda Logo" : "Design"),
            visible: true,
          };
          setLayersTracked((prev) => [...prev, newLayer]);
          setSelectedLayerId(newLayer.id);
          setMode("design");
        };
        img.onerror = () => {
          // Still add with a sane default scale so the user sees feedback
          const newLayer: DesignLayer = {
            id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type,
            url,
            x: printArea.x + printArea.w / 2,
            y: printArea.y + printArea.h / 2,
            scaleX: 0.4,
            scaleY: 0.4,
            rotation: 0,
            opacity: 1,
            name: name || "Design",
            visible: true,
          };
          setLayersTracked((prev) => [...prev, newLayer]);
          setSelectedLayerId(newLayer.id);
        };
        img.src = url;
      },
      [setLayersTracked, printArea.x, printArea.y, printArea.w, printArea.h]
    );

    const clearLayers = useCallback(() => {
      setLayersTracked(() => []);
      setSelectedLayerId(null);
    }, [setLayersTracked]);

    const getLayers = useCallback(() => layers, [layers]);

    const loadLayers = useCallback((newLayers: DesignLayer[]) => {
      setLayers(newLayers);
      setSelectedLayerId(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    }, []);

    const exportThumbnail = useCallback((): string | null => {
      if (!stageRef.current) return null;
      try {
        // Normalize export to ~500px regardless of on-screen size
        const pixelRatio = 500 / (stageRef.current.width() || 500);
        return stageRef.current.toDataURL({
          pixelRatio,
          mimeType: "image/jpeg",
          quality: 0.7,
        });
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

    // ── Layer operations ──
    const duplicateLayer = (id: string) => {
      const src = layers.find((l) => l.id === id);
      if (!src) return;
      const copy: DesignLayer = {
        ...src,
        id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        x: Math.min(VIRTUAL - 40, src.x + 40),
        y: Math.min(VIRTUAL - 40, src.y + 40),
        name: `${src.name || src.type} copy`,
      };
      setLayersTracked((prev) => [...prev, copy]);
      setSelectedLayerId(copy.id);
    };

    const moveLayer = (id: string, dir: -1 | 1) => {
      setLayersTracked((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        const next = idx + dir;
        if (idx < 0 || next < 0 || next >= prev.length) return prev;
        const arr = [...prev];
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        return arr;
      });
    };

    const openTextDialog = (layerId?: string) => {
      if (layerId) {
        const l = layers.find((x) => x.id === layerId);
        if (l) {
          setTextValue(l.text || "");
          setTextColor(l.color || "#1B1C1A");
          setEditingTextLayerId(layerId);
        }
      } else {
        setTextValue("");
        setEditingTextLayerId(null);
      }
      setShowTextDialog(true);
    };

    const commitText = useCallback(() => {
      if (!textValue.trim()) return;
      if (editingTextLayerId) {
        setLayersTracked((prev) =>
          prev.map((l) =>
            l.id === editingTextLayerId
              ? { ...l, text: textValue.trim(), color: textColor, name: textValue.trim().slice(0, 20) }
              : l
          )
        );
      } else {
        const newLayer: DesignLayer = {
          id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: "text",
          text: textValue.trim(),
          fontSize: 72,
          fontFamily: "'EB Garamond', Georgia, serif",
          color: textColor,
          x: printArea.x + printArea.w * 0.15,
          y: printArea.y + printArea.h / 2,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          name: textValue.trim().slice(0, 20),
          visible: true,
        };
        setLayersTracked((prev) => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);
      }
      setTextValue("");
      setEditingTextLayerId(null);
      setShowTextDialog(false);
    }, [textValue, textColor, editingTextLayerId, setLayersTracked, printArea]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        addLayerFromUrl(dataUrl, "upload", file.name.split(".")[0]);
      };
      reader.readAsDataURL(file);
      e.target.value = ""; // allow re-uploading the same file
    };

    const deleteSelected = () => {
      if (!selectedLayerId) return;
      setLayersTracked((prev) => prev.filter((l) => l.id !== selectedLayerId));
      setSelectedLayerId(null);
    };

    const rotateSelected = () => {
      if (!selectedLayerId) return;
      updateLayer(selectedLayerId, {
        rotation: (layers.find((l) => l.id === selectedLayerId)?.rotation || 0) - 90,
      });
    };

    const saveDesign = () => onSave(layers, product.id);

    const visibleLayerEls = layers.map((layer) => (
      <DesignCanvasLayer
        key={layer.id}
        layer={layer}
        onSelect={() => setSelectedLayerId(layer.id)}
        onUpdate={(changes) => updateLayer(layer.id, changes)}
        onEditText={layer.type === "text" ? () => openTextDialog(layer.id) : undefined}
        interactive={mode === "design"}
      />
    ));

    return (
      <div className="space-y-4">
        {/* Mode + View toggles */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1 bg-card/60 rounded-full p-1 border border-latte/20">
            <button
              onClick={() => setMode("design")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                mode === "design"
                  ? "bg-forest text-sand shadow-sm"
                  : "text-mocha hover:text-espresso"
              }`}
            >
              <PenTool size={13} /> Design
            </button>
            <button
              onClick={() => {
                setMode("preview");
                setSelectedLayerId(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                mode === "preview"
                  ? "bg-forest text-sand shadow-sm"
                  : "text-mocha hover:text-espresso"
              }`}
            >
              <Shirt size={13} /> Preview
            </button>
          </div>

          {product.mockupImages.back && (
            <div className="flex gap-2">
              {(["front", "back"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => onViewChange(v)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition ${
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
        </div>

        {/* Canvas — full virtual work area, always entirely visible */}
        <div
          ref={containerRef}
          className="relative rounded-xl overflow-hidden border border-latte/30 shadow-soft bg-white w-full"
          style={{ aspectRatio: "1 / 1" }}
        >
          <Stage
            ref={stageRef}
            width={displaySize}
            height={displaySize}
            scaleX={stageScale}
            scaleY={stageScale}
            onMouseDown={(e) => {
              // Deselect when clicking the bare stage or the mockup background
              if (e.target === e.target.getStage()) setSelectedLayerId(null);
            }}
            onTouchStart={(e) => {
              if (e.target === e.target.getStage()) setSelectedLayerId(null);
            }}
          >
            <Layer>
              {/* White base */}
              <Rect x={0} y={0} width={VIRTUAL} height={VIRTUAL} fill="#FFFFFF" listening={false} />

              {/* Product Mockup */}
              {mockupImage ? (
                <KonvaImage
                  image={mockupImage}
                  x={mockupFit.x}
                  y={mockupFit.y}
                  width={mockupFit.w}
                  height={mockupFit.h}
                  listening={false}
                />
              ) : (
                <Rect
                  x={20}
                  y={20}
                  width={VIRTUAL - 40}
                  height={VIRTUAL - 40}
                  fill="#F5F3EF"
                  cornerRadius={12}
                  listening={false}
                />
              )}

              {mode === "design" ? (
                <>
                  {/* Print-area guide */}
                  <Rect
                    x={printArea.x}
                    y={printArea.y}
                    width={printArea.w}
                    height={printArea.h}
                    stroke="#0e7a5f"
                    strokeWidth={2}
                    dash={[12, 8]}
                    cornerRadius={6}
                    listening={false}
                    opacity={0.65}
                  />
                  {visibleLayerEls}
                  <Transformer
                    ref={transformerRef}
                    rotateEnabled
                    keepRatio
                    enabledAnchors={[
                      "top-left",
                      "top-right",
                      "bottom-left",
                      "bottom-right",
                      "middle-left",
                      "middle-right",
                    ]}
                    anchorSize={Math.max(10, 14 / stageScale)}
                    rotateAnchorOffset={Math.max(30, 36 / stageScale)}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (newBox.width < 14 || newBox.height < 14) return oldBox;
                      return newBox;
                    }}
                  />
                </>
              ) : (
                // PREVIEW: design clipped to the printable area — what you'll get
                <Group
                  clipFunc={(ctx) => {
                    ctx.beginPath();
                    ctx.rect(printArea.x, printArea.y, printArea.w, printArea.h);
                    ctx.closePath();
                  }}
                >
                  {visibleLayerEls}
                </Group>
              )}
            </Layer>
          </Stage>

          {/* Hints */}
          {mode === "design" && layers.length === 0 && (
            <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
              <div className="bg-white/85 backdrop-blur px-4 py-2 rounded-full text-xs text-mocha border border-latte/20 shadow-sm">
                {mockupImage
                  ? "Pick a design, upload your own, or generate with AI — the dashed box is the print area"
                  : `${product.name} — upload or generate a design to get started`}
              </div>
            </div>
          )}
          {mode === "preview" && (
            <div className="absolute top-3 left-3 pointer-events-none">
              <div className="bg-forest/90 text-sand px-3 py-1 rounded-full text-[11px] font-medium shadow-sm">
                Preview — how your print will look
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 flex-wrap items-center">
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
            onClick={() => openTextDialog()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition"
          >
            <Type size={14} /> Text
          </button>

          {selectedLayerId && mode === "design" && (
            <>
              <button
                onClick={rotateSelected}
                className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition"
                title="Rotate 90°"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => duplicateLayer(selectedLayerId)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-card border border-latte/30 hover:border-forest/50 rounded-lg text-sm transition"
                title="Duplicate"
              >
                <Copy size={14} />
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
            <button onClick={saveDesign} className="btn-accent text-sm px-5 py-2 ml-auto">
              Save Design
            </button>
          )}
        </div>

        {/* Layers List */}
        {layers.length > 0 && (
          <div className="space-y-1.5 bg-card/50 rounded-lg p-3 border border-latte/20">
            <div className="text-xs font-medium text-mocha uppercase tracking-wider mb-2">
              Layers ({layers.length}) — drag on canvas to reposition · top of list = back
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {layers.map((layer, idx) => (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs cursor-pointer transition ${
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
                  {layer.type === "text" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openTextDialog(layer.id);
                      }}
                      className="text-mocha hover:text-espresso shrink-0"
                      title="Edit text"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateLayer(layer.id);
                    }}
                    className="text-mocha hover:text-espresso shrink-0"
                    title="Duplicate layer"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, -1);
                    }}
                    disabled={idx === 0}
                    className="text-mocha hover:text-espresso shrink-0 disabled:opacity-30"
                    title="Move back"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer.id, 1);
                    }}
                    disabled={idx === layers.length - 1}
                    className="text-mocha hover:text-espresso shrink-0 disabled:opacity-30"
                    title="Move forward"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayersTracked((prev) => prev.filter((l) => l.id !== layer.id));
                      if (selectedLayerId === layer.id) setSelectedLayerId(null);
                    }}
                    className="text-mocha hover:text-red-500 shrink-0"
                    title="Delete layer"
                  >
                    <Trash2 size={12} />
                  </button>
                  <span className="text-[10px] uppercase tracking-wider text-mocha/70 ml-1">
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
              <h3 className="text-lg font-heading font-semibold mb-4">
                {editingTextLayerId ? "Edit Text" : "Add Custom Text"}
              </h3>
              <input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Your custom text..."
                className="w-full px-4 py-3 border border-latte rounded-lg mb-4 text-espresso bg-background"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && commitText()}
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
                    setEditingTextLayerId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-card border border-latte/30 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={commitText}
                  disabled={!textValue.trim()}
                  className="flex-1 btn-accent disabled:opacity-50"
                >
                  {editingTextLayerId ? "Update Text" : "Add Text"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
