"use client";

import { useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchTimeline } from "@/lib/timeline-fetcher";
import { useTimelineStore } from "@/lib/store";
import { ProfileHeader } from "@/components/profile-header";
import { TweetCard } from "@/components/tweet-card";
import { TimelineSkeleton } from "@/components/loading-skeleton";
import { KeyboardHelp } from "@/components/keyboard-help";
import { useKeyboardNav } from "@/hooks/use-keyboard-nav";

export default function TimelinePage() {
  const params = useParams();
  const handle = params.handle as string;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    user,
    tweets,
    loading,
    error,
    cached,
    source,
    setTimeline,
    prependTweets,
    setLoading,
    setError,
    reset,
  } = useTimelineStore();

  const { selectedIndex, showHelp, setShowHelp } = useKeyboardNav(tweets.length);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const data = await fetchTimeline(handle);
        if (isRefresh && tweets.length > 0) {
          prependTweets(data.tweets);
        } else {
          setTimeline(data.user, data.tweets, null, data.source, data.cached);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load timeline");
      }
    },
    [handle, tweets.length, setTimeline, prependTweets, setLoading, setError]
  );

  useEffect(() => {
    reset();
    fetchData();

    // Auto-refresh every 2 minutes
    intervalRef.current = setInterval(() => {
      fetchData(true);
    }, 120_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !user) {
    return <TimelineSkeleton />;
  }

  if (error && !user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
          <svg className="h-8 w-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          Could not load @{handle}
        </h2>
        <p className="mt-2 text-sm text-text-muted">{error}</p>
        <button
          onClick={() => fetchData()}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      {user && <ProfileHeader user={user} />}

      {/* Cache/source indicator */}
      {cached && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-b border-border bg-warning/5 px-4 py-2 text-center text-xs text-warning"
        >
          Showing cached data (source: {source}). Live data may be temporarily unavailable.
        </motion.div>
      )}

      {/* Source indicator */}
      {!cached && source && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-b border-border px-4 py-1.5 text-right text-xs text-text-muted"
        >
          via {source}
        </motion.div>
      )}

      {/* Live refresh indicator */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium text-text-primary">Tweets</span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs text-text-muted">Auto-refreshing</span>
        </div>
      </div>

      {/* Tweet feed */}
      <AnimatePresence mode="popLayout">
        {tweets.map((tweet, i) => (
          <TweetCard key={tweet.id} tweet={tweet} index={i} selected={i === selectedIndex} />
        ))}
      </AnimatePresence>

      {/* Keyboard shortcuts help */}
      <KeyboardHelp show={showHelp} onClose={() => setShowHelp(false)} />

      {tweets.length === 0 && !loading && user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-16"
        >
          <p className="text-sm text-text-muted">
            Profile loaded but timeline data is currently unavailable.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Data sources may be rate-limited. Try refreshing in a minute.
          </p>
          <button
            onClick={() => fetchData()}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover"
          >
            Retry
          </button>
        </motion.div>
      )}

      {loading && tweets.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}
    </div>
  );
}
