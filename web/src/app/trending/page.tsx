"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getTrends, type TrendItem } from "@/lib/api";
import { formatCount } from "@/lib/utils";
import { useRouter } from "next/navigation";

const LOCATIONS = [
  { label: "Worldwide", value: "worldwide" },
  { label: "United States", value: "us" },
  { label: "United Kingdom", value: "uk" },
  { label: "India", value: "india" },
  { label: "Japan", value: "japan" },
  { label: "Germany", value: "germany" },
  { label: "France", value: "france" },
  { label: "Brazil", value: "brazil" },
  { label: "Canada", value: "canada" },
  { label: "Australia", value: "australia" },
];

export default function TrendingPage() {
  const router = useRouter();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [location, setLocation] = useState("worldwide");
  const [locationName, setLocationName] = useState("Worldwide");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTrends(location);
        if (data.ok) {
          setTrends(data.trends);
          setLocationName(data.location);
        } else {
          setError("Failed to load trends");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trends");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [location]);

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trending</h1>
          <p className="mt-1 text-sm text-text-muted">
            Real-time trending topics on X — {locationName}
          </p>
        </div>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
        >
          {LOCATIONS.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-bg-card p-4">
              <div className="h-4 w-40 rounded bg-bg-secondary" />
              <div className="mt-2 h-3 w-24 rounded bg-bg-secondary" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-error/20 bg-error/5 p-6 text-center">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Trends list */}
      {!loading && !error && (
        <div className="space-y-2">
          {trends.map((trend, i) => (
            <motion.button
              key={trend.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.5) }}
              onClick={() => router.push(`/search?q=${encodeURIComponent(trend.name)}`)}
              className="group flex w-full items-center justify-between rounded-xl border border-border bg-bg-card p-4 text-left transition-all hover:border-accent/30 hover:bg-bg-card-hover"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-text-muted">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-semibold text-text-primary group-hover:text-accent">
                    {trend.name}
                  </span>
                </div>
                {trend.tweetVolume && (
                  <p className="mt-0.5 pl-5 text-xs text-text-muted">
                    {formatCount(trend.tweetVolume)} tweets
                  </p>
                )}
              </div>
              <svg
                className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
