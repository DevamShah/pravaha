"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "./theme-provider";
import { SourceHealth } from "./source-health";
import { cleanHandle } from "@/lib/utils";

export function Header() {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // If it looks like a handle (@user or just username)
    if (trimmed.startsWith("@") || /^[A-Za-z0-9_]+$/.test(trimmed)) {
      router.push(`/${cleanHandle(trimmed)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
    setQuery("");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
        {/* Logo */}
        <motion.a
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-text-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-accent"
          >
            <path
              d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
          <span className="hidden sm:inline">Pravaha</span>
        </motion.a>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 sm:flex">
          {[
            { href: "/trending", label: "Trending" },
            { href: "/news", label: "News" },
            { href: "/popular", label: "Popular" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tweets or enter @username..."
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 pl-10 text-sm text-text-primary placeholder-text-muted outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </form>

        {/* Theme toggle */}
        <motion.button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </motion.button>

        {/* Source health indicator */}
        <SourceHealth />
      </div>
    </header>
  );
}
