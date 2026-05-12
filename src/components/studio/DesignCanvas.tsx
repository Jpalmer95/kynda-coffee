"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import { useImage } from 'react-konva-utils';
import { Trash2, RotateCw, Move, Scale, Plus, Upload } from 'lucide-react';

export interface DesignLayer {
  id: string;
  type: 'generated' | 'sticker' | 'upload';
  url: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

interface Props {
  productMockup: string;
  initialDesign?: { url: string; prompt: string } | null;
  onLayersChange: (layers: DesignLayer[]) => void;
  onSave: (layers: DesignLayer[]) => void;
}

export function DesignCanvas({ productMockup, initialDesign, onLayersChange, onSave }: Props) {
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageSize] = useState({ width: 640, height: 640 });
  
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [mockupImage, status] = useImage(productMockup);

  // Load initial design when prop changes
  useEffect(() => {
    if (initialDesign && layers.length === 0) {
      const firstLayer: DesignLayer = {
        id: 'base',
        type: 'generated',
        url: initialDesign.url,
        x: 0.5,
        y: 0.5,
        scale: 0.65,
        rotation: 0,
        opacity: 1,
      };
      setLayers([firstLayer]);
      onLayersChange([firstLayer]);
    }
  }, [initialDesign]);

  const updateLayers = (newLayers: DesignLayer[]) => {
    setLayers(newLayers);
    onLayersChange(newLayers);
  };

  const addLayer = (url: string, type: DesignLayer['type']) => {
    const layer: DesignLayer = {
      id: `l_${Date.now()}`,
      type,
      url,
      x: 0.5,
      y: 0.5,
      scale: 0.5,
      rotation: 0,
      opacity: 1,
    };
    const updated = [...layers, layer];
    updateLayers(updated);
    setSelectedId(layer.id);
  };

  const updateLayer = (id: string, patch: Partial<DesignLayer>) => {
    const updated = layers.map(l => l.id === id ? { ...l, ...patch } : l);
    updateLayers(updated);
  };

  const deleteLayer = (id: string) => {
    const updated = layers.filter(l => l.id !== id);
    updateLayers(updated);
    if (selectedId === id) setSelectedId(null);
  };

  // Keyboard delete
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        deleteLayer(selectedId);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId]);

  // Sync transformer
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr || !stageRef.current) return;

    const stage = stageRef.current;
    const selectedNode = stage.findOne(`#${selectedId}`);
    if (selectedNode) {
      tr.nodes([selectedNode as Konva.Node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, layers]);

  const handleSelect = (id: string) => setSelectedId(id);

  return (
    <div className="relative bg-white rounded-3xl p-4 shadow-xl border border-gray-200">
      <div className="flex gap-2 mb-4 items-center justify-between">
        <div className="font-medium flex items-center gap-2 text-sm text-gray-600">
          <Move className="size-4" /> Drag, scale, rotate freeform
        </div>
        <button 
          onClick={() => onSave(layers)} 
          className="px-4 py-1.5 rounded-full bg-surface text-sand text-sm hover:bg-black"
        >
          Save Design
        </button>
      </div>

      {/* Canvas */}
      <div className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden rounded-2xl border border-gray-200" 
           style={{ boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}>
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          ref={stageRef}
          onPointerDown={(e) => {
            if (e.target === stageRef.current) setSelectedId(null);
          }}
        >
          <Layer>
            {/* Mockup background */}
            {mockupImage && (
              <KonvaImage
                image={mockupImage}
                width={stageSize.width}
                height={stageSize.height}
              />
            )}
          </Layer>

          <Layer>
            {layers.map((layer, index) => (
              <React.Fragment key={layer.id}>
                <KonvaImage
                  id={layer.id}
                  image={useImage(layer.url)[0]}
                  x={layer.x * stageSize.width}
                  y={layer.y * stageSize.height}
                  offsetX={0}
                  offsetY={0}
                  scaleX={layer.scale}
                  scaleY={layer.scale}
                  rotation={layer.rotation}
                  opacity={layer.opacity}
                  draggable
                  onClick={() => handleSelect(layer.id)}
                  onTap={() => handleSelect(layer.id)}
                  onDragEnd={(e) => {
                    updateLayer(layer.id, {
                      x: e.target.x() / stageSize.width,
                      y: e.target.y() / stageSize.height,
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    updateLayer(layer.id, {
                      x: node.x() / stageSize.width,
                      y: node.y() / stageSize.height,
                      scale: node.scaleX(),
                      rotation: node.rotation(),
                    });
                  }}
                />
                {selectedId === layer.id && (
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => newBox}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                    rotateEnabled
                  />
                )}
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap gap-3">
        <button 
          onClick={() => { /* trigger file upload */ }}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-white transition"
        >
          <Upload className="size-4" /> Upload Sticker / Image
        </button>
        
        <button 
          onClick={() => {
            if (selectedId) deleteLayer(selectedId);
          }}
          disabled={!selectedId}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-40 hover:bg-red-50"
        >
          <Trash2 className="size-4 text-red-600" /> Delete Selected
        </button>

        <button 
          onClick={() => {
            const selected = layers.find(l => l.id === selectedId);
            if (selected) updateLayer(selectedId!, { rotation: selected.rotation + 15 });
          }}
          disabled={!selectedId}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-40"
        >
          <RotateCw className="size-4" /> Rotate 15°
        </button>
        
        <div className="ml-auto text-xs text-right text-gray-500 self-center">
          {layers.length} layer{layers.length !== 1 ? 's' : ''} • Press DEL to remove
        </div>
      </div>
    </div>
  );
}
