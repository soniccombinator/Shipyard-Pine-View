/**
 * Resume parsing -- the one Claude use case the team's kickoff decisions
 * name explicitly ("Claude for resume parsing"). Extracts suggested profile
 * fields from an uploaded resume; never writes them anywhere itself. The
 * caller (an onboarding screen, or a tool call from the Passport Guide
 * agent) is responsible for showing the person what was found and letting
 * them accept, edit, or reject it before anything is saved -- the same
 * confirm-before-save rule the voice agent already follows for about_raw/
 * about (see agent/agent_configs/passport-guide.json).
 *
 * Never invents a fact: the prompt below is explicit about extracting only
 * what's stated, and the schema has no field for anything that would require
 * guessing (no seniority score, no personality read, nothing evaluative).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { HistoryKind } from "@/lib/domain";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export interface ParsedHistoryItem {
  kind: HistoryKind;
  title: string;
  org?: string;
  year?: string;
  details?: string;
}

export interface ParsedResume {
  headline?: string;
  city?: string;
  state?: string;
  abilities: string[];
  about?: string;
  history: ParsedHistoryItem[];
}

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "submit_resume_summary",
  description: "Submit the extracted resume fields.",
  input_schema: {
    type: "object",
    properties: {
      headline: { type: "string", description: "A short one-line summary of the person's work, e.g. 'Retail associate with 2 years of customer service experience'. Omit if the resume doesn't support one." },
      city: { type: "string" },
      state: { type: "string", description: "Two-letter state code if present." },
      abilities: {
        type: "array",
        items: { type: "string" },
        description: "3 to 8 short, concrete abilities actually stated or clearly demonstrated by listed experience -- plain language, not resume jargon (e.g. 'stocking shelves' not 'inventory management proficiency').",
      },
      about: { type: "string", description: "A one or two sentence professional summary, built ONLY from facts in the resume. Omit rather than pad." },
      history: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["award", "education", "volunteer"] },
            title: { type: "string" },
            org: { type: "string" },
            year: { type: "string" },
            details: { type: "string" },
          },
          required: ["kind", "title"],
          additionalProperties: false,
        },
      },
    },
    required: ["abilities", "history"],
    additionalProperties: false,
  },
  strict: true,
};

const SYSTEM_PROMPT = `Turn this resume into structured profile fields, extracting only what this
resume actually states.

Never infer a skill from a job title alone -- only from experience the
resume describes doing. Do not add evaluative language ("excellent",
"highly skilled", "detail-oriented") unless those exact words appear in the
text. Never invent an employer, a date, an award, or a credential that
isn't written down. If a field isn't supported by the resume, leave it out
rather than guess.

Write abilities the way a job coach would say them out loud -- the concrete
thing the person did ("stocking shelves"), not resume phrasing ("inventory
management").`;

/**
 * text is the resume content already extracted to plain text (PDF text
 * layer, or a .docx/.txt upload read as text) -- callers on this project
 * upload to the "resumes" Storage bucket and should extract text before
 * calling this, or pass a base64 PDF via parseResumeFromPdfBase64 below.
 */
export async function parseResumeFromText(text: string): Promise<ParsedResume> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "submit_resume_summary" },
    messages: [{ role: "user", content: `Resume text:\n\n${text}` }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === "submit_resume_summary");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { abilities: [], history: [] };
  }
  const input = toolUse.input as ParsedResume;
  return { abilities: input.abilities ?? [], history: input.history ?? [], headline: input.headline, city: input.city, state: input.state, about: input.about };
}

/**
 * For a .doc/.docx resume, sent as base64. Claude's document API doesn't
 * read Word files directly (only PDF/plain text/images), so we extract the
 * text ourselves first and reuse the same text path -- same prompt, same
 * "never invent a fact" rules, no separate code path to keep in sync.
 */
export async function parseResumeFromDocxBase64(base64Docx: string): Promise<ParsedResume> {
  const buffer = Buffer.from(base64Docx, "base64");
  const { value: text } = await mammoth.extractRawText({ buffer });
  return parseResumeFromText(text);
}

/** For a PDF resume, sent as base64 -- no newlines in the string. */
export async function parseResumeFromPdfBase64(base64Pdf: string): Promise<ParsedResume> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "submit_resume_summary" },
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
          { type: "text", text: "Extract the resume fields from this document." },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use" && b.name === "submit_resume_summary");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { abilities: [], history: [] };
  }
  const input = toolUse.input as ParsedResume;
  return { abilities: input.abilities ?? [], history: input.history ?? [], headline: input.headline, city: input.city, state: input.state, about: input.about };
}
