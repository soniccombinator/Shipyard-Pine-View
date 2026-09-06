import type Anthropic from "@anthropic-ai/sdk";

/**
 * Tool schemas for the Claude-powered Employer Guide -- the employer-side
 * counterpart to text-onboarding-tools.ts. Names and shapes here must match
 * src/lib/agent/employer-client-tools.ts exactly, the same rule
 * text-onboarding-tools.ts follows for the employee side.
 *
 * strict:true guarantees Claude's arguments validate against the schema
 * before the client ever sees them. tool_choice stays "auto" -- the system
 * prompt is what tells the model when to call each one.
 */
export const EMPLOYER_ONBOARDING_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_company_status",
    description: "Check which sections of the company profile are already saved and which are still missing.",
    input_schema: { type: "object", properties: {}, additionalProperties: false, required: [] },
    strict: true,
  },
  {
    name: "save_company_basics",
    description: "Save the company's name, city, state, and website.",
    input_schema: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        city: { type: "string" },
        state: { type: "string", description: "Two-letter US state code." },
        website: { type: "string", description: "Optional. Leave out if they don't have one." },
      },
      additionalProperties: false,
      required: [],
    },
    strict: true,
  },
  {
    name: "save_description",
    description: "Save two or three plain sentences describing the company for job seekers to read.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string" },
      },
      additionalProperties: false,
      required: ["description"],
    },
    strict: true,
  },
  {
    name: "save_accommodations",
    description: "Replace the list of accommodations this employer can provide, e.g. written checklists or a consistent trainer.",
    input_schema: {
      type: "object",
      properties: {
        accommodations: {
          type: "string",
          description: 'Comma-separated list, e.g. "written checklists, a consistent trainer, a quiet workspace".',
        },
      },
      additionalProperties: false,
      required: ["accommodations"],
    },
    strict: true,
  },
  {
    name: "finish_employer_onboarding",
    description: "Wrap up once the company name and city are saved, and point the employer to posting their first job.",
    input_schema: { type: "object", properties: {}, additionalProperties: false, required: [] },
    strict: true,
  },
];
