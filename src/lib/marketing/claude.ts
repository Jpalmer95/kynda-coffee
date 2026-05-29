// Claude AI wrapper for the Marketing Chat assistant
// Handles tool-calling loop: send messages → Claude may call tools → execute → send back → repeat

import Anthropic from "@anthropic-ai/sdk";
import { MARKETING_TOOLS } from "./tools/definitions";
import { executeMarketingTool } from "./tools/executor";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | Anthropic.ContentBlock[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  userId: string;
}

export interface ChatResponse {
  content: Anthropic.ContentBlock[];
  stop_reason: string | null;
}

const SYSTEM_PROMPT = `You are Kynda Coffee's AI Marketing Assistant. You help the owner and staff create compelling social media content.

ABOUT KYNDА COFFEE:
- Specialty coffee shop in Horseshoe Bay, Texas (Hill Country)
- Name is Old Norse: "Kynda" means "to kindle a flame" — pronounced /KEN-DUH/
- Hours: 7am–5pm daily
- Owners: Jonathan and Briseida Korstad (Korstad Capital Management LLC)
- Brand voice: warm, craft-focused, approachable, premium but never pretentious
- Colors: charcoal/grey + forest green (Modern Artisan)
- Serves: espresso drinks, cold brew, specialty lattes, pastries, light food
- Also sells: merch (mugs, tees, totes), coffee bean subscriptions
- Community-focused, local, supports Texas makers

YOUR CAPABILITIES:
You have tools to help with marketing:
- generate_social_post: Create platform-specific posts (Instagram, Twitter/X, Facebook, TikTok)
- create_image_caption: Generate captions and alt-text for photos
- suggest_hashtags: Recommend hashtags grouped by brand, niche, trending, location
- schedule_post: Queue a post for later publishing
- generate_weekly_calendar: Plan a week of content ideas

GUIDELINES:
- Always stay on-brand (warm, craft, specialty coffee)
- Suggest the right tool when the user's request matches a capability
- Format responses with clear sections (post text, hashtags, CTA)
- When asked to write a post without specifying platform, ask or default to Instagram
- For weekly planning, always suggest a mix of content types
- Include local hashtags (#HorseshoeBayTX, #TexasCoffee, #HillCountry) when relevant
- Keep Instagram captions under 2,200 chars, Twitter under 280
- Encourage engagement (questions, polls, UGC)
- Never fabricate statistics about Kynda's actual business performance`;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not set. Add it to .env.local and Coolify.");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Send a conversation to Claude and execute any tool calls in a loop
 * until Claude produces a final text response.
 */
export async function chatWithClaude(
  messages: ChatMessage[],
  userId: string
): Promise<ChatResponse> {
  const client = getClient();

  // Convert our ChatMessage format to Anthropic's MessageParam
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : m.content,
  }));

  // Loop: send messages → if tool_use → execute → send result back → repeat
  let currentMessages = [...anthropicMessages];
  const MAX_TURNS = 5; // prevent infinite tool loops

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: MARKETING_TOOLS,
      messages: currentMessages,
    });

    const hasToolUse = response.content.some(
      (block) => block.type === "tool_use"
    );

    if (!hasToolUse) {
      // Final text response — done
      return { content: response.content, stop_reason: response.stop_reason };
    }

    // Execute each tool_use block and build the tool_result messages
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeMarketingTool(
          block.name,
          block.input as Record<string, unknown>,
          userId
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.text,
        });
      }
    }

    // Append assistant's tool_use message and our tool_result, then loop
    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults },
    ];
  }

  // Fallback if max turns reached
  return {
    content: [
      {
        type: "text" as const,
        text: "I've reached the maximum number of tool calls for this request. Please try breaking your request into smaller steps.",
      },
    ] as Anthropic.ContentBlock[],
    stop_reason: "max_turns",
  };
}
