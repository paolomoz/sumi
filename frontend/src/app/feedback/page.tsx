import Link from "next/link";

interface FeedbackItem {
  id: string;
  feedback: string;
  status: "implemented" | "in-progress" | "planned" | "reviewed";
  improvement?: string;
  date: string;
}

// Sample data - in production this would come from the database
const feedbackItems: FeedbackItem[] = [
  {
    id: "1",
    feedback: "The page loads slowly on mobile devices",
    status: "implemented",
    improvement: "Optimized image loading with lazy loading and WebP format",
    date: "2026-01-28",
  },
  {
    id: "2",
    feedback: "Would love keyboard shortcuts for common actions",
    status: "implemented",
    improvement: "Added ⌘K for quick actions, ⌘Enter to submit",
    date: "2026-01-25",
  },
  {
    id: "3",
    feedback: "Dark mode would be nice",
    status: "implemented",
    improvement: "Added system-aware dark mode with manual toggle",
    date: "2026-01-20",
  },
  {
    id: "4",
    feedback: "Export to PDF option needed",
    status: "in-progress",
    date: "2026-02-01",
  },
  {
    id: "5",
    feedback: "Add collaboration features for teams",
    status: "planned",
    date: "2026-02-03",
  },
];

const statusConfig = {
  implemented: {
    label: "Shipped",
    bg: "bg-green-500/10",
    text: "text-green-700 dark:text-green-400",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  "in-progress": {
    label: "In Progress",
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    icon: (
      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  planned: {
    label: "Planned",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  reviewed: {
    label: "Reviewed",
    bg: "bg-gray-500/10",
    text: "text-gray-700 dark:text-gray-400",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
};

export default function FeedbackPage() {
  const implemented = feedbackItems.filter((f) => f.status === "implemented");
  const inProgress = feedbackItems.filter((f) => f.status === "in-progress");
  const planned = feedbackItems.filter((f) => f.status === "planned");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sumi
        </Link>

        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Feedback & Improvements
        </h1>
        <p className="text-muted-foreground mb-10">
          Your feedback shapes Sumi. Here's how we've turned your suggestions into real improvements.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
            <div className="text-2xl font-semibold text-green-700 dark:text-green-400">
              {implemented.length}
            </div>
            <div className="text-sm text-muted-foreground">Shipped</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
              {inProgress.length}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <div className="text-2xl font-semibold text-amber-700 dark:text-amber-400">
              {planned.length}
            </div>
            <div className="text-sm text-muted-foreground">Planned</div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {feedbackItems.map((item) => {
            const config = statusConfig[item.status];
            return (
              <div
                key={item.id}
                className="p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-sm text-foreground">{item.feedback}</p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} flex-shrink-0`}
                  >
                    {config.icon}
                    {config.label}
                  </span>
                </div>
                {item.improvement && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border">
                    <svg
                      className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <p className="text-sm text-muted-foreground">{item.improvement}</p>
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground/60">
                  {new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
