import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { chatCompletion, isAIConfigured } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/careers/ai-review
 * Body: { application_id: string }
 *
 * Fetches the application + its job opening requirements, sends them
 * to the AI (lib/ai/client.ts — OpenAI-compatible), and stores:
 *   ai_score (0-100), ai_summary, ai_suggested_questions
 *
 * If AI is not configured, returns a helpful error.
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Set AI_API_KEY in environment variables." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const appId = String(body.application_id ?? "").trim();
    if (!appId) return NextResponse.json({ error: "application_id is required" }, { status: 400 });

    // Fetch application + opening
    const { data: app, error: appErr } = await supabaseAdmin()
      .from("job_applications")
      .select(`
        id, name, email, phone, cover_letter, resume_url, status,
        opening_id, opening_title, availability, start_date, bio,
        job_openings!inner (title, description, requirements, compensation)
      `)
      .eq("id", appId)
      .single();

    if (appErr || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const opening = (app as any).job_openings;
    const requirements = Array.isArray(opening?.requirements) ? opening.requirements : [];

    // Build the prompt
    const systemPrompt = `You are a hiring assistant for Kynda Coffee, a specialty coffee shop in Horseshoe Bay, TX. You review job applications and score them based on fit for the role. Be fair, concise, and constructive.`;

    const userPrompt = `Review this job application and provide a structured assessment.

## Position
Title: ${opening?.title ?? app.opening_title}
Description: ${opening?.description ?? ""}
Requirements: ${requirements.map((r: string) => `- ${r}`).join("\n")}
Compensation: ${opening?.compensation ?? "Not specified"}

## Applicant
Name: ${app.name}
Email: ${app.email}
Phone: ${app.phone ?? "Not provided"}
Cover Letter: ${app.cover_letter ?? "Not provided"}
Availability: ${(app as any).availability ?? "Not provided"}
Start Date: ${(app as any).start_date ?? "Not specified"}
Bio: ${(app as any).bio ?? "Not provided"}

## Instructions
Provide your assessment in this exact format:

SCORE: [0-100 integer]
SUMMARY: [2-3 sentence summary of the applicant's fit for this role]
QUESTIONS:
1. [interview question 1]
2. [interview question 2]
3. [interview question 3]

Score based on:
- Relevant experience mentioned in cover letter/bio (40%)
- Availability alignment (20%)
- Communication quality (20%)
- Enthusiasm and culture fit (20%)
- Lack of info should not penalize heavily — focus on what IS provided`;

    const result = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 600,
      temperature: 0.3,
    });

    // Parse the AI response
    const text = result.content;
    let score = 50;
    let summary = "";
    let questions: string[] = [];

    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    if (scoreMatch) score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));

    const summaryMatch = text.match(/SUMMARY:\s*(.*?)(?=\n\nQUESTIONS:|$)/is);
    if (summaryMatch) summary = summaryMatch[1].trim();

    const questionsMatch = text.match(/QUESTIONS:\s*\n?(.*?)(?:$)/is);
    if (questionsMatch) {
      const lines = questionsMatch[1].trim().split("\n").filter((l) => l.trim());
      questions = lines.map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean).slice(0, 5);
    }

    // Update the application
    const { error: updateErr } = await supabaseAdmin()
      .from("job_applications")
      .update({
        ai_score: score,
        ai_summary: summary,
        ai_suggested_questions: questions.length > 0 ? questions : null,
      })
      .eq("id", appId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      score,
      summary,
      questions,
      raw: text,
    });
  } catch (error) {
    console.error("AI review error", error);
    return NextResponse.json(
      { error: "AI review failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
