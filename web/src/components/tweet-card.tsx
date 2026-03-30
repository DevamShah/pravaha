"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { TweetData } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/utils";

interface TweetCardProps {
  tweet: TweetData;
  index?: number;
  selected?: boolean;
}

export function TweetCard({ tweet, index = 0, selected = false }: TweetCardProps) {
  const tweetUrl = `/${tweet.authorHandle}/status/${tweet.id}`;

  return (
    <motion.article
      data-tweet-index={index}
      tabIndex={0}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
      className={`group border-b border-border px-4 py-4 transition-colors hover:bg-bg-card-hover outline-none focus:bg-bg-card-hover ${selected ? "bg-bg-card-hover ring-1 ring-accent/30" : ""}`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/${tweet.authorHandle}`} className="shrink-0">
          {tweet.authorAvatarUrl ? (
            <img
              src={tweet.authorAvatarUrl}
              alt={tweet.authorName}
              className="h-10 w-10 rounded-full bg-bg-secondary object-cover transition-opacity hover:opacity-80"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
              {tweet.authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Author line */}
          <div className="flex items-baseline gap-1.5">
            <Link
              href={`/${tweet.authorHandle}`}
              className="truncate font-semibold text-text-primary hover:underline"
            >
              {tweet.authorName}
            </Link>
            <Link
              href={`/${tweet.authorHandle}`}
              className="truncate text-sm text-text-muted"
            >
              @{tweet.authorHandle}
            </Link>
            <span className="text-text-muted">·</span>
            <Link
              href={tweetUrl}
              className="shrink-0 text-sm text-text-muted hover:underline"
            >
              {timeAgo(tweet.createdAt)}
            </Link>
          </div>

          {/* Tweet text */}
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text-primary">
            {linkifyText(tweet.text, tweetUrl)}
          </p>

          {/* Media */}
          {tweet.media.length > 0 && (
            <div
              className={`mt-3 grid gap-0.5 overflow-hidden rounded-xl border border-border ${
                tweet.media.length === 1
                  ? "grid-cols-1"
                  : tweet.media.length === 2
                    ? "grid-cols-2"
                    : tweet.media.length === 3
                      ? "grid-cols-2"
                      : "grid-cols-2"
              }`}
            >
              {tweet.media.slice(0, 4).map((m, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden bg-bg-secondary ${
                    tweet.media.length === 3 && i === 0 ? "row-span-2" : ""
                  }`}
                >
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      alt={m.altText ?? "Tweet media"}
                      className="h-full max-h-80 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : m.type === "video" || m.type === "gif" ? (
                    <video
                      src={m.url}
                      poster={m.thumbnailUrl}
                      controls={m.type === "video"}
                      autoPlay={m.type === "gif"}
                      loop={m.type === "gif"}
                      muted={m.type === "gif"}
                      playsInline
                      className="h-full max-h-80 w-full object-cover"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Metrics bar */}
          <div className="mt-3 flex max-w-md items-center justify-between">
            <MetricButton
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
              count={tweet.replies}
              hoverColor="text-accent"
            />
            <MetricButton
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              count={tweet.retweets}
              hoverColor="text-success"
            />
            <MetricButton
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              }
              count={tweet.likes}
              hoverColor="text-error"
            />
            <MetricButton
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
              count={tweet.views}
              hoverColor="text-accent"
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function MetricButton({
  icon,
  count,
  hoverColor,
}: {
  icon: React.ReactNode;
  count: number;
  hoverColor: string;
}) {
  return (
    <button
      className={`flex items-center gap-1.5 text-text-muted transition-colors hover:${hoverColor}`}
    >
      {icon}
      {count > 0 && (
        <span className="text-xs">{formatCount(count)}</span>
      )}
    </button>
  );
}

/**
 * Linkify tweet text — renders @mentions, #hashtags, URLs as interactive elements.
 * Plain text segments link to the tweet detail page.
 * Uses onClick + stopPropagation to avoid nested <a> hydration errors.
 */
function linkifyText(text: string, tweetUrl: string): React.ReactNode {
  const parts = text.split(/(@\w+|#\w+|https?:\/\/\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={i}
          role="link"
          tabIndex={0}
          className="cursor-pointer text-accent hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/${part.slice(1)}`;
          }}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("#")) {
      return (
        <span
          key={i}
          role="link"
          tabIndex={0}
          className="cursor-pointer text-accent hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/search?q=${encodeURIComponent(part)}`;
          }}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("http")) {
      return (
        <span
          key={i}
          role="link"
          tabIndex={0}
          className="cursor-pointer text-accent hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            window.open(part, "_blank", "noopener,noreferrer");
          }}
        >
          {part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 30)}
          {part.length > 40 ? "..." : ""}
        </span>
      );
    }
    // Plain text — clicking navigates to tweet detail
    if (!part) return null;
    return (
      <Link key={i} href={tweetUrl} className="hover:no-underline">
        {part}
      </Link>
    );
  });
}
