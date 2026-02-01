"use client";

import { Chip } from "@/components/ui/chip";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useUIStore } from "@/lib/stores/ui-store";

const skills = [
  { id: "infographic", label: "Create Infographic", primary: true as const },
  { id: "browse", label: "Browse Styles", primary: false as const },
  { id: "recommend", label: "Get Recommendations", primary: false as const },
];

export function SkillChips() {
  const { openWizard } = useGenerationStore();
  const { setView } = useUIStore();

  const handleClick = (id: string) => {
    if (id === "infographic") {
      openWizard();
    } else if (id === "browse") {
      setView("catalog");
    } else if (id === "recommend") {
      openWizard();
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {skills.map((skill) => (
        <Chip
          key={skill.id}
          variant={skill.primary ? "primary" : "outline"}
          onClick={() => handleClick(skill.id)}
        >
          {skill.primary && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {skill.label}
        </Chip>
      ))}
    </div>
  );
}
