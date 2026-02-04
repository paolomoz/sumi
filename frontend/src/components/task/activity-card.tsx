type StepState = "pending" | "active" | "done";

interface ActivityCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  state: StepState;
}

function GreenCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="var(--color-primary)" opacity="0.15" />
      <path
        d="M5 8l2.5 2.5L11 6"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="animate-spin text-muted-foreground"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="28"
        strokeDashoffset="8"
      />
    </svg>
  );
}

export function ActivityCard({ icon, title, subtitle, state }: ActivityCardProps) {
  if (state === "active") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-accent/70 px-4 py-2.5">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <Spinner />
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border/60 px-4 py-2">
        <span className="shrink-0"><GreenCheck /></span>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    );
  }

  // pending
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border/40 px-4 py-2 opacity-35">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  );
}
