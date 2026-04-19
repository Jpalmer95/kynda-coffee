import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/marketing/agent — AI marketing agent chat
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1]?.content ?? "";

    // Detect if user wants to create content
    const isDraftRequest =
      /draft|write|create|compose|make|generate|plan/i.test(lastMessage);
    const isEmail = /email|newsletter|welcome|abandoned|cart/i.test(lastMessage);
    const isSms = /sms|text|message/i.test(lastMessage);
    const isSocial =
      /social|instagram|facebook|tiktok|post|content/i.test(lastMessage);

    // Build system prompt with Kynda context
    const systemPrompt = `You are the Kynda Coffee Marketing Agent. Kynda is a specialty organic coffee shop in Horseshoe Bay, Texas, founded in 2020.

Brand voice: Warm, authentic, down-to-earth. We're a bootstrapped, passionate small business. We speak like a friend who happens to make incredible coffee.

Current products:
- Coffee beans: Morning Ritual Blend ($18), Hill Country Dark ($19), Sunrise Light ($17), Kynda Espresso ($20)
- Merch: Ceramic Mug ($24), Classic Tee ($32), Hoodie ($55), Tote ($18)
- Coffee Club subscription: $16/mo with 10% off

When creating marketing content:
1. Keep it authentic and warm, never corporate
2. Mention specific products naturally
3. Include a clear call-to-action
4. For emails: include subject line, preview text, and body
5. For SMS: keep under 160 characters
6. For social: include caption, hashtags, and posting notes
7. Always indicate when content needs human approval before sending

Respond conversationally. If the user asks you to draft something, create the draft and clearly mark it as needing approval.`;

    // Call the LLM (using a simple completion for now)
    // In production, this would use OpenAI/Anthropic API
    const response = await generateAgentResponse(
      systemPrompt,
      messages,
      lastMessage,
      isDraftRequest,
      isEmail,
      isSms,
      isSocial
    );

    return NextResponse.json(response);
  } catch (err) {
    console.error("Marketing agent error:", err);
    return NextResponse.json(
      { error: "Agent error", response: "Sorry, something went wrong. Let me try again." },
      { status: 500 }
    );
  }
}

async function generateAgentResponse(
  systemPrompt: string,
  messages: any[],
  lastMessage: string,
  isDraftRequest: boolean,
  isEmail: boolean,
  isSms: boolean,
  isSocial: boolean
): Promise<{ response: string; draft?: any }> {
  // Simple response generation based on intent
  // In production, this would call OpenAI/Anthropic with the full conversation

  if (isDraftRequest && isEmail) {
    return {
      response: "Here's a draft email for you. Review it below and approve or reject when ready!",
      draft: {
        id: `draft-${Date.now()}`,
        type: "email",
        subject: "Your Morning Just Got Better ☕",
        content: `Hey there,\n\nWe just roasted a fresh batch of our Morning Ritual Blend and it's tasting incredible — smooth chocolate and caramel notes that make every sip feel like a warm hug.\n\nUse code KYNDAMORN10 for 10% off your next order.\n\nSee you at the shop or order online!\n— The Kynda Team\n\n4315 FM 2147, Horseshoe Bay, TX`,
        audience: "email_subscribers",
        status: "pending_approval",
        created_at: new Date().toISOString(),
        ai_generated: true,
      },
    };
  }

  if (isDraftRequest && isSms) {
    return {
      response: "Here's a short SMS draft. Remember, best SMS promos are short and create urgency!",
      draft: {
        id: `draft-${Date.now()}`,
        type: "sms",
        content: "Kynda Coffee: Fresh roasts just dropped! ☕ Order online today & get free shipping over $50. kyndacoffee.com/shop",
        audience: "sms_subscribers",
        status: "pending_approval",
        created_at: new Date().toISOString(),
        ai_generated: true,
      },
    };
  }

  if (isDraftRequest && isSocial) {
    return {
      response: "Here's an Instagram post draft. I've included caption and hashtag suggestions!",
      draft: {
        id: `draft-${Date.now()}`,
        type: "social",
        platform: "instagram",
        content: `There's something magical about that first sip in the morning. ☕\n\nOur Hill Country Dark is for those who like their coffee bold — full-bodied with a smoky finish that pairs perfectly with sunrise views over the Texas Hill Country.\n\nLink in bio to order yours.\n\n#KyndaCoffee #SpecialtyCoffee #OrganicCoffee #TexasCoffee #HorseshoeBay #HillCountry #CoffeeLovers #MorningRitual #SmallBatchCoffee #TexasMade`,
        audience: "instagram_followers",
        status: "pending_approval",
        created_at: new Date().toISOString(),
        ai_generated: true,
      },
    };
  }

  if (isDraftRequest) {
    return {
      response:
        "I'd love to help with that! Could you tell me more about what kind of content you need?\n\n• Email campaign (new product launch, seasonal promo, win-back)\n• SMS blast (flash sale, restock alert)\n• Social media post (Instagram, Facebook)\n• Content calendar / strategy\n\nJust describe what you're thinking and I'll draft it for your approval!",
    };
  }

  // General conversation
  return {
    response: getGeneralResponse(lastMessage),
  };
}

function getGeneralResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("strategy") || lower.includes("plan")) {
    return "Great question! Here's what I'd recommend for Kynda's marketing:\n\n1. **Weekly email** — Feature a different roast each week with tasting notes\n2. **Social rhythm** — 3-4 posts per week: 1 product, 1 behind-the-scenes, 1 community, 1 promo\n3. **SMS** — Use sparingly for high-impact moments (new drops, flash sales)\n4. **Loyalty** — Promote Coffee Club subscription in every touchpoint\n\nWant me to draft content for any of these?";
  }

  if (lower.includes("help") || lower.includes("what can")) {
    return "I can help you with:\n\n**Content Creation:**\n• Draft emails (welcome series, promos, newsletters)\n• Write SMS campaigns\n• Create social media posts\n\n**Strategy:**\n• Plan weekly content calendars\n• Suggest campaign ideas\n• Analyze what's working\n\n**Automation:**\n• Set up email sequences\n• Plan loyalty program outreach\n\nJust tell me what you need!";
  }

  return "That's a great idea! Want me to draft something specific? I can create emails, SMS messages, or social posts — all ready for your review before anything goes out.";
}
