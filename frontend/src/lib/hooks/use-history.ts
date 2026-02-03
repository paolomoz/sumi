"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { fetchHistory } from "@/lib/api/client";

export function useHistory() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["history"],
    queryFn: fetchHistory,
    enabled: !!session,
    staleTime: 30_000,
  });
}

export function useInvalidateHistory() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["history"] }),
    [queryClient],
  );
}
