import { NextResponse } from 'next/server';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { withApiErrors } from '@/lib/backend/http';

export async function GET() {
  return withApiErrors(async () => {
    const actor = await requireCoach();
    const db = createServiceDb();
    const { data: relationships, error } = await db.from('mentorships').select('*').eq('mentor_id', actor.profileId).eq('status', 'active').is('consent_revoked_at', null).not('consent_granted_at', 'is', null);
    if (error) throw error;
    const participantIds = relationships.map(r => r.employee_id);
    if (!participantIds.length) return NextResponse.json({ reviews: [] });
    const { data: queue, error: queueError } = await db.from('moderation_queue').select('*').eq('kind', 'ability').eq('status', 'pending').in('employee_id', participantIds).order('created_at');
    if (queueError) throw queueError;
    const abilityIds = queue.map(q => q.resource_id);
    const { data: abilities, error: abilityError } = abilityIds.length ? await db.from('ability_claims').select('*').eq('source', 'ai').in('id', abilityIds) : { data: [], error: null };
    if (abilityError) throw abilityError;
    return NextResponse.json({ reviews: queue.map(item => ({ ...item, ability: abilities.find(a => a.id === item.resource_id) })).filter(item => item.ability) });
  });
}
