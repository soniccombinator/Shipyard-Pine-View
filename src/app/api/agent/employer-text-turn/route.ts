import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildEmployerOnboardingSystemPrompt } from "@/lib/agent/employer-onboarding-prompt";
import { EMPLOYER_ONBOARDING_TOOLS } from "@/lib/agent/employer-onboarding-tools";

/**
 * One turn of the Claude-powered Employer Guide -- the employer-side
 * counterpart to text-turn/route.ts. No auth check here: this route never
 * touches Supabase -- it only decides what to say and which tool to call
 * next. Tool EXECUTION happens back in the browser
 * (src/components/agent/employer-text-onboarding.tsx) through
 * buildEmployerClientTools(), so a save always goes through the signed-in
 * employer's own Supabase session (RLS applies). This route is stateless:
 * the client resends the full message history every turn.
 *
 * Model: claude-sonnet-5, not claude-fable-5-1 -- same reasoning as
 * text-turn/route.ts: Fable 5.1 needs 30-day data retention configured on
 * the org, which this code can't verify. tool_choice stays "auto" (forced
 * tool_choice is what Fable 5.1 rejects, and this route never uses it), so
 * swapping models later needs no other change here.
 */
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const messages = body?.messages as Anthropic.MessageParam[] | undefined;
  const userFirstName: string = body?.userFirstName ?? "there";
  const companyStatus: string = body?.companyStatus ?? "Nothing saved yet.";

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: [
        { type: "text", text: buildEmployerOnboardingSystemPrompt(userFirstName, companyStatus), cache_control: { type: "ephemeral" } },
      ],
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      tool_choice: { type: "auto" },
      tools: EMPLOYER_ONBOARDING_TOOLS,
      messages,
    });

    return NextResponse.json({ content: response.content, stopReason: response.stop_reason });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The guide is not available right now." },
      { status: 502 }
    );
  }
}
