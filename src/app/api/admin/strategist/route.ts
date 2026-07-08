// /api/admin/strategist — AI Business CEO/Strategist
// GET: returns the business snapshot (no AI call)
// POST: sends user question + business snapshot to AI, returns strategic analysis

import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { getBusinessSnapshot, formatSnapshotForPrompt } from "@/lib/strategist/snapshot";
import { chatCompletion, isAIConfigured, getAIModel } from "@/lib/ai/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Kynda Coffee's AI Business CEO & Strategist. You have full access to the company's business data and help the owner (Jonathan Korstad) make strategic decisions to grow the business optimally.

ABOUT KYNDA COFFEE:
- Specialty coffee shop in Horseshoe Bay, Texas (Texas Hill Country)
- Name is Old Norse: "Kynda" means "to kindle a flame" — pronounced /KEN-DUH/
- Hours: 7am–5pm daily
- Owners: Jonathan and Briseida Korstad (KCM LLC = real estate, Kynda Coffee LLC = operations)
- Founded 2020, zero funding, community-driven
- Serves: espresso drinks, cold brew, specialty lattes, pastries, light food
- Also sells: merch (mugs, tees, totes), coffee bean subscriptions, gift cards
- Digital ordering: website, QR table ordering, kiosk, pickup, delivery (DoorDash/Uber Eats)
- POS: Square. Payments: Stripe. Merch fulfillment: Printful (dropship). Hosting: Coolify on VPS.
- Brand: organic, local, premium but approachable. Modern Artisan aesthetic.

YOUR ROLE:
- Analyze the business snapshot provided and identify trends, risks, and opportunities
- Give actionable, specific recommendations (not generic advice)
- Think like a CEO: revenue growth, cost control, customer retention, operational efficiency
- Consider the Hill Country market, seasonal patterns, and local competition
- Flag anomalies (revenue drops, waste spikes, stockouts) and suggest responses
- Help with strategic planning: pricing, product mix, marketing ROI, staffing, expansion
- Be direct and honest — if something looks bad, say so
- Use the business data provided to ground your analysis in real numbers

FORMAT:
- Lead with the most important insight or action item
- Use clear sections with headers when giving multi-part recommendations
- Include specific numbers and percentages when relevant
- End with 2-3 prioritized next steps when appropriate`;

/**
 * GET /api/admin/strategist — business snapshot dashboard data (no AI call)
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required" }, { status: 403 });

  try {
    const snapshot = await getBusinessSnapshot();
    return NextResponse.json({
      snapshot,
      ai_configured: isAIConfigured(),
      ai_model: getAIModel(),
    });
  } catch (error) {
    console.error("[strategist] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load business snapshot", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/strategist — ask the AI strategist a question
 * Body: { messages: [{ role, content }] }
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Owner access required" }, { status: 403 });

  if (!isAIConfigured()) {
    return NextResponse.json(
      {
        error: "AI not configured. Set AI_API_KEY (and optionally AI_BASE_URL, AI_MODEL) in environment variables. Works with OpenRouter, OpenAI, or any OpenAI-compatible API.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    // Get the latest business snapshot
    const snapshot = await getBusinessSnapshot();
    const snapshotText = formatSnapshotForPrompt(snapshot);

    // Prepend the snapshot to the latest user message
    const contextualizedMessages = [...messages];
    const lastUserIdx = contextualizedMessages.length - 1 - [...contextualizedMessages].reverse().findIndex((m) => m.role === "user");
    if (contextualizedMessages[lastUserIdx]?.role === "user") {
      contextualizedMessages[lastUserIdx] = {
        ...contextualizedMessages[lastUserIdx],
        content: `${snapshotText}\n\n---\n\nUSER QUESTION:\n${contextualizedMessages[lastUserIdx].content}`,
      };
    }

    const result = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...contextualizedMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      maxTokens: 4096,
      temperature: 0.7,
    });

    return NextResponse.json({
      content: result.content,
      model: result.model,
      snapshot,
    });
  } catch (error) {
    console.error("[strategist] POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
