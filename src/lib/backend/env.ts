import { z } from 'zod';

const optionalSecret = z.string().trim().min(1).optional();
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  DATABASE_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(32),
  ADMIN_API_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: optionalSecret,
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  MODEL_DAILY_BUDGET_USD: z.coerce.number().positive().default(20),
  MODEL_DEGRADED_MODE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  GHL_LOCATION_ID: optionalSecret,
  GHL_PRIVATE_INTEGRATION_KEY: optionalSecret,
  GHL_WEBHOOK_SECRET: z.string().min(32).optional(),
  GMAIL_USER: z.string().email().optional().or(z.literal('')),
  GMAIL_APP_PASSWORD: optionalSecret,
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
});

export type ServerEnv = z.infer<typeof serverSchema>;
let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const fields = result.error.issues.map(issue => issue.path.join('.')).join(', ');
    throw new Error(`Invalid server configuration: ${fields}. Check .env.local against .env.example.`);
  }
  cached = result.data;
  return cached;
}

export function resetEnvForTests() { cached = undefined; }
