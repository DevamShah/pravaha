const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Client-side fetch (no Next.js cache)
async function fetchApiClient<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// --- Types ---

export interface ApiMeta {
  source: string;
  cached: boolean;
  timestamp: string;
}

export interface TweetData {
  id: string;
  authorId: string;
  authorHandle: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  html: string | null;
  createdAt: string;
  media: MediaData[];
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  quotedTweetId: string | null;
  replyToId: string | null;
  isRetweet: boolean;
  retweetedBy: string | null;
}

export interface MediaData {
  type: "image" | "video" | "gif";
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface UserData {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  joinDate: string | null;
  verified: boolean;
}

export interface SourceHealthData {
  name: string;
  healthy: boolean;
  consecutiveFailures: number;
  avgLatencyMs: number;
  lastSuccess: string | null;
  lastFailure: string | null;
}

export interface TimelineResponse {
  ok: boolean;
  user: UserData;
  tweets: TweetData[];
  cursor: string | null;
  meta: ApiMeta;
  error?: string;
}

export interface TweetResponse {
  ok: boolean;
  tweet: TweetData;
  thread: TweetData[];
  meta: ApiMeta;
  error?: string;
}

export interface UserResponse {
  ok: boolean;
  user: UserData;
  meta: ApiMeta;
  error?: string;
}

export interface HealthResponse {
  ok: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  sources: SourceHealthData[];
  timestamp: string;
}

export interface TrendItem {
  name: string;
  query: string;
  tweetVolume: number | null;
  url: string;
}

export interface TrendsResponse {
  ok: boolean;
  trends: TrendItem[];
  location: string;
  asOf: string;
  meta: { cached: boolean; timestamp: string };
}

export interface DiscoverResponse {
  ok: boolean;
  tweets: TweetData[];
  meta: { cached: boolean; count?: number; timestamp: string };
  error?: string;
}

// --- API Functions ---

export async function getTimeline(handle: string, cursor?: string): Promise<TimelineResponse> {
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return fetchApiClient<TimelineResponse>(`/api/timeline/${encodeURIComponent(handle)}${params}`);
}

export async function getTweet(id: string): Promise<TweetResponse> {
  return fetchApiClient<TweetResponse>(`/api/tweet/${encodeURIComponent(id)}`);
}

export async function getUser(handle: string): Promise<UserResponse> {
  return fetchApiClient<UserResponse>(`/api/user/${encodeURIComponent(handle)}`);
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchApiClient<HealthResponse>("/api/health");
}

export async function getTrends(location: string = "worldwide"): Promise<TrendsResponse> {
  return fetchApiClient<TrendsResponse>(`/api/trends?location=${encodeURIComponent(location)}`);
}

export async function getNews(category: string = "all"): Promise<DiscoverResponse> {
  return fetchApiClient<DiscoverResponse>(`/api/discover/news?category=${encodeURIComponent(category)}`);
}

export async function getPopular(limit: number = 30): Promise<DiscoverResponse> {
  return fetchApiClient<DiscoverResponse>(`/api/discover/popular?limit=${limit}`);
}

export async function searchLocal(query: string): Promise<DiscoverResponse> {
  return fetchApiClient<DiscoverResponse>(`/api/discover/search?q=${encodeURIComponent(query)}`);
}

export { fetchApi, fetchApiClient };
