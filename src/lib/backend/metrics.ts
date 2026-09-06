import { createServiceDb } from '@/lib/backend/db/server';

export async function recordUsage(eventName: string, actorProfileId?: string | null, properties: Record<string, unknown> = {}) {
  const db = createServiceDb();
  const { error } = await db.from('usage_events').insert({ actor_profile_id: actorProfileId ?? null, event_name: eventName, properties });
  if (error) throw error;
}

export async function readMetrics() {
  const db = createServiceDb();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const [events, model, jobs, comms] = await Promise.all([
    db.from('usage_events').select('event_name').gte('created_at', since),
    db.from('model_usage').select('cost_usd, degraded').gte('created_at', since),
    db.from('background_jobs').select('status').gte('created_at', since),
    db.from('communications').select('channel, status').gte('created_at', since),
  ]);
  for (const result of [events, model, jobs, comms]) if (result.error) throw result.error;
  const countBy = (values: string[]) => values.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {});
  return {
    windowHours: 48,
    events: countBy((events.data ?? []).map(x => x.event_name)),
    model: { calls: model.data?.length ?? 0, costUsd: Number((model.data ?? []).reduce((sum, x) => sum + Number(x.cost_usd), 0).toFixed(4)), degradedCalls: (model.data ?? []).filter(x => x.degraded).length },
    jobs: countBy((jobs.data ?? []).map(x => x.status)),
    communications: countBy((comms.data ?? []).map(x => `${x.channel}:${x.status}`)),
  };
}
