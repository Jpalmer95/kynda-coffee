"use client";

// /admin/marketing/images — Marketing image library
// Upload, process for all platforms, view variants, generate alt-text

import { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  Wand2,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import ImageUploader, { UploadedImage } from "@/components/marketing/ImageUploader";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MarketingImage {
  name: string;
  path: string;
  url: string;
  thumbnail_url: string;
  created_at: string;
  has_variants: boolean;
  variants: Array<{
    presetKey: string;
    path: string;
    url: string;
  }>;
}

interface AltTextResult {
  alt_text: string;
  descriptive_caption: string;
  subjects: string[];
  colors: string[];
  setting: string;
  suggested_hashtags: string[];
  brightness: string;
  quality_notes: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MarketingImagesPage() {
  const { toast } = useToast();
  const [images, setImages] = useState<MarketingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [altTexts, setAltTexts] = useState<Record<string, AltTextResult>>({});

  // ─── Load images ─────────────────────────────────────────────────────
  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/images/list");
      const data = await res.json();
      if (res.ok) {
        setImages(data.images || []);
      }
    } catch {
      toast("Failed to load images", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // ─── Handle upload completion ────────────────────────────────────────
  function handleUploadComplete(image: UploadedImage) {
    toast(`Uploaded: ${image.name}`, "success");
    // Add to list and reload
    loadImages();
  }

  // ─── Process image for all platforms ─────────────────────────────────
  async function handleProcess(imagePath: string) {
    setProcessing(imagePath);
    try {
      const res = await fetch("/api/marketing/images/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: imagePath, watermark: true }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Processing failed");
      }

      toast(`Generated ${data.variants_count} variants`, "success");
      loadImages(); // Reload to show variants
    } catch (err) {
      toast(err instanceof Error ? err.message : "Processing failed", "error");
    } finally {
      setProcessing(null);
    }
  }

  // ─── Generate alt-text with Claude Vision ────────────────────────────
  async function handleAltText(imageUrl: string, imagePath: string) {
    setAnalyzing(imagePath);
    try {
      const res = await fetch("/api/marketing/images/alt-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAltTexts((prev) => ({ ...prev, [imagePath]: data.analysis }));
      toast("Alt-text generated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Analysis failed", "error");
    } finally {
      setAnalyzing(null);
    }
  }

  // ─── Copy to clipboard ───────────────────────────────────────────────
  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast(`${label} copied`, "success");
  }

  // ─── Delete image ───────────────────────────────────────────────────
  async function handleDelete(imagePath: string) {
    if (!confirm("Delete this image and all its variants?")) return;
    try {
      const res = await fetch(`/api/marketing/images?path=${encodeURIComponent(imagePath)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast("Image deleted", "success");
      loadImages();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  // ─── Platform label helper ──────────────────────────────────────────
  const PLATFORM_LABELS: Record<string, string> = {
    "ig-square": "IG Square 1080×1080",
    "ig-portrait": "IG Portrait 1080×1350",
    "ig-story": "IG Story 1080×1920",
    "fb-post": "FB Post 1200×630",
    "fb-cover": "FB Cover 820×312",
    "x-post": "X Post 1200×675",
    tiktok: "TikTok 1080×1920",
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-forest" />
            Marketing Images
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload, process for all platforms, and generate alt-text with AI.
          </p>
        </div>
        <button
          onClick={loadImages}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/40 bg-card hover:bg-muted/30 text-sm transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Upload area */}
      <div className="mb-8">
        <ImageUploader onUploadComplete={handleUploadComplete} />
      </div>

      {/* Image grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-forest animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No images yet. Upload your first marketing image above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.path}
              className="rounded-xl border border-border/40 bg-card overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[4/3] bg-muted/30">
                <img
                  src={image.thumbnail_url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                {image.has_variants && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 bg-forest/90 text-sand text-xs px-2 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    {image.variants.length} variants
                  </span>
                )}
              </div>

              {/* Info + actions */}
              <div className="p-3 space-y-3">
                <p className="text-sm font-medium text-foreground truncate">
                  {image.name}
                </p>

                <div className="flex gap-2">
                  {/* Process button */}
                  <button
                    onClick={() => handleProcess(image.path)}
                    disabled={processing === image.path}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      image.has_variants
                        ? "bg-muted/50 text-muted-foreground hover:bg-muted"
                        : "bg-forest/10 text-forest hover:bg-forest/20"
                    )}
                  >
                    {processing === image.path ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    {processing === image.path
                      ? "Processing…"
                      : image.has_variants
                      ? "Re-process"
                      : "Process"}
                  </button>

                  {/* Alt-text button */}
                  <button
                    onClick={() => handleAltText(image.url, image.path)}
                    disabled={analyzing === image.path}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-secondary/10 text-foreground hover:bg-secondary/20 transition-colors"
                  >
                    {analyzing === image.path ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Alt-text
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(image.path)}
                    className="flex items-center justify-center px-2 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Expand variants */}
                  {image.has_variants && (
                    <button
                      onClick={() =>
                        setExpandedImage(
                          expandedImage === image.path ? null : image.path
                        )
                      }
                      className="flex items-center justify-center px-2 py-2 rounded-lg text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      {expandedImage === image.path ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Alt-text result */}
                {altTexts[image.path] && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Alt Text
                      </p>
                      <button
                        onClick={() =>
                          copyText(altTexts[image.path].alt_text, "Alt text")
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">
                      {altTexts[image.path].alt_text}
                    </p>

                    {!altTexts[image.path].descriptive_caption ? null : (
                      <>
                        <p className="text-xs font-medium text-muted-foreground mt-2">
                          Caption
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">
                          {altTexts[image.path].descriptive_caption}
                        </p>
                      </>
                    )}

                    {altTexts[image.path].suggested_hashtags?.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-muted-foreground mt-2">
                          Hashtags
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {altTexts[image.path].suggested_hashtags.map(
                            (tag, i) => (
                              <span
                                key={i}
                                onClick={() => copyText(tag, "Hashtag")}
                                className="text-xs bg-forest/10 text-forest px-1.5 py-0.5 rounded cursor-pointer hover:bg-forest/20"
                              >
                                {tag}
                              </span>
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Variants list */}
                {expandedImage === image.path && image.has_variants && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Platform Variants
                    </p>
                    {image.variants.map((v) => (
                      <div
                        key={v.presetKey}
                        className="flex items-center justify-between gap-2 text-xs bg-muted/20 rounded-lg px-2 py-1.5"
                      >
                        <span className="text-foreground truncate flex-1">
                          {PLATFORM_LABELS[v.presetKey] || v.presetKey}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyText(v.url, "URL")}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Copy URL"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Open in new tab"
                          >
                            <Eye className="h-3 w-3" />
                          </a>
                          <a
                            href={v.url}
                            download
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
