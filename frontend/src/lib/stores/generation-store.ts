import { create } from "zustand";
import { WizardStep } from "@/types/generation";
import { StyleRecommendation } from "@/types/style";

interface GenerationState {
  // Wizard
  wizardOpen: boolean;
  step: WizardStep;

  // Input
  topic: string;
  textLabels: string[];
  selectedStyleId: string | null;
  aspectRatio: string;

  // Results
  jobId: string | null;
  recommendations: StyleRecommendation[];

  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  setStep: (step: WizardStep) => void;
  setTopic: (topic: string) => void;
  setTextLabels: (labels: string[]) => void;
  selectStyle: (id: string) => void;
  setAspectRatio: (ratio: string) => void;
  setJobId: (id: string) => void;
  setRecommendations: (recs: StyleRecommendation[]) => void;
  reset: () => void;
}

const initialState = {
  wizardOpen: false,
  step: "topic" as WizardStep,
  topic: "",
  textLabels: [],
  selectedStyleId: null,
  aspectRatio: "9:16",
  jobId: null,
  recommendations: [],
};

export const useGenerationStore = create<GenerationState>((set) => ({
  ...initialState,

  openWizard: () => set({ wizardOpen: true, step: "topic" }),
  closeWizard: () => set({ wizardOpen: false }),
  setStep: (step) => set({ step }),
  setTopic: (topic) => set({ topic }),
  setTextLabels: (labels) => set({ textLabels: labels }),
  selectStyle: (id) => set({ selectedStyleId: id }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setJobId: (id) => set({ jobId: id }),
  setRecommendations: (recs) => set({ recommendations: recs }),
  reset: () => set(initialState),
}));
