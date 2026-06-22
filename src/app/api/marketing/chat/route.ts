// POST /api/marketing/chat — AI Marketing Assistant
// Accepts conversation messages, sends to Claude with marketing tools,
// executes any tool calls server-side, returns final response.

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { chatWithClaude, ChatMessage } from "@/lib/marketing/claude";

export const runtime = "nodejs";
export const maxDuration = 60; // Claude tool loops can take a few seconds

export async function POST(req: NextRequest) {
  try {
    // Auth check — must be staff+
    const team = await requireTier(req, "staff");
    if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Parse request body
    const body = await req.json();
    const messages: ChatMessage[] = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 }
      );
    }

    // Validate message format
    for (const msg of messages) {
      if (!["user", "assistant"].includes(msg.role)) {
        return NextResponse.json(
          { error: `Invalid role: ${msg.role}. Must be 'user' or 'assistant'.` },
          { status: 400 }
        );
      }
    }

    // Call Claude with tool-calling loop
    const response = await chatWithClaude(messages, team.user.id);

    // Serialize content blocks for the client
    // Strip tool_use blocks from the final response (they're internal)
    const contentForClient = response.content
      .filter((block) => block.type === "text")
      .map((block) => ({
        type: block.type,
        text: (block as { text: string }).text,
      }));

    return NextResponse.json({
      content: contentForClient,
      stop_reason: response.stop_reason,
    });
  } catch (error) {
    console.error("[marketing/chat] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";

    // Specific error for missing API key
    if (message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        {
          error:
            "AI service not configured. Add ANTHROPIC_API_KEY to environment variables.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
