// The real "server-only" package unconditionally throws when imported --
// Next's bundler swaps in a no-op stub only during its own build, and
// Vitest never goes through that resolution step. Mock it directly.
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const mockCreate = vi.hoisted(() => vi.fn());

// A real class, not vi.fn().mockImplementation() -- the latter isn't
// reliably constructible with `new` across mock factories in this setup.
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

const mockExtractRawText = vi.hoisted(() => vi.fn());
vi.mock("mammoth", () => ({
  default: { extractRawText: mockExtractRawText },
}));

import { parseResumeFromDocxBase64, parseResumeFromText } from "./resume-parse";

describe("parseResumeFromText", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("returns the fields the model extracted via the submit_resume_summary tool", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "submit_resume_summary",
          input: {
            headline: "Retail associate with 2 years of experience",
            city: "Sarasota",
            state: "FL",
            abilities: ["stocking shelves", "cash handling"],
            about: "Two years of retail experience.",
            history: [{ kind: "education", title: "High School Diploma", org: "Riverview High School", year: "2022" }],
          },
        },
      ],
    });

    const result = await parseResumeFromText("Some resume text");

    expect(result).toEqual({
      headline: "Retail associate with 2 years of experience",
      city: "Sarasota",
      state: "FL",
      abilities: ["stocking shelves", "cash handling"],
      about: "Two years of retail experience.",
      history: [{ kind: "education", title: "High School Diploma", org: "Riverview High School", year: "2022" }],
    });

    // Never invents facts: the system prompt sent to the model must say so.
    const call = mockCreate.mock.calls[0][0];
    const systemText = call.system[0].text as string;
    expect(systemText).toMatch(/only what this\s+resume actually states/i);
    expect(systemText).toMatch(/Do not add/i);
  });

  it("falls back to empty abilities/history when the model returns no tool_use block", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "I couldn't find a tool to call." }] });

    const result = await parseResumeFromText("Garbled input");

    expect(result).toEqual({ abilities: [], history: [] });
  });

  it("forces the model to call the extraction tool rather than free-text", async () => {
    mockCreate.mockResolvedValue({ content: [] });
    await parseResumeFromText("Some resume text");

    const call = mockCreate.mock.calls[0][0];
    expect(call.tool_choice).toEqual({ type: "tool", name: "submit_resume_summary" });
    expect(call.tools[0].name).toBe("submit_resume_summary");
  });
});

describe("parseResumeFromDocxBase64", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockExtractRawText.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  it("extracts text with mammoth first, then reuses the same text-parsing path", async () => {
    mockExtractRawText.mockResolvedValue({ value: "Resume text extracted from the .docx" });
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", name: "submit_resume_summary", input: { abilities: ["stocking shelves"], history: [] } }],
    });

    const result = await parseResumeFromDocxBase64(Buffer.from("fake docx bytes").toString("base64"));

    expect(mockExtractRawText).toHaveBeenCalledWith({ buffer: expect.any(Buffer) });
    const userMessage = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(userMessage).toContain("Resume text extracted from the .docx");
    expect(result.abilities).toEqual(["stocking shelves"]);
  });
});
