"use client";

import { create } from "zustand";
import type { TweetData, UserData, SourceHealthData } from "./api";

interface TimelineState {
  user: UserData | null;
  tweets: TweetData[];
  loading: boolean;
  error: string | null;
  cursor: string | null;
  cached: boolean;
  source: string;
  setTimeline: (user: UserData, tweets: TweetData[], cursor: string | null, source: string, cached: boolean) => void;
  appendTweets: (tweets: TweetData[], cursor: string | null) => void;
  prependTweets: (tweets: TweetData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  user: null,
  tweets: [],
  loading: false,
  error: null,
  cursor: null,
  cached: false,
  source: "",
  setTimeline: (user, tweets, cursor, source, cached) =>
    set({ user, tweets, cursor, source, cached, error: null }),
  appendTweets: (newTweets, cursor) =>
    set((state) => ({
      tweets: [...state.tweets, ...newTweets],
      cursor,
    })),
  prependTweets: (newTweets) =>
    set((state) => {
      const existingIds = new Set(state.tweets.map((t) => t.id));
      const fresh = newTweets.filter((t) => !existingIds.has(t.id));
      return { tweets: [...fresh, ...state.tweets] };
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  reset: () => set({ user: null, tweets: [], loading: false, error: null, cursor: null, cached: false, source: "" }),
}));

interface HealthState {
  sources: SourceHealthData[];
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  setSources: (sources: SourceHealthData[], status: string) => void;
}

export const useHealthStore = create<HealthState>((set) => ({
  sources: [],
  status: "unknown",
  setSources: (sources, status) => set({ sources, status: status as HealthState["status"] }),
}));
