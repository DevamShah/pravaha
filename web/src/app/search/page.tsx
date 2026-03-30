"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { searchLocal, getTrends, type TweetData, type TrendItem } from "@/lib/api";
import { TweetCard } from "@/components/tweet-card";
import { TweetSkeleton } from "@/components/loading-skeleton";
import { cleanHandle } from "@/lib/utils";
import { formatCount } from "@/lib/utils";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-text-muted">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<TweetData[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Load trending topics as suggestions
  useEffect(() => {
    async function loadTrends() {
      try {
        const data = await getTrends("worldwide");
        if (data.ok) setTrends(data.trends.slice(0, 10));
      } catch {
        // Trends are supplementary — don't show error
      }
    }
    loadTrends();
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!query) {
      setResults([]);
      setSearched(false);
      return;
    }

    async function doSearch() {
      setLoading(true);
      setSearched(true);
      try {
        // If it looks like a handle, redirect to timeline
        if (/^@?[A-Za-z0-9_]+$/.test(query.trim())) {
          router.push(`/${cleanHandle(query)}`);
          return;
        }

        const data = await searchLocal(query);
        if (data.ok) {
          setResults(data.tweets);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [query, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("@") || /^[A-Za-z0-9_]+$/.test(trimmed)) {
      router.push(`/${cleanHandle(trimmed)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div className="py-4">
      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search tweets or enter @username..."
            className="w-full rounded-xl border border-border bg-bg-card px-4 py-3.5 pl-12 text-base text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Search
          </button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <TweetSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && query && (
        <AnimatePresence mode="popLayout">
          {results.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="mb-3 text-sm text-text-muted">
                {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
              </p>
              <div className="rounded-xl border border-border overflow-hidden">
                {results.map((tweet, i) => (
                  <TweetCard key={tweet.id} tweet={tweet} index={i} />
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-text-muted">
                Searching across {results.length} cached tweets. Browse more accounts to expand the search index.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-bg-card p-8 text-center"
            >
              <p className="text-sm text-text-secondary">
                No results for &ldquo;{query}&rdquo; in cached tweets.
              </p>
              <p className="mt-2 text-xs text-text-muted">
                Try browsing an account first — their tweets get indexed for search.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => router.push(`/${cleanHandle(query)}`)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-card-hover"
                >
                  View @{cleanHandle(query)}
                </button>
                <button
                  onClick={() => router.push("/trending")}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
                >
                  Browse Trending
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Default state — trending suggestions */}
      {!loading && !searched && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {trends.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Trending now
              </h2>
              <div className="space-y-1.5">
                {trends.map((trend, i) => (
                  <motion.button
                    key={trend.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => {
                      setInput(trend.name);
                      router.push(`/search?q=${encodeURIComponent(trend.name)}`);
                    }}
                    className="group flex w-full items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3 text-left transition-all hover:border-accent/30 hover:bg-bg-card-hover"
                  >
                    <div>
                      <span className="text-sm font-medium text-text-primary group-hover:text-accent">
                        {trend.name}
                      </span>
                      {trend.tweetVolume && (
                        <span className="ml-2 text-xs text-text-muted">
                          {formatCount(trend.tweetVolume)} tweets
                        </span>
                      )}
                    </div>
                    <svg className="h-3.5 w-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-text-muted">
            Search across all cached tweets, or enter @username to view a timeline
          </div>
        </motion.div>
      )}
    </div>
  );
}
