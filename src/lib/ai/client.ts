// Unified AI client for Kynda Coffee.
// Works with any OpenAI-compatible API endpoint:
// - OpenRouter (https://openrouter.ai/api/v1) — access any model
// - OpenAI (https://api.openai.com/v1)
// - Local LM Studio (http://127.0.0.1:1234/v1)
// - Any other OpenAI-compatible server
//
// Config via environment variables:
//   AI_API_KEY  — API key (required for hosted providers)
//   AI_BASE_URL — API base URL (default: https://openrouter.ai/api/v1)
//   AI_MODEL    — Model name (default: anthropic/claude-3.5-sonnet)
//
// Falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY if AI_API_KEY is not set,
// for backward compatibility with existing deployments.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function getConfig() {
  const apiKey = process.env.AI_API_KEY
    ?? process.env.OPENAI_API_KEY
    ?? process.env.ANTHROPIC_API_KEY
    ?? "";

  const baseUrl = process.env.AI_BASE_URL
    ?? "https://openrouter.ai/api/v1";

  const model = process.env.AI_MODEL
    ?? "anthropic/claude-3.5-sonnet";

  return { apiKey, baseUrl, model };
}

export function isAIConfigured(): boolean {
  const { apiKey } = getConfig();
  return apiKey.length > 0;
}

export function getAIModel(): string {
  return getConfig().model;
}

/**
 * Send a chat completion request to any OpenAI-compatible API.
 * Returns the text response.
 */
export async function chatCompletion(options: ChatOptions): Promise<ChatResult> {
  const { apiKey, baseUrl, model: defaultModel } = getConfig();

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY (or OPENAI_API_KEY / ANTHROPIC_API_KEY) is not configured. " +
      "Set AI_API_KEY and AI_BASE_URL in your environment to use AI features."
    );
  }

  const model = options.model ?? defaultModel;
  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      // OpenRouter optional headers (ignored by other providers)
      "HTTP-Referer": "https://kyndacoffee.com",
      "X-Title": "Kynda Coffee",
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage;

  return { content, model, usage };
}

/**
 * Simple convenience wrapper — system prompt + user message → text response.
 */
export async function askAI(
  systemPrompt: string,
  userMessage: string,
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    ...options,
  });
  return result.content;
}
