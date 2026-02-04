import { create } from "zustand";
import { CombinationRecommendation } from "@/types/style";

interface GenerationState {
  // Input
  topic: string;
  selectedLayoutId: string | null;
  selectedStyleId: string | null;
  aspectRatio: string;
  language: string;

  // Results
  jobId: string | null;
  recommendations: CombinationRecommendation[];

  // Actions
  setTopic: (topic: string) => void;
  selectLayout: (id: string) => void;
  selectStyle: (id: string) => void;
  selectCombination: (layoutId: string, styleId: string) => void;
  setAspectRatio: (ratio: string) => void;
  setLanguage: (language: string) => void;
  setJobId: (id: string) => void;
  setRecommendations: (recs: CombinationRecommendation[]) => void;
  reset: () => void;
}

const initialState = {
  topic: "",
  selectedLayoutId: null as string | null,
  selectedStyleId: null as string | null,
  aspectRatio: "16:9",
  language: "English",
  jobId: null as string | null,
  recommendations: [] as CombinationRecommendation[],
};

export const useGenerationStore = create<GenerationState>((set) => ({
  ...initialState,

  setTopic: (topic) => set({ topic }),
  selectLayout: (id) => set({ selectedLayoutId: id }),
  selectStyle: (id) => set({ selectedStyleId: id }),
  selectCombination: (layoutId, styleId) =>
    set({ selectedLayoutId: layoutId, selectedStyleId: styleId }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setLanguage: (language) => set({ language }),
  setJobId: (id) => set({ jobId: id }),
  setRecommendations: (recs) => set({ recommendations: recs }),
  reset: () => set(initialState),
}));
