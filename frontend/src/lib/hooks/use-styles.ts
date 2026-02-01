"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStyles, fetchStyle, fetchRecommendations } from "@/lib/api/client";

export function useStyles(params?: {
  category?: string;
  mood?: string;
  min_rating?: number;
  best_for?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["styles", params],
    queryFn: () => fetchStyles(params),
  });
}

export function useStyle(styleId: string | null) {
  return useQuery({
    queryKey: ["style", styleId],
    queryFn: () => fetchStyle(styleId!),
    enabled: !!styleId,
  });
}

export function useRecommendations(topic: string, enabled = false) {
  return useQuery({
    queryKey: ["recommendations", topic],
    queryFn: () => fetchRecommendations(topic),
    enabled: enabled && topic.length > 3,
  });
}
