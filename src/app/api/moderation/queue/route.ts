import { NextResponse } from 'next/server';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { withApiErrors } from '@/lib/backend/http';

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const actor = await requireCoach();
    const kind = new URL(request.url).searchParams.get('kind');
    if (kind && !['evidence', 'caption'].includes(kind)) return NextResponse.json({ error: 'validation_error', message: 'kind must be evidence or caption.' }, { status: 400 });
    const db = createServiceDb();
    const { data: relationships, error } = await db.from('mentorships').select('*').eq('mentor_id', actor.profileId).eq('status', 'active').is('consent_revoked_at', null).not('consent_granted_at', 'is', null);
    if (error) throw error;
    const participantIds = relationships.map(r => r.employee_id);
    if (!participantIds.length) return NextResponse.json({ items: [] });
    let query = db.from('moderation_queue').select('*').in('employee_id', participantIds).eq('status', 'pending').order('created_at');
    if (kind) query = query.eq('kind', kind as 'evidence' | 'caption');
    else query = query.in('kind', ['evidence', 'caption']);
    const { data, error: queueError } = await query;
    if (queueError) throw queueError;
    return NextResponse.json({ items: data });
  });
}
