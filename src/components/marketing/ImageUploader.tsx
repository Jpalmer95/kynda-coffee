"use client";

// Drag-and-drop image uploader for marketing images
// Uploads to /api/marketing/images/upload and returns the stored path

import { useState, useRef, useCallback } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  name: string;
  path: string;
  thumbnail_path: string;
  url: string;
  thumbnail_url: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

interface ImageUploaderProps {
  onUploadComplete: (image: UploadedImage) => void;
  maxFiles?: number;
}

export default function ImageUploader({ onUploadComplete, maxFiles = 10 }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      setPreview(URL.createObjectURL(file));

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/marketing/images/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        onUploadComplete(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          dragActive
            ? "border-forest bg-forest/5 scale-[1.01]"
            : "border-border/50 hover:border-forest/50 hover:bg-muted/20",
          uploading && "opacity-70 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {preview && !uploading ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={preview}
              alt="Preview"
              className="max-h-32 rounded-lg shadow-sm"
            />
            <div className="flex items-center gap-2 text-sm text-forest">
              <CheckCircle2 className="h-4 w-4" />
              Uploaded successfully
            </div>
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-forest animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {dragActive ? "Drop image here" : "Drag & drop an image"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse · JPEG, PNG, WebP, GIF · max 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
