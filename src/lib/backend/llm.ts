import { z } from 'zod';
import { createServiceDb } from '@/lib/backend/db/server';
import { getServerEnv } from '@/lib/backend/env';

const responseSchema = z.object({
  id: z.string(),
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  usage: z.object({ input_tokens: z.number().default(0), output_tokens: z.number().default(0) }),
});

const canned: Record<string, string> = {
  ability_review: 'Review the original evidence with the participant. Describe only what was directly observed, choose the support level, and leave the ability as a draft for the participant to publish.',
  caption_review: 'The model is unavailable. Listen to the original recording, correct the caption manually, and ask the participant to confirm it before publication.',
  default: 'The assistant is temporarily unavailable. Continue with the saved information and try again later.',
};

export async function runModel(input: { purpose: string; instructions: string; text: string }) {
  const env = getServerEnv();
  const db = createServiceDb();
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const { data: usage, error } = await db.from('model_usage').select('cost_usd').gte('created_at', startOfDay.toISOString());
  if (error) throw error;
  const spent = usage.reduce((sum, row) => sum + Number(row.cost_usd), 0);
  if (env.MODEL_DEGRADED_MODE || !env.ANTHROPIC_API_KEY || spent >= env.MODEL_DAILY_BUDGET_USD) return recordDegraded(input.purpose);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.ANTHROPIC_MODEL, system: input.instructions, messages: [{ role: 'user', content: input.text }], max_tokens: 500 }),
    });
    if (!response.ok) throw new Error(`Model request failed with status ${response.status}.`);
    const result = responseSchema.parse(await response.json());
    const inputTokens = result.usage?.input_tokens ?? 0;
    const outputTokens = result.usage?.output_tokens ?? 0;
    const cost = estimateCost(inputTokens, outputTokens);
    await db.from('model_usage').insert({ request_id: result.id, model: env.ANTHROPIC_MODEL, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost, degraded: false });
    return { text: result.content.find(block => block.type === 'text')?.text ?? '', degraded: false };
  } catch (error) {
    console.warn('Model degraded mode activated', error instanceof Error ? error.message : 'unknown');
    return recordDegraded(input.purpose);
  }
}

function estimateCost(inputTokens: number, outputTokens: number) {
  return Number(((inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15).toFixed(6));
}

async function recordDegraded(purpose: string) {
  const text = canned[purpose] ?? canned.default;
  await createServiceDb().from('model_usage').insert({ request_id: crypto.randomUUID(), model: 'degraded-canned', input_tokens: 0, output_tokens: 0, cost_usd: 0, degraded: true });
  return { text, degraded: true };
}
