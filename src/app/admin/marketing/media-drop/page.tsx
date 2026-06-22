"use client";

// /admin/marketing/media-drop — Raw media ingestion hub.
// Team drops photos AND videos here. Photos → image pipeline; videos → shorts processing.
// Shows recent uploads gallery + one-click shorts generation.

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileImage,
  FileVideo,
  Loader2,
  CheckCircle,
  X,
  Sparkles,
  FolderOpen,
  Zap,
  Play,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface UploadedFile {
  name: string;
  type: "image" | "video";
  status: "uploading" | "done" | "error";
  url?: string;
  error?: string;
}

interface MediaItem {
  name: string;
  url: string;
  type: "image" | "video";
  size: number | null;
  updated_at: string | null;
}

export default function MediaDropPage() {
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [processingShorts, setProcessingShorts] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/marketing/media/list", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setMedia(data.media || []);
      }
    } catch {
      // silent fail
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      setUploading(true);
      const newUploads: UploadedFile[] = fileArr.map((f) => ({
        name: f.name,
        type: f.type.startsWith("video/") ? "video" : "image",
        status: "uploading" as const,
      }));
      setUploads((prev) => [...newUploads, ...prev]);

      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        const isVideo = file.type.startsWith("video/");

        try {
          const formData = new FormData();
          formData.append("file", file);
          const endpoint = isVideo ? "/api/marketing/media/upload" : "/api/marketing/images/upload";
          const res = await fetch(endpoint, { method: "POST", body: formData });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed");

          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === i ? { ...u, status: "done", url: data.url } : u
            )
          );
        } catch (e) {
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === i
                ? { ...u, status: "error", error: e instanceof Error ? e.message : "Failed" }
                : u
            )
          );
        }
      }

      setUploading(false);
      toast("Upload complete", "success");
      await loadMedia(); // refresh gallery
    },
    [toast, loadMedia]
  );

  async function processShorts(videoUrl: string, filename: string) {
    setProcessingShorts(filename);
    try {
      const res = await fetch("/api/marketing/media/process-shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: videoUrl,
          sourceFilename: filename,
          title: filename.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast(data.message || "Shorts created — check approval queue", "success");
      } else {
        toast(data.error || data.message || "Processing failed", "error");
      }
    } catch {
      toast("Failed to process shorts", "error");
    } finally {
      setProcessingShorts(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  const videos = media.filter((m) => m.type === "video");
  const images = media.filter((m) => m.type === "image");

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/marketing" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to marketing">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <FolderOpen className="h-7 w-7 text-forest" /> Media Drop
          </h1>
          <p className="text-sm text-mocha">
            Drop raw photos and videos. We&apos;ll organize them and prep for the content pipeline.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Zone */}
        <div>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition ${
              dragging
                ? "border-forest bg-forest/5"
                : "border-latte/30 bg-card hover:border-forest/40 hover:bg-forest/5"
            }`}
          >
            <Upload className={`mb-3 h-10 w-10 ${dragging ? "text-forest" : "text-mocha"}`} />
            <p className="font-heading text-lg font-semibold text-espresso">
              {dragging ? "Drop to upload" : "Drag & drop or click to upload"}
            </p>
            <p className="mt-1 text-sm text-mocha">
              Photos: JPEG, PNG, WebP (max 10MB) · Videos: MP4, MOV, WebM (max 100MB)
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {uploading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-mocha">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </div>
          )}

          {uploads.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-espresso">Recent Uploads ({uploads.length})</h3>
                <button onClick={() => setUploads([])} className="text-xs text-mocha hover:text-espresso">
                  Clear
                </button>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {uploads.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-latte/20 bg-card p-2">
                    {u.type === "image" ? (
                      <FileImage className="h-4 w-4 shrink-0 text-sage" />
                    ) : (
                      <FileVideo className="h-4 w-4 shrink-0 text-clay" />
                    )}
                    <span className="flex-1 truncate text-sm text-espresso">{u.name}</span>
                    {u.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-mocha" />}
                    {u.status === "done" && <CheckCircle className="h-4 w-4 text-forest" />}
                    {u.status === "error" && <X className="h-4 w-4 text-red-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline info */}
          <div className="mt-4 rounded-2xl border border-latte/20 bg-card p-4">
            <h3 className="mb-2 font-heading text-sm font-semibold text-espresso">How it works</h3>
            <ol className="space-y-1.5 text-xs text-mocha">
              <li><strong className="text-espresso">1. Capture</strong> — Take photos and videos at the shop</li>
              <li><strong className="text-espresso">2. Drop</strong> — Upload raw media here</li>
              <li><strong className="text-espresso">3. Generate</strong> — Images → Content Drop · Videos → Shorts</li>
              <li><strong className="text-espresso">4. Approve</strong> — Review drafts in the Approval Queue</li>
              <li><strong className="text-espresso">5. Publish</strong> — Approved posts auto-publish on schedule</li>
            </ol>
          </div>
        </div>

        {/* Gallery */}
        <div>
          {loadingMedia ? (
            <div className="flex items-center justify-center py-16 text-mocha">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading media…
            </div>
          ) : media.length === 0 ? (
            <div className="flex aspect-square max-h-80 items-center justify-center rounded-2xl border border-dashed border-latte/30 bg-card text-center text-mocha">
              <div>
                <FolderOpen className="mx-auto mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">No media uploaded yet. Drop files on the left to get started.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Videos */}
              {videos.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-espresso">
                    <FileVideo className="h-4 w-4 text-clay" /> Videos ({videos.length})
                  </h3>
                  <div className="space-y-2">
                    {videos.map((v) => (
                      <div key={v.name} className="flex items-center gap-3 rounded-xl border border-latte/20 bg-card p-3">
                        <Play className="h-5 w-5 shrink-0 text-clay" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-espresso">{v.name}</p>
                          {v.size && (
                            <p className="text-xs text-mocha">{(v.size / 1024 / 1024).toFixed(1)} MB</p>
                          )}
                        </div>
                        <button
                          onClick={() => processShorts(v.url, v.name)}
                          disabled={processingShorts === v.name}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest transition hover:bg-forest/20 disabled:opacity-60"
                        >
                          {processingShorts === v.name ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                          {processingShorts === v.name ? "Processing…" : "Make Shorts"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {images.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-espresso">
                    <FileImage className="h-4 w-4 text-sage" /> Images ({images.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => (
                      <div key={img.name} className="group relative aspect-square overflow-hidden rounded-lg border border-latte/20">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <Link
                          href={`/admin/marketing/content-drop`}
                          className="absolute inset-0 flex items-center justify-center bg-espresso/0 opacity-0 transition group-hover:bg-espresso/60 group-hover:opacity-100"
                        >
                          <Sparkles className="h-6 w-6 text-cream" />
                        </Link>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-mocha">
                    Hover an image and click to send it to{" "}
                    <Link href="/admin/marketing/content-drop" className="text-forest underline">
                      Content Drop
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
