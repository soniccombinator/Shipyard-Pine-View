import { NextResponse } from 'next/server';
import { authorizeCoachParticipant } from '@/lib/backend/access';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { ApiError, withApiErrors } from '@/lib/backend/http';
import { recordUsage } from '@/lib/backend/metrics';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ participantId: string }> }) {
  return withApiErrors(async () => {
    const { participantId } = await context.params;
    const actor = await requireCoach();
    const relationship = await authorizeCoachParticipant(actor, participantId);
    const db = createServiceDb();
    const { data: participant, error } = await db.from('employee_profiles').select('*').eq('user_id', participantId).maybeSingle();
    if (error) throw error;
    if (!participant) throw new ApiError(404, 'Participant not found.', 'not_found');
    const [profile, abilities, applications, accommodations] = await Promise.all([
      db.from('profiles').select('id, full_name, avatar_url').eq('id', participant.user_id).single(),
      db.from('ability_claims').select('*').eq('employee_id', participantId).order('created_at'),
      db.from('applications').select('*').eq('employee_id', participantId).order('created_at', { ascending: false }),
      Promise.resolve({ data: participant.accommodations, error: null }),
    ]);
    for (const result of [profile, abilities, applications, accommodations]) if (result.error) throw result.error;
    const abilityRows = abilities.data ?? [];
    const skillIds = abilityRows.map(a => a.ability_id);
    const abilityIds = abilityRows.map(a => a.id);
    const [skills, endorsements] = await Promise.all([
      skillIds.length ? db.from('skill_taxonomy').select('*').in('id', skillIds) : Promise.resolve({ data: [], error: null }),
      abilityIds.length ? db.from('endorsements').select('*').in('ability_claim_id', abilityIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (skills.error) throw skills.error;
    if (endorsements.error) throw endorsements.error;
    await recordUsage('mentorships_profile_viewed', actor.profileId, { participantId });
    return NextResponse.json({ participant: { ...participant, profile: profile.data }, relationship, abilities: abilityRows.map(a => ({ ...a, skill: skills.data.find(s => s.id === a.ability_id), endorsements: endorsements.data.filter(e => e.ability_claim_id === a.id) })), applications: applications.data, accommodations: accommodations.data });
  });
}
