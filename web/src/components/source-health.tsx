"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getHealth, type SourceHealthData } from "@/lib/api";

export function SourceHealth() {
  const [sources, setSources] = useState<SourceHealthData[]>([]);
  const [status, setStatus] = useState<string>("unknown");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function poll() {
      try {
        const data = await getHealth();
        setSources(data.sources);
        setStatus(data.status);
      } catch {
        setStatus("unknown");
      }
    }

    poll();
    const interval = setInterval(poll, 30_000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const dotColor =
    status === "healthy"
      ? "bg-success"
      : status === "degraded"
        ? "bg-warning"
        : status === "unhealthy"
          ? "bg-error"
          : "bg-text-muted";

  return (
    <div className="relative">
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-bg-card-hover"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Source health status"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`}
          />
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`}
          />
        </span>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-border bg-bg-card p-4 shadow-xl"
          >
            <h3 className="mb-3 text-sm font-semibold text-text-primary">
              Data Sources
            </h3>
            <div className="space-y-2">
              {sources.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-lg bg-bg-secondary px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${s.healthy ? "bg-success" : "bg-error"}`}
                    />
                    <span className="text-sm font-medium capitalize text-text-primary">
                      {s.name}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {s.healthy
                      ? `${s.avgLatencyMs}ms`
                      : `${s.consecutiveFailures} failures`}
                  </span>
                </div>
              ))}
              {sources.length === 0 && (
                <p className="text-sm text-text-muted">
                  Unable to fetch source status
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
