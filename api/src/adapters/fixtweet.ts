import type { DataSourceAdapter, NormalizedTweet, NormalizedUser, NormalizedMedia, TimelineResult } from "../lib/types.js";

const FIXTWEET_BASE = "https://api.fxtwitter.com";
const TIMEOUT = parseInt(process.env.FIXTWEET_TIMEOUT ?? "5000", 10);

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Pravaha/1.0 (https://github.com/pravaha)",
        Accept: "application/json",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function parseMedia(mediaList: Array<Record<string, unknown>> | undefined): NormalizedMedia[] {
  if (!mediaList?.length) return [];
  return mediaList.map((m) => ({
    type: (m.type === "photo" ? "image" : m.type === "gif" ? "gif" : "video") as NormalizedMedia["type"],
    url: (m.url as string) ?? "",
    thumbnailUrl: m.thumbnail_url as string | undefined,
    altText: m.altText as string | undefined,
    width: m.width as number | undefined,
    height: m.height as number | undefined,
    durationMs: m.duration as number | undefined,
  }));
}

function parseTweet(raw: Record<string, unknown>): NormalizedTweet {
  const author = raw.author as Record<string, unknown> | undefined;
  const mediaObj = raw.media as Record<string, unknown> | undefined;
  const mediaAll = mediaObj?.all as Array<Record<string, unknown>> | undefined;
  const photos = mediaObj?.photos as Array<Record<string, unknown>> | undefined;
  const videos = mediaObj?.videos as Array<Record<string, unknown>> | undefined;

  // Merge photos and videos into a single array if 'all' isn't present
  const mediaList = mediaAll ?? [...(photos ?? []), ...(videos ?? [])];

  return {
    id: String(raw.id ?? ""),
    authorId: String(author?.id ?? ""),
    authorHandle: String(author?.screen_name ?? raw.author_screen_name ?? ""),
    authorName: String(author?.name ?? raw.author_name ?? ""),
    authorAvatarUrl: (author?.avatar_url as string) ?? null,
    text: String(raw.text ?? ""),
    html: null, // FxTwitter doesn't return HTML
    createdAt: new Date(raw.created_at as string ?? raw.created_timestamp as string ?? Date.now()),
    media: parseMedia(mediaList),
    likes: Number(raw.likes ?? 0),
    retweets: Number(raw.retweets ?? 0),
    replies: Number(raw.replies ?? 0),
    views: Number(raw.views ?? 0),
    quotedTweetId: raw.quote ? String((raw.quote as Record<string, unknown>).id ?? "") : null,
    replyToId: raw.replying_to ? String(raw.replying_to) : null,
    isRetweet: false,
    retweetedBy: null,
  };
}

function parseUser(raw: Record<string, unknown>): NormalizedUser {
  return {
    id: String(raw.id ?? ""),
    handle: String(raw.screen_name ?? ""),
    name: String(raw.name ?? ""),
    bio: (raw.description as string) ?? null,
    avatarUrl: (raw.avatar_url as string) ?? null,
    bannerUrl: (raw.banner_url as string) ?? null,
    followersCount: Number(raw.followers ?? 0),
    followingCount: Number(raw.following ?? 0),
    tweetCount: Number(raw.tweets ?? raw.statuses_count ?? 0),
    joinDate: (raw.joined as string) ?? null,
    verified: Boolean(raw.verified ?? false),
  };
}

export const fixtweet: DataSourceAdapter = {
  name: "fixtweet",

  async fetchTimeline(handle: string): Promise<TimelineResult> {
    // FxTwitter doesn't have a timeline endpoint — fetch user profile + recent tweets
    // We fetch the user profile which includes the pinned tweet
    const res = await fetchWithTimeout(`${FIXTWEET_BASE}/${handle}`, TIMEOUT);

    if (!res.ok) {
      throw new Error(`FixTweet user fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const userRaw = data.user as Record<string, unknown> | undefined;

    if (!userRaw) {
      throw new Error("FixTweet returned no user data");
    }

    const user = parseUser(userRaw);

    // FxTwitter user endpoint returns tweet count as a number, not an array
    // It doesn't provide timeline data — only profile info
    const tweets: ReturnType<typeof parseTweet>[] = [];

    return { user, tweets };
  },

  async fetchTweet(id: string): Promise<{ tweet: NormalizedTweet; thread?: NormalizedTweet[] }> {
    // Try to find the tweet — we need at least a handle or can use a direct status endpoint
    const res = await fetchWithTimeout(`${FIXTWEET_BASE}/i/status/${id}`, TIMEOUT);

    if (!res.ok) {
      throw new Error(`FixTweet tweet fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const tweetRaw = data.tweet as Record<string, unknown> | undefined;

    if (!tweetRaw) {
      throw new Error("FixTweet returned no tweet data");
    }

    const tweet = parseTweet(tweetRaw);
    return { tweet };
  },

  async fetchUser(handle: string): Promise<NormalizedUser> {
    const res = await fetchWithTimeout(`${FIXTWEET_BASE}/${handle}`, TIMEOUT);

    if (!res.ok) {
      throw new Error(`FixTweet user fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const userRaw = data.user as Record<string, unknown> | undefined;

    if (!userRaw) {
      throw new Error("FixTweet returned no user data");
    }

    return parseUser(userRaw);
  },

  // FxTwitter does not support search
};
