import { afterEach, describe, expect, it } from 'vitest';
import { getServerEnv, resetEnvForTests } from '@/lib/backend/env';

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; resetEnvForTests(); });

function validEnv() {
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnopqrstuvwxyz',
    SUPABASE_SECRET_KEY: 'secret-key-with-sufficient-length',
    CRON_SECRET: 'c'.repeat(32), ADMIN_API_SECRET: 'a'.repeat(32),
  });
}

describe('configuration boundary', () => {
  it('loads validated configuration and defaults', () => {
    validEnv();
    const env = getServerEnv();
    expect(env.ANTHROPIC_MODEL).toBe('claude-sonnet-4-6');
    expect(env.MODEL_DAILY_BUDGET_USD).toBe(20);
  });

  it('fails loudly and names invalid fields', () => {
    validEnv(); process.env.CRON_SECRET = 'short';
    expect(() => getServerEnv()).toThrow(/CRON_SECRET/);
  });
});
