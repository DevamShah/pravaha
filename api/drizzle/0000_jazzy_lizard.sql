CREATE TABLE "source_health" (
	"source" text PRIMARY KEY NOT NULL,
	"is_healthy" boolean DEFAULT true,
	"consecutive_failures" integer DEFAULT 0,
	"last_success" timestamp with time zone,
	"last_failure" timestamp with time zone,
	"avg_latency_ms" integer DEFAULT 0,
	"unhealthy_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tweets" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"author_handle" text NOT NULL,
	"author_name" text NOT NULL,
	"author_avatar_url" text,
	"text" text NOT NULL,
	"html" text,
	"created_at" timestamp with time zone NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb,
	"likes" integer DEFAULT 0,
	"retweets" integer DEFAULT 0,
	"replies" integer DEFAULT 0,
	"views" integer DEFAULT 0,
	"quoted_tweet_id" text,
	"reply_to_id" text,
	"is_retweet" boolean DEFAULT false,
	"retweeted_by" text,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"banner_url" text,
	"followers_count" integer DEFAULT 0,
	"following_count" integer DEFAULT 0,
	"tweet_count" integer DEFAULT 0,
	"join_date" text,
	"verified" boolean DEFAULT false,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE INDEX "idx_tweets_author_handle" ON "tweets" USING btree ("author_handle");--> statement-breakpoint
CREATE INDEX "idx_tweets_created_at" ON "tweets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tweets_fetched_at" ON "tweets" USING btree ("fetched_at");