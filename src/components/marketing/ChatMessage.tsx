"use client";

// Single chat message bubble — renders user or assistant messages

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageData {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  loading?: boolean;
}

export default function ChatMessage({ message }: { message: MessageData }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-forest/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-forest" />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-forest text-sand rounded-br-md"
            : "bg-card border border-border/40 text-foreground rounded-bl-md"
        )}
      >
        {message.loading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-muted-foreground text-xs">Thinking…</span>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.text}</div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center">
          <User className="h-4 w-4 text-foreground" />
        </div>
      )}
    </div>
  );
}
