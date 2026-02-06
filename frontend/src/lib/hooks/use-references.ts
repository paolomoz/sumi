"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLayouts, fetchStyles } from "@/lib/api/client";

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
