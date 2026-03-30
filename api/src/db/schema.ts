import { pgTable, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";

export const tweets = pgTable(
  "tweets",
  {
    id: text("id").primaryKey(), // X tweet ID
    authorId: text("author_id").notNull(),
    authorHandle: text("author_handle").notNull(),
    authorName: text("author_name").notNull(),
    authorAvatarUrl: text("author_avatar_url"),
    text: text("text").notNull(),
    html: text("html"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    media: jsonb("media").$type<MediaItem[]>().default([]),
    likes: integer("likes").default(0),
    retweets: integer("retweets").default(0),
    replies: integer("replies").default(0),
    views: integer("views").default(0),
    quotedTweetId: text("quoted_tweet_id"),
    replyToId: text("reply_to_id"),
    isRetweet: boolean("is_retweet").default(false),
    retweetedBy: text("retweeted_by"),
    source: text("source").notNull(), // fixtweet | playwright | syndication
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_tweets_author_handle").on(table.authorHandle),
    index("idx_tweets_created_at").on(table.createdAt),
    index("idx_tweets_fetched_at").on(table.fetchedAt),
  ]
);

export const users = pgTable("users", {
  id: text("id").primaryKey(), // X user ID or handle as fallback
  handle: text("handle").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  followersCount: integer("followers_count").default(0),
  followingCount: integer("following_count").default(0),
  tweetCount: integer("tweet_count").default(0),
  joinDate: text("join_date"),
  verified: boolean("verified").default(false),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sourceHealth = pgTable("source_health", {
  source: text("source").primaryKey(), // fixtweet | playwright | syndication
  isHealthy: boolean("is_healthy").default(true),
  consecutiveFailures: integer("consecutive_failures").default(0),
  lastSuccess: timestamp("last_success", { withTimezone: true }),
  lastFailure: timestamp("last_failure", { withTimezone: true }),
  avgLatencyMs: integer("avg_latency_ms").default(0),
  unhealthyUntil: timestamp("unhealthy_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// TypeScript types
export interface MediaItem {
  type: "image" | "video" | "gif";
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export type Tweet = typeof tweets.$inferSelect;
export type NewTweet = typeof tweets.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SourceHealth = typeof sourceHealth.$inferSelect;
