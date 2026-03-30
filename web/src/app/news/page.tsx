"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getNews, type TweetData } from "@/lib/api";
import { TweetCard } from "@/components/tweet-card";
import { TweetSkeleton } from "@/components/loading-skeleton";

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "News", value: "news" },
  { label: "Tech", value: "tech" },
];

export default function NewsPage() {
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getNews(category);
        if (data.ok) {
          setTweets(data.tweets);
        } else {
          setError(data.error ?? "Failed to load news");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load news");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">News Feed</h1>
        <p className="mt-1 text-sm text-text-muted">
          Latest from curated news and tech accounts
        </p>
      </div>

      {/* Category tabs */}
      <div className="mb-4 flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              category === cat.value
                ? "bg-accent text-white"
                : "border border-border text-text-secondary hover:bg-bg-card-hover"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <TweetSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-error/20 bg-error/5 p-6 text-center">
          <p className="text-sm text-error">{error}</p>
          <button
            onClick={() => setCategory(category)}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tweet feed */}
      {!loading && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {tweets.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              {tweets.map((tweet, i) => (
                <TweetCard key={tweet.id} tweet={tweet} index={i} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-text-muted">
              No news tweets available. Try again in a moment.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
