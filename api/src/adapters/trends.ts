/**
 * Twitter Trends adapter — uses v1.1 REST API with guest token.
 * The trends/place endpoint is one of the few v1.1 endpoints still
 * accessible via guest tokens as of 2026.
 */

const API_BASE = "https://api.x.com";
const BEARER_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

let guestToken: string | null = null;
let guestTokenExpiry = 0;

async function getGuestToken(): Promise<string> {
  if (guestToken && Date.now() < guestTokenExpiry) {
    return guestToken;
  }

  const res = await fetch(`${API_BASE}/1.1/guest/activate.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    },
  });

  if (!res.ok) throw new Error(`Guest token failed: ${res.status}`);
  const data = (await res.json()) as { guest_token: string };
  guestToken = data.guest_token;
  guestTokenExpiry = Date.now() + 15 * 60 * 1000;
  return guestToken;
}

export interface TrendItem {
  name: string;
  query: string;
  tweetVolume: number | null;
  url: string;
}

export interface TrendsResult {
  trends: TrendItem[];
  location: string;
  asOf: string;
}

/**
 * Fetch trending topics for a given WOEID (Where On Earth ID).
 * WOEID 1 = Worldwide, 23424977 = United States, etc.
 */
export async function fetchTrends(woeid: number = 1): Promise<TrendsResult> {
  const token = await getGuestToken();

  const res = await fetch(
    `${API_BASE}/1.1/trends/place.json?id=${woeid}`,
    {
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        "x-guest-token": token,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Trends fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    trends: Array<{
      name: string;
      query: string;
      tweet_volume: number | null;
      url: string;
    }>;
    locations: Array<{ name: string; woeid: number }>;
    as_of: string;
  }>;

  if (!data.length) throw new Error("Empty trends response");

  const entry = data[0];
  return {
    trends: entry.trends.map((t) => ({
      name: t.name,
      query: t.query,
      tweetVolume: t.tweet_volume,
      url: t.url,
    })),
    location: entry.locations[0]?.name ?? "Worldwide",
    asOf: entry.as_of,
  };
}

/** Known WOEIDs for common locations */
export const LOCATIONS: Record<string, number> = {
  worldwide: 1,
  us: 23424977,
  uk: 23424975,
  india: 23424848,
  canada: 23424775,
  australia: 23424748,
  japan: 23424856,
  germany: 23424829,
  france: 23424819,
  brazil: 23424768,
};
