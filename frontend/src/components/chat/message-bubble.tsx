import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 py-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
          S
        </div>
      )}
      <div
        className={cn(
          "max-w-md rounded-[var(--radius-lg)] px-4 py-2.5 text-sm",
          isUser
            ? "bg-foreground text-background"
            : "bg-accent text-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
