"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { cleanHandle, formatCount } from "@/lib/utils";
import { getTrends, type TrendItem } from "@/lib/api";

const FEATURED_HANDLES = [
  { handle: "elonmusk", name: "Elon Musk" },
  { handle: "sama", name: "Sam Altman" },
  { handle: "naval", name: "Naval" },
  { handle: "BillGates", name: "Bill Gates" },
  { handle: "ylecun", name: "Yann LeCun" },
  { handle: "karpathy", name: "Andrej Karpathy" },
];

const NAV_SECTIONS = [
  { href: "/trending", label: "Trending", desc: "Real-time trending topics", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { href: "/news", label: "News Feed", desc: "Curated news & tech accounts", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
  { href: "/popular", label: "Popular", desc: "Most-liked tweets", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { href: "/search", label: "Search", desc: "Search cached tweets", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
];

export default function HomePage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [trends, setTrends] = useState<TrendItem[]>([]);

  useEffect(() => {
    async function loadTrends() {
      try {
        const data = await getTrends("worldwide");
        if (data.ok) setTrends(data.trends.slice(0, 5));
      } catch { /* supplementary */ }
    }
    loadTrends();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanHandle(handle);
    if (clean) router.push(`/${clean}`);
  }

  return (
    <div className="flex flex-col items-center pb-12 pt-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Pravaha
        </h1>
        <p className="mt-2 text-base text-text-secondary">
          View any public tweet. No login. No tracking.
        </p>
      </motion.div>

      {/* Search */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 w-full max-w-md"
      >
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-text-muted">@</span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Enter a Twitter username..."
            className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 pl-10 text-base text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            View
          </button>
        </div>
      </motion.form>

      {/* Featured accounts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {FEATURED_HANDLES.map((item) => (
          <button
            key={item.handle}
            onClick={() => router.push(`/${item.handle}`)}
            className="rounded-full border border-border px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent/30 hover:bg-bg-card-hover hover:text-accent"
          >
            @{item.handle}
          </button>
        ))}
      </motion.div>

      {/* Navigation sections */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-10 grid w-full max-w-lg grid-cols-2 gap-3"
      >
        {NAV_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col rounded-xl border border-border bg-bg-card p-4 transition-all hover:border-accent/30 hover:bg-bg-card-hover"
          >
            <svg className="mb-2 h-5 w-5 text-text-muted group-hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={section.icon} />
            </svg>
            <span className="text-sm font-semibold text-text-primary group-hover:text-accent">
              {section.label}
            </span>
            <span className="mt-0.5 text-xs text-text-muted">{section.desc}</span>
          </Link>
        ))}
      </motion.div>

      {/* Trending preview */}
      {trends.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 w-full max-w-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Trending now</h2>
            <Link href="/trending" className="text-xs text-accent hover:underline">
              See all
            </Link>
          </div>
          <div className="mt-2 space-y-1">
            {trends.map((trend) => (
              <button
                key={trend.name}
                onClick={() => router.push(`/search?q=${encodeURIComponent(trend.name)}`)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-bg-card-hover"
              >
                <span className="text-sm text-text-primary">{trend.name}</span>
                {trend.tweetVolume && (
                  <span className="text-xs text-text-muted">{formatCount(trend.tweetVolume)}</span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-10 max-w-sm text-center text-xs leading-relaxed text-text-muted"
      >
        Pravaha uses multiple data sources to reliably show public tweets.
        No X account required. No data stored about you.
      </motion.p>
    </div>
  );
}
