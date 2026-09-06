import { createServiceDb } from '@/lib/backend/db/server';

export type JobKind = 'send_sms' | 'send_email' | 'transcribe_evidence' | 'recompute_matches';

export async function enqueueJob(kind: JobKind, payload: Record<string, unknown>, dedupeKey: string, availableAt = new Date()) {
  const db = createServiceDb();
  const { data, error } = await db.from('background_jobs').upsert({ kind, payload, dedupe_key: dedupeKey, available_at: availableAt.toISOString() }, { onConflict: 'dedupe_key', ignoreDuplicates: true }).select('id').maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

export async function drainJobs(handlers: Partial<Record<JobKind, JobHandler>>, maxJobs = 10) {
  const db = createServiceDb();
  const { data: jobs, error } = await db.rpc('claim_background_jobs', { max_jobs: Math.min(Math.max(maxJobs, 1), 25) });
  if (error) throw error;
  const result = { claimed: jobs.length, completed: 0, failed: 0 };
  for (const job of jobs) {
    const handler = handlers[job.kind as JobKind];
    try {
      if (!handler) throw new Error(`No handler for ${job.kind}`);
      await handler(job.payload);
      await db.from('background_jobs').update({ status: 'completed', locked_at: null }).eq('id', job.id);
      result.completed += 1;
    } catch (cause) {
      const terminal = job.attempts >= 5;
      const retryMinutes = Math.min(2 ** job.attempts, 60);
      await db.from('background_jobs').update({
        status: terminal ? 'failed' : 'pending', locked_at: null,
        available_at: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
        last_error: cause instanceof Error ? cause.message.slice(0, 500) : 'Unknown failure',
      }).eq('id', job.id);
      result.failed += 1;
    }
  }
  return result;
}
