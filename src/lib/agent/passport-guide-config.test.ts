import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildTextOnboardingSystemPrompt } from "./text-onboarding-prompt";

/**
 * The Passport Guide talks with people with intellectual and developmental
 * disabilities. These tests pin the pacing and care settings so a future
 * tweak (or a dashboard export) cannot quietly speed the guide back up.
 */
const config = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../agent/agent_configs/passport-guide.json"), "utf8"),
) as {
  conversation_config: {
    tts: { speed: number; stability: number };
    turn: { turn_timeout: number; turn_eagerness?: string };
    conversation: { max_duration_seconds: number };
    agent: { first_message: string; prompt: { prompt: string } };
  };
};
const { tts, turn, conversation, agent } = config.conversation_config;

describe("voice guide pacing", () => {
  it("speaks noticeably slower than the default voice speed, but still naturally", () => {
    expect(tts.speed).toBeLessThanOrEqual(0.88);
    expect(tts.speed).toBeGreaterThanOrEqual(0.75);
  });

  it("waits patiently for people who need time to answer", () => {
    expect(turn.turn_timeout).toBeGreaterThanOrEqual(15);
    expect(turn.turn_eagerness).toBe("patient");
    // A slower conversation needs room to finish.
    expect(conversation.max_duration_seconds).toBeGreaterThanOrEqual(2400);
  });
});

describe("guide tone", () => {
  const voicePrompt = agent.prompt.prompt;
  const typedPrompt = buildTextOnboardingSystemPrompt("Nick", "Nothing saved yet.");

  it("opens gently and tells people they can go slowly", () => {
    expect(agent.first_message).toMatch(/slow|take your time/i);
    expect(agent.first_message).toMatch(/stop/i);
  });

  it("carries the same care rules in voice and typed mode", () => {
    for (const prompt of [voicePrompt, typedPrompt]) {
      expect(prompt).toMatch(/take your time/i);
      expect(prompt).toMatch(/capable adult/i);
      expect(prompt).toMatch(/simpler/i); // re-explain in simpler words, never repeat louder
      expect(prompt).toMatch(/frustrated|upset/i); // notice distress, offer a break
      expect(prompt).toMatch(/one question at a time/i);
    }
  });

  it("tells the voice to speak slowly with short sentences", () => {
    expect(voicePrompt).toMatch(/speak slowly/i);
    expect(voicePrompt).toMatch(/short sentences/i);
  });
});
