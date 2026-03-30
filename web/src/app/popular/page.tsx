"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getPopular, type TweetData } from "@/lib/api";
import { TweetCard } from "@/components/tweet-card";
import { TweetSkeleton } from "@/components/loading-skeleton";

export default function PopularPage() {
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getPopular(30);
        if (data.ok) {
          setTweets(data.tweets);
        } else {
          setError(data.error ?? "Failed to load");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Popular</h1>
        <p className="mt-1 text-sm text-text-muted">
          Most-liked tweets across all cached accounts
        </p>
      </div>

      {loading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <TweetSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-error/20 bg-error/5 p-6 text-center">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="rounded-xl border border-border overflow-hidden">
            {tweets.map((tweet, i) => (
              <TweetCard key={tweet.id} tweet={tweet} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
