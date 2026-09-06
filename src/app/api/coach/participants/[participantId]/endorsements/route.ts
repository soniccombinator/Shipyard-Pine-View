import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeCoachParticipant } from '@/lib/backend/access';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { ApiError, readJson, withApiErrors } from '@/lib/backend/http';
import { writeAudit } from '@/lib/backend/audit';
import { recordUsage } from '@/lib/backend/metrics';

const schema = z.object({
  abilityId: z.string().uuid(),
  observation: z.string().trim().min(10).max(2000),
  supportLevel: z.enum(['independent', 'light_support', 'regular_support']),
  status: z.enum(['draft', 'confirmed']).default('confirmed'),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ participantId: string }> }) {
  return withApiErrors(async () => {
    const { participantId } = await context.params;
    const actor = await requireCoach();
    await authorizeCoachParticipant(actor, participantId);
    const input = await readJson(request, schema);
    const db = createServiceDb();
    const { data: ability, error: abilityError } = await db.from('ability_claims').select('id, employee_id').eq('id', input.abilityId).eq('employee_id', participantId).maybeSingle();
    if (abilityError) throw abilityError;
    if (!ability) throw new ApiError(404, 'Ability not found for this participant.', 'ability_not_found');
    const { data, error } = await db.from('endorsements').upsert({ ability_claim_id: input.abilityId, mentor_profile_id: actor.profileId, observation: input.observation, support_level: input.supportLevel, status: input.status }, { onConflict: 'ability_claim_id,mentor_profile_id' }).select('*').single();
    if (error) throw error;
    await Promise.all([
      writeAudit({ actorProfileId: actor.profileId, action: `endorsement.${input.status}`, resourceType: 'endorsement', resourceId: data.id, metadata: { participantId, abilityId: input.abilityId, supportLevel: input.supportLevel } }),
      recordUsage('coach_endorsement_saved', actor.profileId, { participantId, status: input.status }),
    ]);
    return NextResponse.json({ endorsement: data, verified: data.status === 'confirmed', attribution: { profileId: actor.profileId, displayName: actor.displayName } }, { status: 201 });
  });
}
