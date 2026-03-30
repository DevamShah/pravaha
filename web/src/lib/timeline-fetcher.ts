/**
 * Client-side timeline fetcher.
 *
 * Strategy: Fetch timelines via our API proxy (which tries multiple sources).
 * If the API proxy fails, the browser can call the syndication endpoint directly
 * since residential IPs aren't rate-limited as aggressively.
 *
 * For the test product, we also support a "demo mode" with realistic sample data
 * to showcase the UI when all live sources are rate-limited.
 */

import type { TweetData, UserData } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface TimelineFetchResult {
  user: UserData;
  tweets: TweetData[];
  source: string;
  cached: boolean;
}

/**
 * Fetch a user's timeline. Tries API first, then falls back to direct
 * syndication fetch from the browser.
 */
export async function fetchTimeline(handle: string): Promise<TimelineFetchResult> {
  // Try 1: Our API (which tries FixTweet → Playwright → Syndication → DB)
  try {
    const res = await fetch(`${API_BASE}/api/timeline/${encodeURIComponent(handle)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.ok && data.tweets?.length > 0) {
      return {
        user: data.user,
        tweets: data.tweets,
        source: data.meta?.source ?? "api",
        cached: data.meta?.cached ?? false,
      };
    }
    // API returned ok but no tweets — try to at least get the user profile
    if (data.ok && data.user) {
      // Try syndication from browser
      const syndicationTweets = await fetchSyndicationFromBrowser(handle);
      if (syndicationTweets.length > 0) {
        return {
          user: data.user,
          tweets: syndicationTweets,
          source: "syndication-browser",
          cached: false,
        };
      }
      return {
        user: data.user,
        tweets: [],
        source: "api-no-tweets",
        cached: false,
      };
    }
  } catch {
    // API failed entirely
  }

  // Try 2: Fetch user profile from API + timeline from syndication directly
  try {
    const [userRes, syndicationTweets] = await Promise.allSettled([
      fetch(`${API_BASE}/api/user/${encodeURIComponent(handle)}`, { cache: "no-store" }).then((r) => r.json()),
      fetchSyndicationFromBrowser(handle),
    ]);

    const user =
      userRes.status === "fulfilled" && userRes.value.ok
        ? userRes.value.user
        : createFallbackUser(handle);

    const tweets =
      syndicationTweets.status === "fulfilled" ? syndicationTweets.value : [];

    return {
      user,
      tweets,
      source: tweets.length > 0 ? "syndication-browser" : "profile-only",
      cached: false,
    };
  } catch {
    return {
      user: createFallbackUser(handle),
      tweets: [],
      source: "error",
      cached: false,
    };
  }
}

/**
 * Fetch the syndication timeline HTML from the browser (client-side).
 * The browser's residential IP is less likely to be rate-limited.
 */
async function fetchSyndicationFromBrowser(handle: string): Promise<TweetData[]> {
  try {
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}?dnt=false&embedId=twitter-widget-0&lang=en&showReplies=false`;

    const res = await fetch(url, {
      headers: {
        Accept: "text/html",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    return parseSyndicationHtml(html);
  } catch {
    return [];
  }
}

/**
 * Parse syndication timeline HTML to extract tweet data.
 * The syndication response contains a JSON blob embedded in a script tag.
 */
function parseSyndicationHtml(html: string): TweetData[] {
  const tweets: TweetData[] = [];

  try {
    // The syndication HTML contains tweet data in script tags or data attributes
    // Try to extract from __NEXT_DATA__ or inline JSON
    const scriptMatch = html.match(/<script[^>]*>window\.__TIMELINE_DATA__\s*=\s*({[\s\S]*?})<\/script>/);
    if (scriptMatch) {
      const data = JSON.parse(scriptMatch[1]);
      // Parse the timeline data structure
      if (data.tweets) {
        for (const t of Object.values(data.tweets) as Array<Record<string, unknown>>) {
          tweets.push(parseSyndicationTweetObj(t));
        }
      }
      return tweets;
    }

    // Alternative: parse tweet-text divs from the HTML
    const tweetBlocks = html.match(/<div[^>]*class="[^"]*timeline-Tweet[^"]*"[^>]*>[\s\S]*?<\/div>/g);
    if (tweetBlocks) {
      for (const block of tweetBlocks.slice(0, 20)) {
        const textMatch = block.match(/class="[^"]*tweet-text[^"]*"[^>]*>([\s\S]*?)<\/p>/);
        const authorMatch = block.match(/class="[^"]*TweetAuthor-name[^"]*"[^>]*>([\s\S]*?)<\/span>/);
        const handleMatch = block.match(/class="[^"]*TweetAuthor-screenName[^"]*"[^>]*>@?([\w]+)/);
        const timeMatch = block.match(/datetime="([^"]+)"/);

        if (textMatch) {
          tweets.push({
            id: `syn-${Date.now()}-${tweets.length}`,
            authorId: "",
            authorHandle: handleMatch?.[1] ?? "",
            authorName: authorMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "",
            authorAvatarUrl: null,
            text: textMatch[1].replace(/<[^>]+>/g, "").trim(),
            html: textMatch[1],
            createdAt: timeMatch?.[1] ?? new Date().toISOString(),
            media: [],
            likes: 0,
            retweets: 0,
            replies: 0,
            views: 0,
            quotedTweetId: null,
            replyToId: null,
            isRetweet: false,
            retweetedBy: null,
          });
        }
      }
    }
  } catch {
    // Parsing failed — return empty
  }

  return tweets;
}

function parseSyndicationTweetObj(t: Record<string, unknown>): TweetData {
  const user = t.user as Record<string, unknown> | undefined;
  return {
    id: String(t.id_str ?? t.id ?? `${Date.now()}`),
    authorId: String(user?.id_str ?? ""),
    authorHandle: String(user?.screen_name ?? ""),
    authorName: String(user?.name ?? ""),
    authorAvatarUrl: (user?.profile_image_url_https as string) ?? null,
    text: String(t.full_text ?? t.text ?? ""),
    html: null,
    createdAt: String(t.created_at ?? new Date().toISOString()),
    media: [],
    likes: Number(t.favorite_count ?? 0),
    retweets: Number(t.retweet_count ?? 0),
    replies: Number(t.reply_count ?? 0),
    views: 0,
    quotedTweetId: t.quoted_status_id_str ? String(t.quoted_status_id_str) : null,
    replyToId: t.in_reply_to_status_id_str ? String(t.in_reply_to_status_id_str) : null,
    isRetweet: Boolean(t.retweeted_status),
    retweetedBy: null,
  };
}

function createFallbackUser(handle: string): UserData {
  return {
    id: "",
    handle,
    name: handle,
    bio: null,
    avatarUrl: null,
    bannerUrl: null,
    followersCount: 0,
    followingCount: 0,
    tweetCount: 0,
    joinDate: null,
    verified: false,
  };
}
