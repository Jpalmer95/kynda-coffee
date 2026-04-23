"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Heart, Loader2, User } from "lucide-react";

interface Design {
  id: string;
  name: string;
  image_url: string;
  product_type: string;
  style: string;
  likes_count: number;
  profiles?: { full_name: string };
}

export default function GalleryPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/designs/save?public=true")
      .then((r) => r.json())
      .then((data) => {
        setDesigns(data.designs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="text-center mb-8 sm:mb-12">
          <Sparkles className="mx-auto h-10 w-10 text-rust" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-espresso">
            Community Gallery
          </h1>
          <p className="mt-3 text-base text-mocha max-w-xl mx-auto">
            Designs created by the Kynda community using our AI Design Studio.
            Click any design to start your own creation.
          </p>
          <div className="mt-6">
            <Link href="/studio" className="btn-primary">
              <Sparkles className="mr-2 h-4 w-4" />
              Create Your Own
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rust" />
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-latte/20 bg-white">
            <Sparkles className="mx-auto h-12 w-12 text-latte" />
            <p className="mt-4 text-mocha">No public designs yet</p>
            <p className="text-sm text-mocha/70">Be the first to share your creation!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {designs.map((design) => (
              <div
                key={design.id}
                className="group rounded-2xl border border-latte/20 bg-white overflow-hidden transition-all hover:shadow-lg card-lift"
              >
                <div className="aspect-square bg-gradient-to-br from-amber-800 to-stone-900 relative">
                  {design.image_url ? (
                    <img
                      src={design.image_url}
                      alt={design.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl">
                      🎨
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-espresso truncate">{design.name}</h3>
                  <div className="mt-1 flex items-center justify-between text-xs text-mocha">
                    <span className="capitalize">{design.product_type}</span>
                    <span className="capitalize">{design.style}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-mocha">
                      <User className="h-3 w-3" />
                      {design.profiles?.full_name || "Anonymous"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-mocha">
                      <Heart className="h-3 w-3" />
                      {design.likes_count}
                    </div>
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
