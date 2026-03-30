"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getTweet, type TweetData } from "@/lib/api";
import { TweetCard } from "@/components/tweet-card";
import { TweetSkeleton } from "@/components/loading-skeleton";

export default function TweetDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [tweet, setTweet] = useState<TweetData | null>(null);
  const [thread, setThread] = useState<TweetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTweet(id);
        if (!data.ok) {
          setError(data.error ?? "Failed to load tweet");
          return;
        }
        setTweet(data.tweet);
        setThread(data.thread);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tweet");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div>
        <TweetSkeleton />
      </div>
    );
  }

  if (error || !tweet) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <h2 className="text-lg font-semibold text-text-primary">
          Could not load tweet
        </h2>
        <p className="mt-2 text-sm text-text-muted">{error}</p>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Thread context (parent tweets) */}
      {thread.length > 0 && (
        <div className="border-b border-border">
          <p className="px-4 py-2 text-xs font-medium text-text-muted">
            Thread
          </p>
          {thread.map((t, i) => (
            <TweetCard key={t.id} tweet={t} index={i} />
          ))}
        </div>
      )}

      {/* Main tweet — larger display */}
      <div className="border-b border-border px-4 py-6">
        <div className="flex items-center gap-3">
          {tweet.authorAvatarUrl ? (
            <img
              src={tweet.authorAvatarUrl}
              alt={tweet.authorName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-lg font-bold text-accent">
              {tweet.authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-text-primary">{tweet.authorName}</p>
            <p className="text-sm text-text-muted">@{tweet.authorHandle}</p>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-xl leading-relaxed text-text-primary">
          {tweet.text}
        </p>

        {/* Media */}
        {tweet.media.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {tweet.media.map((m, i) => (
              <div key={i}>
                {m.type === "image" ? (
                  <img
                    src={m.url}
                    alt={m.altText ?? "Tweet media"}
                    className="w-full object-cover"
                  />
                ) : (
                  <video
                    src={m.url}
                    controls
                    playsInline
                    className="w-full"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="mt-4 text-sm text-text-muted">
          {new Date(tweet.createdAt).toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {/* Metrics */}
        <div className="mt-4 flex gap-6 border-t border-border pt-4">
          <Metric label="Replies" value={tweet.replies} />
          <Metric label="Retweets" value={tweet.retweets} />
          <Metric label="Likes" value={tweet.likes} />
          <Metric label="Views" value={tweet.views} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-semibold text-text-primary">
        {value >= 1_000_000
          ? `${(value / 1_000_000).toFixed(1)}M`
          : value >= 1_000
            ? `${(value / 1_000).toFixed(1)}K`
            : value}
      </span>
      <span className="text-sm text-text-muted">{label}</span>
    </div>
  );
}
