/** Normalized tweet structure used across all adapters */
export interface NormalizedTweet {
  id: string;
  authorId: string;
  authorHandle: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  html: string | null;
  createdAt: Date;
  media: NormalizedMedia[];
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  quotedTweetId: string | null;
  replyToId: string | null;
  isRetweet: boolean;
  retweetedBy: string | null;
}

export interface NormalizedMedia {
  type: "image" | "video" | "gif";
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface NormalizedUser {
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

export interface TimelineResult {
  user: NormalizedUser;
  tweets: NormalizedTweet[];
  cursor?: string;
}

export interface SearchResult {
  tweets: NormalizedTweet[];
  cursor?: string;
}

export interface DataSourceAdapter {
  name: string;
  fetchTimeline(handle: string, cursor?: string): Promise<TimelineResult>;
  fetchTweet(id: string): Promise<{ tweet: NormalizedTweet; thread?: NormalizedTweet[] }>;
  fetchUser(handle: string): Promise<NormalizedUser>;
  searchTweets?(query: string, cursor?: string): Promise<SearchResult>;
}
