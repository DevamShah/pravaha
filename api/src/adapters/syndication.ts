import type { DataSourceAdapter, NormalizedTweet, NormalizedUser, NormalizedMedia, TimelineResult } from "../lib/types.js";

/**
 * Syndication API adapter.
 * Uses Twitter's embed/syndication infrastructure which doesn't require auth.
 * Only supports fetching individual tweets by ID.
 */

const SYNDICATION_BASE = "https://cdn.syndication.twimg.com";
const TIMEOUT = parseInt(process.env.SYNDICATION_TIMEOUT ?? "5000", 10);

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Pravaha/1.0)",
        Accept: "application/json",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function parseMedia(entityMedia: Array<Record<string, unknown>> | undefined): NormalizedMedia[] {
  if (!entityMedia?.length) return [];
  return entityMedia.map((m) => {
    const type = String(m.type ?? "photo");
    return {
      type: (type === "photo" ? "image" : type === "animated_gif" ? "gif" : "video") as NormalizedMedia["type"],
      url: String(m.media_url_https ?? m.url ?? ""),
      width: m.original_info ? (m.original_info as Record<string, number>).width : undefined,
      height: m.original_info ? (m.original_info as Record<string, number>).height : undefined,
    };
  });
}

function parseSyndicationTweet(raw: Record<string, unknown>): NormalizedTweet {
  const user = raw.user as Record<string, unknown> | undefined;
  const entities = raw.entities as Record<string, unknown> | undefined;
  const mediaEntities = entities?.media as Array<Record<string, unknown>> | undefined;

  return {
    id: String(raw.id_str ?? raw.id ?? ""),
    authorId: String(user?.id_str ?? ""),
    authorHandle: String(user?.screen_name ?? ""),
    authorName: String(user?.name ?? ""),
    authorAvatarUrl: (user?.profile_image_url_https as string) ?? null,
    text: String(raw.text ?? ""),
    html: null,
    createdAt: new Date(raw.created_at as string ?? Date.now()),
    media: parseMedia(mediaEntities),
    likes: Number(raw.favorite_count ?? 0),
    retweets: Number(raw.retweet_count ?? 0),
    replies: Number(raw.reply_count ?? 0),
    views: 0, // Not available in syndication
    quotedTweetId: raw.quoted_status_id_str ? String(raw.quoted_status_id_str) : null,
    replyToId: raw.in_reply_to_status_id_str ? String(raw.in_reply_to_status_id_str) : null,
    isRetweet: Boolean(raw.retweeted_status),
    retweetedBy: null,
  };
}

export const syndication: DataSourceAdapter = {
  name: "syndication",

  async fetchTimeline(_handle: string): Promise<TimelineResult> {
    // Syndication API does not support timelines
    throw new Error("Syndication adapter does not support timeline fetching");
  },

  async fetchTweet(id: string): Promise<{ tweet: NormalizedTweet; thread?: NormalizedTweet[] }> {
    // Use the tweet-result endpoint used by Twitter embeds
    const token = generateToken(id);
    const url = `${SYNDICATION_BASE}/tweet-result?id=${id}&lang=en&token=${token}`;

    const res = await fetchWithTimeout(url, TIMEOUT);

    if (!res.ok) {
      throw new Error(`Syndication fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as Record<string, unknown>;

    if (!data || data.__typename === "TweetUnavailable") {
      throw new Error("Tweet unavailable via syndication");
    }

    const tweet = parseSyndicationTweet(data);
    return { tweet };
  },

  async fetchUser(_handle: string): Promise<NormalizedUser> {
    // Syndication API does not support user profile fetching
    throw new Error("Syndication adapter does not support user fetching");
  },
};

/**
 * Generate a simple token for the syndication API.
 * The token is derived from the tweet ID — this matches the pattern used by Twitter's embed JS.
 */
function generateToken(tweetId: string): string {
  const id = BigInt(tweetId);
  // Simple hash based on the tweet ID
  const token = ((id / BigInt(1e15)) * BigInt(Math.PI * 1e15 | 0)) % BigInt(1e15);
  return token.toString(36);
}
