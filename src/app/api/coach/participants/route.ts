import { NextResponse } from 'next/server';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { withApiErrors } from '@/lib/backend/http';
import { recordUsage } from '@/lib/backend/metrics';

export const runtime = 'nodejs';

export async function GET() {
  return withApiErrors(async () => {
    const actor = await requireCoach();
    const db = createServiceDb();
    const { data: relationships, error } = await db.from('mentorships').select('*').eq('mentor_id', actor.profileId).eq('status', 'active').is('consent_revoked_at', null).not('consent_granted_at', 'is', null);
    if (error) throw error;
    const ids = relationships.map(row => row.employee_id);
    if (!ids.length) return NextResponse.json({ participants: [] });
    const { data: participants, error: participantError } = await db.from('employee_profiles').select('*').in('user_id', ids);
    if (participantError) throw participantError;
    const profileIds = participants.map(row => row.user_id);
    const { data: profiles, error: profileError } = await db.from('profiles').select('id, full_name, avatar_url').in('id', profileIds);
    if (profileError) throw profileError;
    const names = new Map(profiles.map(profile => [profile.id, { fullName: profile.full_name, avatarUrl: profile.avatar_url }]));
    await recordUsage('mentorships_list_viewed', actor.profileId, { count: participants.length });
    return NextResponse.json({ participants: participants.map(p => ({ ...p, ...names.get(p.user_id), relationship: relationships.find(r => r.employee_id === p.user_id) })) });
  });
}
