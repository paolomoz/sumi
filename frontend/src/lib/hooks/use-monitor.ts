"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchStats,
  fetchLeaderboard,
  fetchStyles,
  fetchGenerations,
  fetchMultiStyle,
  fetchFeedback,
} from "@/lib/api/monitor";

export function useMonitorStats(key: string) {
  return useQuery({
    queryKey: ["monitor", "stats", key],
    queryFn: () => fetchStats(key),
    enabled: !!key,
    refetchInterval: 30_000,
  });
}

export function useMonitorLeaderboard(key: string) {
  return useQuery({
    queryKey: ["monitor", "leaderboard", key],
    queryFn: () => fetchLeaderboard(key),
    enabled: !!key,
    staleTime: 30_000,
  });
}

export function useMonitorStyles(key: string) {
  return useQuery({
    queryKey: ["monitor", "styles", key],
    queryFn: () => fetchStyles(key),
    enabled: !!key,
    staleTime: 30_000,
  });
}

export function useMonitorGenerations(key: string, limit: number, offset: number) {
  return useQuery({
    queryKey: ["monitor", "generations", key, limit, offset],
    queryFn: () => fetchGenerations(key, limit, offset),
    enabled: !!key,
    staleTime: 30_000,
  });
}

export function useMonitorMultiStyle(key: string) {
  return useQuery({
    queryKey: ["monitor", "multi-style", key],
    queryFn: () => fetchMultiStyle(key),
    enabled: !!key,
    staleTime: 30_000,
  });
}

export function useMonitorFeedback(key: string, limit: number, offset: number) {
  return useQuery({
    queryKey: ["monitor", "feedback", key, limit, offset],
    queryFn: () => fetchFeedback(key, limit, offset),
    enabled: !!key,
    staleTime: 30_000,
  });
}
