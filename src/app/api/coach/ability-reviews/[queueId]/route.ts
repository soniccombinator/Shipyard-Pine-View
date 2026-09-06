import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeCoachParticipant } from '@/lib/backend/access';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { ApiError, readJson, withApiErrors } from '@/lib/backend/http';
import { writeAudit } from '@/lib/backend/audit';

const schema = z.object({ decision: z.enum(['approved', 'rejected']), reason: z.string().trim().max(1000).optional() }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ queueId: string }> }) {
  return withApiErrors(async () => {
    const { queueId } = await context.params;
    const actor = await requireCoach();
    const input = await readJson(request, schema);
    const db = createServiceDb();
    const { data: item, error } = await db.from('moderation_queue').select('*').eq('id', queueId).eq('kind', 'ability').eq('status', 'pending').maybeSingle();
    if (error) throw error;
    if (!item) throw new ApiError(404, 'Pending ability review not found.', 'review_not_found');
    await authorizeCoachParticipant(actor, item.employee_id);
    const { data: ability, error: abilityError } = await db.from('ability_claims').select('*').eq('id', item.resource_id).eq('source', 'ai').maybeSingle();
    if (abilityError) throw abilityError;
    if (!ability) throw new ApiError(409, 'The queued resource is not an AI-suggested ability.', 'review_mismatch');
    const { data: updated, error: updateError } = await db.from('moderation_queue').update({ status: input.decision, reason: input.reason ?? item.reason, assigned_mentor_profile_id: actor.profileId, resolved_at: new Date().toISOString() }).eq('id', queueId).eq('status', 'pending').select('*').maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new ApiError(409, 'This review was already resolved.', 'already_resolved');
    await writeAudit({ actorProfileId: actor.profileId, action: `ai_ability.${input.decision}`, resourceType: 'participant_ability', resourceId: ability.id, metadata: { participantId: item.employee_id, queueId } });
    return NextResponse.json({ review: updated, ability: { ...ability, publication_status: 'draft' }, participantMustPublish: true });
  });
}
