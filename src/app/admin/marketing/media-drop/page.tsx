"use client";

// /admin/marketing/media-drop — Raw media ingestion hub.
// Team drops photos AND videos here. Photos go to the existing image pipeline;
// videos are stored for the shorts processing pipeline. Everything organizes
// by date and is ready for content-drop → approval → publish.

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface UploadedFile {
  name: string;
  type: "image" | "video";
  status: "uploading" | "done" | "error";
  url?: string;
  error?: string;
}

export default function MediaDropPage() {
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
          if (isVideo) {
            // Upload video to marketing-videos bucket
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/marketing/media/upload", {
              method: "POST",
              body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");

            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === i ? { ...u, status: "done", url: data.url } : u
              )
            );
          } else {
            // Upload image via existing pipeline
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/marketing/images/upload", {
              method: "POST",
              body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");

            setUploads((prev) =>
              prev.map((u, idx) =>
                idx === i ? { ...u, status: "done", url: data.url } : u
              )
            );
          }
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
    },
    [toast]
  );

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

  function clearUploads() {
    setUploads([]);
  }

  const completedImages = uploads.filter((u) => u.type === "image" && u.status === "done");
  const completedVideos = uploads.filter((u) => u.type === "video" && u.status === "done");

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
            className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition ${
              dragging
                ? "border-forest bg-forest/5"
                : "border-latte/30 bg-card hover:border-forest/40 hover:bg-forest/5"
            }`}
          >
            <Upload className={`mb-3 h-12 w-12 ${dragging ? "text-forest" : "text-mocha"}`} />
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
                <h3 className="text-sm font-medium text-espresso">Uploads ({uploads.length})</h3>
                <button onClick={clearUploads} className="text-xs text-mocha hover:text-espresso">
                  Clear
                </button>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {uploads.map((u, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-latte/20 bg-card p-2"
                  >
                    {u.type === "image" ? (
                      <FileImage className="h-4 w-4 shrink-0 text-sage" />
                    ) : (
                      <FileVideo className="h-4 w-4 shrink-0 text-clay" />
                    )}
                    <span className="flex-1 truncate text-sm text-espresso">{u.name}</span>
                    {u.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-mocha" />}
                    {u.status === "done" && <CheckCircle className="h-4 w-4 text-forest" />}
                    {u.status === "error" && <X className="h-4 w-4 text-red-600" />}
                    {u.status === "error" && u.error && (
                      <span className="text-xs text-red-600">{u.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="space-y-4">
          {completedImages.length > 0 && (
            <div className="rounded-2xl border border-forest/20 bg-forest/5 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-espresso">
                <Sparkles className="h-4 w-4 text-forest" /> {completedImages.length} image(s) ready
              </h3>
              <p className="mb-3 text-xs text-mocha">
                Turn these images into platform-specific social posts. The content-drop pipeline will
                generate captions, hashtags, and draft posts for your approval.
              </p>
              <Link
                href="/admin/marketing/content-drop"
                className="inline-flex items-center gap-1.5 rounded-lg bg-forest/10 px-3 py-2 text-sm font-medium text-forest transition hover:bg-forest/20"
              >
                <Sparkles className="h-4 w-4" /> Go to Content Drop
              </Link>
            </div>
          )}

          {completedVideos.length > 0 && (
            <div className="rounded-2xl border border-clay/20 bg-clay/5 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-espresso">
                <FileVideo className="h-4 w-4 text-clay" /> {completedVideos.length} video(s) uploaded
              </h3>
              <p className="text-xs text-mocha">
                Videos are stored and ready for the shorts processing pipeline (coming soon — will auto-generate
                TikTok, Reels, and YouTube Shorts variants from your raw footage).
              </p>
              <div className="mt-2 space-y-1">
                {completedVideos.map((v, i) => (
                  <div key={i} className="truncate text-xs text-mocha">
                    ✓ {v.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploads.length === 0 && (
            <div className="rounded-2xl border border-latte/20 bg-card p-6 text-center">
              <FolderOpen className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm text-mocha">
                Upload media to see next steps here.
                <br />
                Images → Content Drop → Approval → Publish
                <br />
                Videos → Shorts Pipeline (coming soon)
              </p>
            </div>
          )}

          {/* Pipeline Overview */}
          <div className="rounded-2xl border border-latte/20 bg-card p-4">
            <h3 className="mb-2 font-heading text-sm font-semibold text-espresso">How it works</h3>
            <ol className="space-y-2 text-xs text-mocha">
              <li><strong className="text-espresso">1. Capture</strong> — You and your team take photos and videos at the shop</li>
              <li><strong className="text-espresso">2. Drop</strong> — Upload raw media here (this page)</li>
              <li><strong className="text-espresso">3. Generate</strong> — Content Drop turns images into platform-specific drafts</li>
              <li><strong className="text-espresso">4. Approve</strong> — You review drafts in the Approval Queue</li>
              <li><strong className="text-espresso">5. Publish</strong> — Approved posts auto-publish on schedule</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
