"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { useGenerationStore } from "@/lib/stores/generation-store";

export function HomeHero() {
  const { openWizard, setTopic } = useGenerationStore();

  const handleSubmit = (text: string) => {
    setTopic(text);
    openWizard();
  };

  return (
    <ChatInput
      onSubmit={handleSubmit}
      placeholder="Describe your infographic topic..."
    />
  );
}
