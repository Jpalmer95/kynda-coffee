"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Upload,
  X,
  ImageIcon,
  Video,
} from "lucide-react";

type Upload = {
  id: string;
  uploaded_by: string;
  uploader_name: string;
  storage_path: string;
  public_url: string;
  media_type: string;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  tags: string[];
  status: string;
  notes: string | null;
  created_at: string;
};

const TAGS = ["product", "event", "shop", "food", "drink", "team", "seasonal"];

export default function TeamMediaPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/media?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load uploads");
      setUploads(data.uploads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of files) {
      try {
        setUploadProgress(`Uploading ${file.name}...`);
        const mediaType = file.type.startsWith("video/") ? "video" : "image";

        // Step 1: create upload record + get signed URL
        const createRes = await fetch("/api/admin/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upload",
            file_name: file.name,
            mime_type: file.type,
            media_type: mediaType,
            file_size_bytes: file.size,
            tags: selectedTags,
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error || "Failed to create upload");

        // Step 2: upload to Supabase Storage via signed URL
        const uploadRes = await fetch(createData.signed_url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error(`Storage upload failed for ${file.name}`);

        // Step 3: confirm upload completed
        await fetch("/api/admin/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            upload_id: createData.upload_id,
            storage_path: createData.storage_path,
            public_url: createData.public_url,
            file_size_bytes: file.size,
          }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      }
    }

    setUploadProgress("");
    setUploading(false);
    setSelectedTags([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await load();
  }

  async function approve(id: string) {
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", upload_id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Approve failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function reject(id: string) {
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", upload_id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Reject failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    }
  }

  async function deleteUpload(id: string) {
    if (!confirm("Delete this upload?")) return;
    try {
      const res = await fetch(`/api/admin/media?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const sizeLabel = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold text-espresso sm:text-3xl">
            <Upload className="h-7 w-7 text-forest" /> Team Media
          </h1>
          <p className="text-sm text-mocha">Upload photos/videos → curate → marketing pipeline</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-bronze/30 bg-bronze/10 p-3 text-sm text-espresso">{error}</div>}

      {/* Upload zone */}
      <div className="mb-6 rounded-2xl border-2 border-dashed border-latte/40 bg-card p-6">
        <div className="text-center">
          <Upload className="mx-auto h-10 w-10 text-mocha/50" />
          <p className="mt-3 text-sm text-mocha">
            {uploading ? uploadProgress : "Drop photos or videos here, or click to select files"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="mt-3 text-sm"
          />
        </div>

        {/* Tag selector */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-mocha">Tag:</span>
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-forest text-white"
                  : "bg-latte/20 text-mocha hover:bg-latte/40"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${
              statusFilter === s ? "border-surface bg-surface text-sand" : "border-latte/40 bg-card text-espresso hover:bg-latte/10"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-mocha">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading media...
        </div>
      ) : uploads.length === 0 ? (
        <div className="rounded-2xl border border-latte/20 bg-card py-16 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-mocha/40" />
          <p className="mt-4 text-mocha">No uploads yet.</p>
          <p className="mt-1 text-sm text-mocha/70">Upload photos or videos to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className={`group relative overflow-hidden rounded-xl border bg-card ${
                upload.status === "approved" ? "border-sage/40" : upload.status === "rejected" ? "border-red-200" : "border-latte/30"
              }`}
            >
              {/* Media preview */}
              <div className="relative aspect-square bg-cream">
                {upload.public_url ? (
                  upload.media_type === "video" ? (
                    <video src={upload.public_url} className="h-full w-full object-cover" controls />
                  ) : (
                    <img src={upload.public_url} alt={upload.file_name ?? ""} className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {upload.media_type === "video" ? <Video className="h-8 w-8 text-mocha/40" /> : <ImageIcon className="h-8 w-8 text-mocha/40" />}
                  </div>
                )}
                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    upload.status === "approved" ? "bg-sage/20 text-sage" :
                    upload.status === "rejected" ? "bg-red-50 text-red-600" :
                    "bg-bronze/15 text-espresso"
                  }`}>
                    {upload.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="truncate text-xs font-medium text-espresso">{upload.file_name ?? "Untitled"}</p>
                <p className="text-xs text-mocha">by {upload.uploader_name} • {sizeLabel(upload.file_size_bytes)}</p>
                {upload.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {upload.tags.map((tag) => (
                      <span key={tag} className="rounded bg-latte/20 px-1.5 py-0.5 text-[10px] text-mocha">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex border-t border-latte/10">
                {upload.status === "pending" && (
                  <>
                    <button
                      onClick={() => approve(upload.id)}
                      className="flex flex-1 items-center justify-center gap-1 py-2 text-xs font-medium text-sage hover:bg-sage/10"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => reject(upload.id)}
                      className="flex flex-1 items-center justify-center gap-1 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteUpload(upload.id)}
                  className="flex items-center justify-center px-3 py-2 text-xs text-mocha hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
