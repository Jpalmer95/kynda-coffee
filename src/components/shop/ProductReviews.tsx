"use client";

import { useState, useEffect } from "react";
import { Star, ThumbsUp, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Review {
  id: string;
  name: string;
  rating: number;
  title?: string;
  body: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

interface ReviewStats {
  average_rating: number;
  total_count: number;
  distribution: { star: number; count: number }[];
}

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    fetch(`/api/reviews?product_id=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews ?? []);
        setStats({
          average_rating: data.average_rating ?? 0,
          total_count: data.total_count ?? 0,
          distribution: data.distribution ?? [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !body) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, name, email, rating, title, body }),
      });

      const data = await res.json();
      if (data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setStats((prev) =>
          prev
            ? {
                ...prev,
                total_count: prev.total_count + 1,
                average_rating: Number(
                  (
                    (prev.average_rating * prev.total_count + rating) /
                    (prev.total_count + 1)
                  ).toFixed(1)
                ),
              }
            : null
        );
        toast("Review submitted!", "success");
        setShowForm(false);
        setName("");
        setEmail("");
        setRating(5);
        setTitle("");
        setBody("");
      } else {
        toast(data.error || "Failed to submit review", "error");
      }
    } catch {
      toast("Failed to submit review", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-10 sm:mt-14">
        <div className="h-6 w-32 animate-pulse rounded bg-latte/20" />
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-latte/20 bg-white p-4">
              <div className="h-4 w-24 rounded bg-latte/20" />
              <div className="mt-2 h-3 w-full rounded bg-latte/20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 sm:mt-14">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-espresso">
            Reviews
          </h2>
          {stats && stats.total_count > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(stats.average_rating)
                        ? "fill-rust text-rust"
                        : "text-latte"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-espresso">
                {stats.average_rating} out of 5
              </span>
              <span className="text-sm text-mocha">
                ({stats.total_count} review{stats.total_count !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-secondary text-sm"
        >
          <MessageSquare className="mr-1.5 h-4 w-4" />
          Write a Review
        </button>
      </div>

      {/* Rating distribution */}
      {stats && stats.total_count > 0 && (
        <div className="mt-6 rounded-xl border border-latte/20 bg-white p-4 sm:p-5">
          <div className="space-y-1.5">
            {stats.distribution.map(({ star, count }) => {
              const pct = stats.total_count > 0 ? (count / stats.total_count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-3 text-mocha">{star}</span>
                  <Star className="h-3.5 w-3.5 text-rust" />
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-latte/20">
                    <div
                      className="h-full rounded-full bg-rust transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-mocha">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl border border-latte/20 bg-white p-4 sm:p-5 space-y-4"
        >
          <h3 className="font-heading text-lg font-semibold text-espresso">
            Write a Review
          </h3>

          {/* Star rating */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-espresso">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="rounded p-0.5 transition-transform hover:scale-110"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= rating
                        ? "fill-rust text-rust"
                        : "text-latte"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-espresso">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">
              Headline
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's most important to know?"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-espresso">
              Review <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={4}
              className="input-field resize-none text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      <div className="mt-6 space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-latte/20 bg-white py-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-latte" />
            <p className="mt-3 text-mocha">No reviews yet</p>
            <p className="mt-1 text-sm text-mocha/70">
              Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-latte/20 bg-white p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${
                            star <= review.rating
                              ? "fill-rust text-rust"
                              : "text-latte"
                          }`}
                        />
                      ))}
                    </div>
                    {review.is_verified_purchase && (
                      <span className="rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-medium text-sage">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="mt-1.5 font-medium text-espresso">
                      {review.title}
                    </h4>
                  )}
                </div>
                <span className="text-xs text-mocha/60">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="mt-2 text-sm text-mocha leading-relaxed">
                {review.body}
              </p>

              <div className="mt-3 flex items-center gap-4">
                <span className="text-xs text-mocha/60">
                  By {review.name}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
