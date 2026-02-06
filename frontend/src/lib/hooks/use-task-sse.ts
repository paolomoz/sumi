"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { StepDataMap } from "@/types/generation";

interface TaskSSEState {
  status: string | null;
  progress: number;
  message: string;
  stepData: StepDataMap;
  result: {
    image_url: string | null;
    layout_id: string | null;
    layout_name: string | null;
    style_id: string | null;
    style_name: string | null;
    mode?: string | null;
  } | null;
  connected: boolean;
}

const TERMINAL_STATUSES = ["completed", "failed"];

export function useTaskSSE(jobId: string | null) {
  const [state, setState] = useState<TaskSSEState>({
    status: null,
    progress: 0,
    message: "",
    stepData: {},
    result: null,
    connected: false,
  });

  const esRef = useRef<EventSource | null>(null);

  const close = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setState((s) => ({ ...s, connected: false }));
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    esRef.current = es;

    es.onopen = () => {
      setState((s) => ({ ...s, connected: true }));
    };

    es.addEventListener("status", (e) => {
      const data = JSON.parse(e.data);
      setState((s) => ({
        ...s,
        status: data.status,
        progress: data.progress,
        message: data.message,
      }));
    });

    es.addEventListener("step_data", (e) => {
      const data = JSON.parse(e.data);
      setState((s) => ({
        ...s,
        stepData: {
          ...s.stepData,
          [data.step]: data.data,
        },
      }));
    });

    es.addEventListener("result", (e) => {
      const data = JSON.parse(e.data);
      setState((s) => ({
        ...s,
        result: data,
      }));
    });

    es.onerror = () => {
      // EventSource auto-reconnects, but if terminal, close
      setState((s) => {
        if (s.status && TERMINAL_STATUSES.includes(s.status)) {
          es.close();
          return { ...s, connected: false };
        }
        return s;
      });
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId]);

  // Auto-close on terminal status
  useEffect(() => {
    if (state.status && TERMINAL_STATUSES.includes(state.status)) {
      // Give a small delay to ensure result event arrives
      const timer = setTimeout(close, 500);
      return () => clearTimeout(timer);
    }
  }, [state.status, close]);

  return state;
}
