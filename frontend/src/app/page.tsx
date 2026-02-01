"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { SkillChips } from "@/components/chat/skill-chips";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { StyleCatalogView } from "@/components/styles/style-catalog-view";

export default function Home() {
  const { openWizard, setTopic, setStep } = useGenerationStore();
  const { currentView } = useUIStore();

  const handleSubmit = (text: string) => {
    openWizard();
    setTopic(text);
    setStep("style");
  };

  if (currentView === "catalog") {
    return <StyleCatalogView />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4">
      <div className="w-full max-w-2xl space-y-8 -mt-20">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            What can I create for you?
          </h1>
          <p className="text-muted text-base">
            Describe a topic and choose from 126 artistic styles to generate a beautiful infographic.
          </p>
        </div>

        {/* Input */}
        <ChatInput
          onSubmit={handleSubmit}
          placeholder="Describe your infographic topic..."
        />

        {/* Skill chips */}
        <SkillChips />

        {/* How it works */}
        <div className="pt-12">
          <h2 className="text-center text-xs font-medium text-muted uppercase tracking-wider mb-6">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <HowItWorksStep
              number={1}
              title="Describe your topic"
              description="Enter the concept, process, or data you want to visualize."
            />
            <HowItWorksStep
              number={2}
              title="Choose a style"
              description="Pick from 126 artistic styles — from Ukiyo-e to Cyberpunk."
            />
            <HowItWorksStep
              number={3}
              title="Generate & download"
              description="AI creates your infographic with accurate, styled typography."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorksStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-2">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold">
        {number}
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted">{description}</p>
    </div>
  );
}
