"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Palette, Eye, EyeOff, Sparkles, Trash2 } from "lucide-react";

interface DesignItem {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  is_public: boolean;
  likes: number;
  created_at: string;
  image_url: string;
}

// Placeholder designs — in production, fetch from /api/admin/designs
const PLACEHOLDER_DESIGNS: DesignItem[] = [
  {
    id: "1",
    name: "Sunset Coffee",
    status: "published",
    is_public: true,
    likes: 42,
    created_at: "2025-04-15T10:00:00Z",
    image_url: "/images/coffee-beans.jpg",
  },
  {
    id: "2",
    name: "Hill Country Vibes",
    status: "draft",
    is_public: false,
    likes: 0,
    created_at: "2025-04-18T14:30:00Z",
    image_url: "/images/ceramic-mug.jpg",
  },
];

export default function AdminDesignsPage() {
  const [designs, setDesigns] = useState<DesignItem[]>(PLACEHOLDER_DESIGNS);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const filtered = designs.filter((d) =>
    filter === "all" ? true : d.status === filter
  );

  function toggleVisibility(id: string) {
    setDesigns((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_public: !d.is_public } : d))
    );
  }

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-lg p-2 text-mocha transition-colors hover:bg-latte/20"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-espresso">
              AI Designs
            </h1>
            <p className="text-sm text-mocha">Review and manage generated designs</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? "bg-espresso text-cream"
                  : "bg-latte/20 text-mocha hover:bg-latte/40"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Designs Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-latte/20 bg-white py-16 text-center">
            <Palette className="mx-auto h-12 w-12 text-latte" aria-hidden="true" />
            <p className="mt-4 text-lg text-mocha">No designs found</p>
            <Link href="/studio" className="btn-primary mt-4 inline-flex">
              <Sparkles className="mr-2 h-4 w-4" />
              Go to Design Studio
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((design) => (
              <div
                key={design.id}
                className="rounded-xl border border-latte/20 bg-white overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="aspect-square bg-gradient-to-br from-stone-200 to-stone-300">
                  <img
                    src={design.image_url}
                    alt={design.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm text-espresso">{design.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                      design.status === "published"
                        ? "bg-sage/20 text-sage"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {design.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => toggleVisibility(design.id)}
                      className="rounded-lg p-1.5 text-mocha transition-colors hover:bg-latte/20"
                      aria-label={design.is_public ? "Hide design" : "Publish design"}
                    >
                      {design.is_public ? (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <span className="text-xs text-mocha">{design.likes} likes</span>
                    <button
                      className="ml-auto rounded-lg p-1.5 text-mocha transition-colors hover:bg-rust/10 hover:text-rust"
                      aria-label="Delete design"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
