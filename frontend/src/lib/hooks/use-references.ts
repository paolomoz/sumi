"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLayouts, fetchStyles, fetchRecommendations } from "@/lib/api/client";

export function useLayouts() {
  return useQuery({
    queryKey: ["layouts"],
    queryFn: () => fetchLayouts(),
  });
}

export function useStyles() {
  return useQuery({
    queryKey: ["styles"],
    queryFn: () => fetchStyles(),
  });
}

export function useRecommendations(topic: string, enabled = false) {
  return useQuery({
    queryKey: ["recommendations", topic],
    queryFn: () => fetchRecommendations(topic),
    enabled: enabled && topic.length > 3,
  });
}
