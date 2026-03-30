import type {
  DataSourceAdapter,
  NormalizedTweet,
  NormalizedUser,
  NormalizedMedia,
  TimelineResult,
  SearchResult,
} from "../lib/types.js";

/**
 * Twitter Guest Token Adapter
 *
 * Uses Twitter's public bearer token + guest token to access the internal
 * GraphQL API. This is the same approach used by FxTwitter, Nitter, and XCancel.
 *
 * The bearer token is publicly embedded in Twitter's web app JavaScript —
 * it is not a secret API key.
 */

// Public bearer token from Twitter's web app (decoded form)
const BEARER_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

const GRAPHQL_BASE = "https://x.com/i/api/graphql";
const API_BASE = "https://api.x.com";

const TIMEOUT = parseInt(process.env.TWITTER_GUEST_TIMEOUT ?? "10000", 10);

// Guest token cache
let guestToken: string | null = null;
let guestTokenExpiry = 0;
const GUEST_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getGuestToken(): Promise<string> {
  if (guestToken && Date.now() < guestTokenExpiry) {
    return guestToken;
  }

  const res = await fetchWithTimeout(
    `${API_BASE}/1.1/guest/activate.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
    },
    5000
  );

  if (!res.ok) {
    throw new Error(`Guest token activation failed: ${res.status}`);
  }

  const data = (await res.json()) as { guest_token: string };
  guestToken = data.guest_token;
  guestTokenExpiry = Date.now() + GUEST_TOKEN_TTL;
  return guestToken;
}

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${BEARER_TOKEN}`,
    "x-guest-token": token,
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://x.com/",
    Origin: "https://x.com",
  };
}

// GraphQL query features (required by Twitter API)
const TWEET_FEATURES = JSON.stringify({
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_featuring: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
});

const FIELD_TOGGLES = JSON.stringify({
  withArticlePlainText: false,
});

// --- Parsers ---

function parseMedia(
  mediaEntities: Array<Record<string, unknown>> | undefined
): NormalizedMedia[] {
  if (!mediaEntities?.length) return [];
  return mediaEntities.map((m) => {
    const type = String(m.type ?? "photo");
    let url = "";
    if (type === "photo") {
      url = String(m.media_url_https ?? "");
    } else if (type === "video" || type === "animated_gif") {
      const variants = (
        (m.video_info as Record<string, unknown>)?.variants as Array<
          Record<string, unknown>
        >
      )?.filter((v) => v.content_type === "video/mp4");
      if (variants?.length) {
        // Pick highest bitrate
        variants.sort(
          (a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0)
        );
        url = String(variants[0].url ?? "");
      }
    }
    return {
      type: (
        type === "photo" ? "image" : type === "animated_gif" ? "gif" : "video"
      ) as NormalizedMedia["type"],
      url,
      thumbnailUrl: String(m.media_url_https ?? ""),
      altText: (m.ext_alt_text as string) ?? undefined,
      width:
        (m.original_info as Record<string, number> | undefined)?.width ??
        undefined,
      height:
        (m.original_info as Record<string, number> | undefined)?.height ??
        undefined,
    };
  });
}

function extractTweetFromResult(
  result: Record<string, unknown>
): NormalizedTweet | null {
  const typename = result.__typename as string;
  let tweetResult = result;

  if (typename === "TimelineTimelineItem") {
    const content = result.itemContent as Record<string, unknown>;
    tweetResult = (content?.tweet_results as Record<string, unknown>)
      ?.result as Record<string, unknown>;
  }

  if (!tweetResult) return null;

  // Handle TweetWithVisibilityResults wrapper
  if (tweetResult.__typename === "TweetWithVisibilityResults") {
    tweetResult = tweetResult.tweet as Record<string, unknown>;
  }

  if (
    !tweetResult ||
    tweetResult.__typename === "TweetTombstone" ||
    tweetResult.__typename === "TweetUnavailable"
  ) {
    return null;
  }

  const legacy = tweetResult.legacy as Record<string, unknown> | undefined;
  const core = tweetResult.core as Record<string, unknown> | undefined;
  const userResults = core?.user_results as Record<string, unknown> | undefined;
  const userResult = userResults?.result as
    | Record<string, unknown>
    | undefined;
  const userLegacy = userResult?.legacy as
    | Record<string, unknown>
    | undefined;

  if (!legacy) return null;

  const entities = legacy.entities as Record<string, unknown> | undefined;
  const extMedia = (legacy.extended_entities as Record<string, unknown>)
    ?.media as Array<Record<string, unknown>> | undefined;
  const mediaEntities =
    extMedia ?? (entities?.media as Array<Record<string, unknown>> | undefined);

  const viewsInfo = tweetResult.views as Record<string, unknown> | undefined;

  // Check for retweet
  const retweetedStatus = legacy.retweeted_status_result as
    | Record<string, unknown>
    | undefined;
  let isRetweet = false;
  let retweetedBy: string | null = null;
  let actualTweet = legacy;
  let actualUser = userLegacy;
  let actualMedia = mediaEntities;

  if (retweetedStatus?.result) {
    isRetweet = true;
    retweetedBy = String(userLegacy?.screen_name ?? "");
    const rtResult = retweetedStatus.result as Record<string, unknown>;
    const rtTweet =
      rtResult.__typename === "TweetWithVisibilityResults"
        ? (rtResult.tweet as Record<string, unknown>)
        : rtResult;
    actualTweet = (rtTweet?.legacy as Record<string, unknown>) ?? legacy;
    const rtCore = rtTweet?.core as Record<string, unknown> | undefined;
    const rtUserResults = rtCore?.user_results as
      | Record<string, unknown>
      | undefined;
    const rtUser = rtUserResults?.result as
      | Record<string, unknown>
      | undefined;
    actualUser =
      (rtUser?.legacy as Record<string, unknown> | undefined) ?? userLegacy;
    const rtEntities = (
      actualTweet.extended_entities as Record<string, unknown> | undefined
    )?.media as Array<Record<string, unknown>> | undefined;
    actualMedia = rtEntities ?? actualMedia;
  }

  const quotedStatus = legacy.quoted_status_id_str as string | undefined;

  return {
    id: String(legacy.id_str ?? tweetResult.rest_id ?? ""),
    authorId: String(actualUser?.id_str ?? userResult?.rest_id ?? ""),
    authorHandle: String(actualUser?.screen_name ?? ""),
    authorName: String(actualUser?.name ?? ""),
    authorAvatarUrl:
      (actualUser?.profile_image_url_https as string)?.replace(
        "_normal",
        "_bigger"
      ) ?? null,
    text: String(actualTweet.full_text ?? actualTweet.text ?? legacy.full_text ?? ""),
    html: null,
    createdAt: new Date(
      (actualTweet.created_at as string) ?? (legacy.created_at as string) ?? Date.now()
    ),
    media: parseMedia(actualMedia),
    likes: Number(actualTweet.favorite_count ?? legacy.favorite_count ?? 0),
    retweets: Number(actualTweet.retweet_count ?? legacy.retweet_count ?? 0),
    replies: Number(actualTweet.reply_count ?? legacy.reply_count ?? 0),
    views: Number(viewsInfo?.count ?? 0),
    quotedTweetId: quotedStatus ?? null,
    replyToId: (legacy.in_reply_to_status_id_str as string) ?? null,
    isRetweet,
    retweetedBy,
  };
}

function parseUserFromResult(
  result: Record<string, unknown>
): NormalizedUser {
  const legacy = result.legacy as Record<string, unknown>;
  return {
    id: String(result.rest_id ?? legacy?.id_str ?? ""),
    handle: String(legacy?.screen_name ?? ""),
    name: String(legacy?.name ?? ""),
    bio: (legacy?.description as string) ?? null,
    avatarUrl:
      ((legacy?.profile_image_url_https as string) ?? "").replace(
        "_normal",
        "_400x400"
      ) || null,
    bannerUrl: (legacy?.profile_banner_url as string) ?? null,
    followersCount: Number(legacy?.followers_count ?? 0),
    followingCount: Number(legacy?.friends_count ?? 0),
    tweetCount: Number(legacy?.statuses_count ?? 0),
    joinDate: (legacy?.created_at as string) ?? null,
    verified:
      Boolean(result.is_blue_verified) || Boolean(legacy?.verified),
  };
}

// --- Adapter ---

export const twitterGuest: DataSourceAdapter = {
  name: "twitter-guest",

  async fetchTimeline(
    handle: string,
    cursor?: string
  ): Promise<TimelineResult> {
    const token = await getGuestToken();
    const headers = buildHeaders(token);

    // First get user ID via UserByScreenName
    const userVariables = JSON.stringify({
      screen_name: handle,
      withSafetyModeUserFields: true,
    });
    const userFeatures = JSON.stringify({
      hidden_profile_subscriptions_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
    });

    const userUrl = `${GRAPHQL_BASE}/G3KGOASz96M-Qu0nwmGXNg/UserByScreenName?variables=${encodeURIComponent(userVariables)}&features=${encodeURIComponent(userFeatures)}`;

    const userRes = await fetchWithTimeout(userUrl, { headers }, TIMEOUT);
    if (!userRes.ok) {
      throw new Error(
        `Twitter guest UserByScreenName failed: ${userRes.status}`
      );
    }

    const userData = (await userRes.json()) as Record<string, unknown>;
    const userDataResult = (userData.data as Record<string, unknown>)
      ?.user as Record<string, unknown>;
    const userResult = userDataResult?.result as Record<string, unknown>;

    if (!userResult || userResult.__typename === "UserUnavailable") {
      throw new Error(`User @${handle} not found or unavailable`);
    }

    const user = parseUserFromResult(userResult);
    const userId = user.id;

    // Now fetch timeline using UserTweets
    const timelineVariables = JSON.stringify({
      userId,
      count: 20,
      cursor: cursor ?? undefined,
      includePromotedContent: false,
      withQuickPromoteEligibilityTweetFields: false,
      withVoice: true,
      withV2Timeline: true,
    });

    const timelineUrl = `${GRAPHQL_BASE}/V7H0Ap3_Hh2FyS75OCDO3Q/UserTweets?variables=${encodeURIComponent(timelineVariables)}&features=${encodeURIComponent(TWEET_FEATURES)}&fieldToggles=${encodeURIComponent(FIELD_TOGGLES)}`;

    const timelineRes = await fetchWithTimeout(
      timelineUrl,
      { headers },
      TIMEOUT
    );
    if (!timelineRes.ok) {
      throw new Error(
        `Twitter guest UserTweets failed: ${timelineRes.status}`
      );
    }

    const timelineData = (await timelineRes.json()) as Record<string, unknown>;

    // Navigate the response structure
    const dataObj = timelineData.data as Record<string, unknown> | undefined;
    const userObj = dataObj?.user as Record<string, unknown> | undefined;
    const resultObj = userObj?.result as Record<string, unknown> | undefined;
    const timelineV2 = resultObj?.timeline_v2 as Record<string, unknown> | undefined;
    const timelineObj = timelineV2?.timeline as Record<string, unknown> | undefined;
    const instructions = timelineObj?.instructions as Array<Record<string, unknown>> | undefined;

    if (!instructions) {
      console.warn(`[TwitterGuest] No instructions in timeline response for @${handle}`);
    }

    const tweets: NormalizedTweet[] = [];
    let nextCursor: string | undefined;

    if (instructions) {
      for (const instruction of instructions) {
        const entries = (instruction.entries ??
          instruction.moduleItems) as Array<Record<string, unknown>>;

        if (!entries) continue;

        for (const entry of entries) {
          const entryId = String(entry.entryId ?? "");

          // Extract cursor
          if (entryId.startsWith("cursor-bottom")) {
            const cursorContent = entry.content as Record<string, unknown>;
            nextCursor = cursorContent?.value as string;
            continue;
          }

          // Extract tweets — match any tweet entry
          if (entryId.startsWith("tweet-") || entryId.startsWith("profile-conversation")) {
            const content = entry.content as Record<string, unknown>;
            if (!content) continue;

            if (content.entryType === "TimelineTimelineItem") {
              const itemContent = content.itemContent as Record<
                string,
                unknown
              >;
              if (itemContent?.itemType === "TimelineTweet") {
                const tweetResults = itemContent.tweet_results as Record<
                  string,
                  unknown
                >;
                if (tweetResults?.result) {
                  const tweet = extractTweetFromResult(
                    tweetResults.result as Record<string, unknown>
                  );
                  if (tweet) tweets.push(tweet);
                }
              }
            } else if (content.entryType === "TimelineTimelineModule") {
              // Thread/conversation module
              const items = content.items as Array<Record<string, unknown>>;
              if (items) {
                for (const item of items) {
                  const itemItem = item.item as Record<string, unknown>;
                  const itemContent = itemItem?.itemContent as Record<
                    string,
                    unknown
                  >;
                  if (itemContent?.itemType === "TimelineTweet") {
                    const tweetResults = itemContent.tweet_results as Record<
                      string,
                      unknown
                    >;
                    if (tweetResults?.result) {
                      const tweet = extractTweetFromResult(
                        tweetResults.result as Record<string, unknown>
                      );
                      if (tweet) tweets.push(tweet);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return { user, tweets, cursor: nextCursor };
  },

  async fetchTweet(
    id: string
  ): Promise<{ tweet: NormalizedTweet; thread?: NormalizedTweet[] }> {
    const token = await getGuestToken();
    const headers = buildHeaders(token);

    // Use TweetResultByRestId (more stable than TweetDetail)
    const variables = JSON.stringify({
      tweetId: id,
      withCommunity: false,
      includePromotedContent: false,
      withVoice: false,
    });

    const url = `${GRAPHQL_BASE}/sCU6ckfHY0CyJ4HFjPhjtg/TweetResultByRestId?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(TWEET_FEATURES)}&fieldToggles=${encodeURIComponent(FIELD_TOGGLES)}`;

    const res = await fetchWithTimeout(url, { headers }, TIMEOUT);
    if (!res.ok) {
      throw new Error(`Twitter guest TweetResultByRestId failed: ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const tweetResult = (data.data as Record<string, unknown>)
      ?.tweetResult as Record<string, unknown>;
    const result = tweetResult?.result as Record<string, unknown>;

    if (!result) {
      throw new Error(`Tweet ${id} not found`);
    }

    const tweet = extractTweetFromResult(result);
    if (!tweet) {
      throw new Error(`Tweet ${id} could not be parsed`);
    }

    return { tweet };
  },

  async fetchUser(handle: string): Promise<NormalizedUser> {
    const token = await getGuestToken();
    const headers = buildHeaders(token);

    const variables = JSON.stringify({
      screen_name: handle,
      withSafetyModeUserFields: true,
    });
    const features = JSON.stringify({
      hidden_profile_subscriptions_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
    });

    const url = `${GRAPHQL_BASE}/G3KGOASz96M-Qu0nwmGXNg/UserByScreenName?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;

    const res = await fetchWithTimeout(url, { headers }, TIMEOUT);
    if (!res.ok) {
      throw new Error(`Twitter guest UserByScreenName failed: ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const userDataResult = (data.data as Record<string, unknown>)
      ?.user as Record<string, unknown>;
    const userResult = userDataResult?.result as Record<string, unknown>;

    if (!userResult || userResult.__typename === "UserUnavailable") {
      throw new Error(`User @${handle} not found`);
    }

    return parseUserFromResult(userResult);
  },

  async searchTweets(
    query: string,
    cursor?: string
  ): Promise<SearchResult> {
    const token = await getGuestToken();
    const headers = buildHeaders(token);

    const variables = JSON.stringify({
      rawQuery: query,
      count: 20,
      cursor: cursor ?? undefined,
      querySource: "typed_query",
      product: "Latest",
    });

    const url = `${GRAPHQL_BASE}/MJpyQGqgklrVl_0X9gNy3A/SearchTimeline?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(TWEET_FEATURES)}`;

    const res = await fetchWithTimeout(url, { headers }, TIMEOUT);
    if (!res.ok) {
      throw new Error(`Twitter guest SearchTimeline failed: ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const searchTimeline = (data.data as Record<string, unknown>)
      ?.search_by_raw_query as Record<string, unknown>;
    const searchResults = searchTimeline?.search_timeline as Record<
      string,
      unknown
    >;
    const timeline = searchResults?.timeline as Record<string, unknown>;
    const instructions = timeline?.instructions as Array<
      Record<string, unknown>
    >;

    const tweets: NormalizedTweet[] = [];
    let nextCursor: string | undefined;

    if (instructions) {
      for (const instruction of instructions) {
        const entries = (instruction.entries ??
          instruction.moduleItems) as Array<Record<string, unknown>>;
        if (!entries) continue;

        for (const entry of entries) {
          const entryId = String(entry.entryId ?? "");
          const content = entry.content as Record<string, unknown>;

          if (entryId.startsWith("cursor-bottom")) {
            nextCursor = content?.value as string;
            continue;
          }

          if (content?.entryType === "TimelineTimelineItem") {
            const itemContent = content.itemContent as Record<
              string,
              unknown
            >;
            if (itemContent?.itemType === "TimelineTweet") {
              const tweetResults = itemContent.tweet_results as Record<
                string,
                unknown
              >;
              if (tweetResults?.result) {
                const tweet = extractTweetFromResult(
                  tweetResults.result as Record<string, unknown>
                );
                if (tweet) tweets.push(tweet);
              }
            }
          }
        }
      }
    }

    return { tweets, cursor: nextCursor };
  },
};
