"use client";

import { useGenerationStore } from "@/lib/stores/generation-store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { StepTopic } from "./step-topic";
import { StepLayout } from "./step-layout";
import { StepStyle } from "./step-style";
import { StepConfirm } from "./step-confirm";
import { StepProgress } from "./step-progress";
import { StepResult } from "./step-result";

const stepComponents = {
  topic: StepTopic,
  layout: StepLayout,
  style: StepStyle,
  confirm: StepConfirm,
  progress: StepProgress,
  result: StepResult,
};

const stepTitles: Record<string, string> = {
  topic: "Describe your infographic",
  layout: "Choose a layout",
  style: "Choose an artistic style",
  confirm: "Review & generate",
  progress: "Creating your infographic",
  result: "Your infographic is ready",
};

export function GenerationWizard() {
  const { wizardOpen, closeWizard, step } = useGenerationStore();
  const StepComponent = stepComponents[step];

  return (
    <Dialog open={wizardOpen} onOpenChange={(open) => !open && closeWizard()}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <VisuallyHidden.Root>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
        </VisuallyHidden.Root>
        <StepComponent />
      </DialogContent>
    </Dialog>
  );
}
