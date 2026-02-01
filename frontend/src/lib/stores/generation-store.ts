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
};

export const useGenerationStore = create<GenerationState>((set) => ({
  ...initialState,

  openWizard: () => set({ wizardOpen: true, step: "topic" }),
  closeWizard: () => set({ wizardOpen: false }),
  setStep: (step) => set({ step }),
  setTopic: (topic) => set({ topic }),
  setTextLabels: (labels) => set({ textLabels: labels }),
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
