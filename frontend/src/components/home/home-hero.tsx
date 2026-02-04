"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { useGenerationStore } from "@/lib/stores/generation-store";

export function HomeHero() {
  const { openWizard, setTopic, setStep } = useGenerationStore();

  const handleSubmit = (text: string) => {
    openWizard();
    setTopic(text);
    setStep("style");
  };

  return (
    <ChatInput
      onSubmit={handleSubmit}
      placeholder="Describe your infographic topic..."
    />
  );
}
