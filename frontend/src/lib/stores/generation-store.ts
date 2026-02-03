import { create } from "zustand";
import { WizardStep } from "@/types/generation";
import { CombinationRecommendation } from "@/types/style";

interface GenerationState {
  // Wizard
  wizardOpen: boolean;
  step: WizardStep;

  // Input
  topic: string;
  textLabels: string[];
  selectedLayoutId: string | null;
  selectedStyleId: string | null;
  aspectRatio: string;
  language: string;

  // Results
  jobId: string | null;
  recommendations: CombinationRecommendation[];
  sourceJobId: string | null;

  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  setStep: (step: WizardStep) => void;
  setTopic: (topic: string) => void;
  setTextLabels: (labels: string[]) => void;
  selectLayout: (id: string) => void;
  selectStyle: (id: string) => void;
  selectCombination: (layoutId: string, styleId: string) => void;
  setAspectRatio: (ratio: string) => void;
  setLanguage: (language: string) => void;
  setJobId: (id: string) => void;
  setRecommendations: (recs: CombinationRecommendation[]) => void;
  setSourceJobId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  wizardOpen: false,
  step: "topic" as WizardStep,
  topic: "",
  textLabels: [],
  selectedLayoutId: null as string | null,
  selectedStyleId: null as string | null,
  aspectRatio: "16:9",
  language: "English",
  jobId: null as string | null,
  recommendations: [] as CombinationRecommendation[],
  sourceJobId: null as string | null,
};

export const useGenerationStore = create<GenerationState>((set) => ({
  ...initialState,

  openWizard: () => set({ wizardOpen: true, step: "topic" }),
  closeWizard: () => set({ wizardOpen: false }),
  setStep: (step) => set({ step }),
  setTopic: (topic) => set({ topic, sourceJobId: null }),
  setTextLabels: (labels) => set({ textLabels: labels }),
  selectLayout: (id) => set({ selectedLayoutId: id }),
  selectStyle: (id) => set({ selectedStyleId: id }),
  selectCombination: (layoutId, styleId) =>
    set({ selectedLayoutId: layoutId, selectedStyleId: styleId }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setLanguage: (language) => set({ language }),
  setJobId: (id) => set({ jobId: id }),
  setRecommendations: (recs) => set({ recommendations: recs }),
  setSourceJobId: (id) => set({ sourceJobId: id }),
  reset: () => set(initialState),
}));
