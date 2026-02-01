"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { startGeneration, fetchJobStatus } from "@/lib/api/client";
import { GenerateRequest } from "@/types/generation";

export function useStartGeneration() {
  return useMutation({
    mutationFn: (request: GenerateRequest) => startGeneration(request),
  });
}

export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000;
    },
  });
}
