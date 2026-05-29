// Marketing AI tool definitions for Claude's tool_use API
// These are the "tools" the AI assistant can invoke during a chat session.

import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages";

export const MARKETING_TOOLS: Tool[] = [
  {
    name: "generate_social_post",
    description:
      "Generate a social media post for a specific platform and topic. Returns platform-appropriate copy with hashtags and optional image suggestion.",
    input_schema: {
      type: "object" as const,
      properties: {
        platform: {
          type: "string",
          enum: ["instagram", "twitter", "facebook", "tiktok"],
          description: "Target social media platform",
        },
        topic: {
          type: "string",
          description:
            "What the post is about (e.g. 'new Ethiopian single-origin', 'weekend brunch special', 'barista spotlight')",
        },
        tone: {
          type: "string",
          enum: ["casual", "professional", "playful", "inspirational"],
          description: "Desired tone of voice (default: casual)",
        },
        include_hashtags: {
          type: "boolean",
          description: "Whether to include relevant hashtags (default: true)",
        },
      },
      required: ["platform", "topic"],
    },
  },
  {
    name: "create_image_caption",
    description:
      "Generate an engaging caption and alt-text for a marketing image. Describe what the image shows and suggest a compelling social caption.",
    input_schema: {
      type: "object" as const,
      properties: {
        image_description: {
          type: "string",
          description:
            "Brief description of what the image contains (e.g. 'latte art in a ceramic mug on marble counter')",
        },
        brand_context: {
          type: "string",
          description:
            "Additional brand context (e.g. 'for our new seasonal menu launch')",
        },
      },
      required: ["image_description"],
    },
  },
  {
    name: "suggest_hashtags",
    description:
      "Suggest a set of relevant hashtags for a social post. Returns grouped by category (brand, niche, trending, location).",
    input_schema: {
      type: "object" as const,
      properties: {
        post_text: {
          type: "string",
          description: "The post text to generate hashtags for",
        },
        platform: {
          type: "string",
          enum: ["instagram", "twitter", "facebook", "tiktok"],
          description: "Target platform (affects count and style)",
        },
        count: {
          type: "number",
          description: "Max number of hashtags to suggest (default: 15)",
        },
      },
      required: ["post_text", "platform"],
    },
  },
  {
    name: "schedule_post",
    description:
      "Save a social post draft with a scheduled publish time. The post is stored for later review and publishing via the admin social posts page.",
    input_schema: {
      type: "object" as const,
      properties: {
        platform: {
          type: "string",
          enum: ["instagram", "twitter", "facebook"],
          description: "Target platform",
        },
        text: {
          type: "string",
          description: "The full post text including any hashtags",
        },
        image_url: {
          type: "string",
          description: "URL of the image to attach (optional)",
        },
        publish_at: {
          type: "string",
          description:
            "ISO 8601 date/time to publish (e.g. '2026-06-15T09:00:00-05:00')",
        },
      },
      required: ["platform", "text", "publish_at"],
    },
  },
  {
    name: "generate_weekly_calendar",
    description:
      "Generate a week's worth of social media post ideas organized by day and platform. Helps plan consistent content.",
    input_schema: {
      type: "object" as const,
      properties: {
        week_start: {
          type: "string",
          description: "Start date of the week (e.g. '2026-06-16')",
        },
        platforms: {
          type: "array",
          items: { type: "string" },
          description:
            "Platforms to plan for (e.g. ['instagram', 'facebook'])",
        },
        focus_areas: {
          type: "array",
          items: { type: "string" },
          description:
            "Topics to emphasize this week (e.g. ['new menu items', 'staff spotlight'])",
        },
      },
      required: ["week_start", "platforms"],
    },
  },
];
