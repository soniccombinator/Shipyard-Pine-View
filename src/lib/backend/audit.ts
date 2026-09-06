import { createServiceDb } from '@/lib/backend/db/server';

export async function writeAudit(entry: { actorProfileId?: string | null; action: string; resourceType: string; resourceId?: string | null; metadata?: Record<string, unknown> }) {
  const db = createServiceDb();
  const { error } = await db.from('audit_log').insert({
    actor_profile_id: entry.actorProfileId ?? null,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId ?? null,
    metadata: entry.metadata ?? {},
  });
  if (error) throw error;
}
