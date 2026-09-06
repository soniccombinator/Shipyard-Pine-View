import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeCoachParticipant } from '@/lib/backend/access';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { ApiError, readJson, withApiErrors } from '@/lib/backend/http';
import { writeAudit } from '@/lib/backend/audit';
import { recordUsage } from '@/lib/backend/metrics';

const schema = z.object({ skillId: z.string().uuid(), observation: z.string().trim().min(10).max(2000) }).strict();

export async function POST(request: Request, context: { params: Promise<{ participantId: string }> }) {
  return withApiErrors(async () => {
    const { participantId } = await context.params;
    const actor = await requireCoach();
    await authorizeCoachParticipant(actor, participantId);
    const input = await readJson(request, schema);
    const db = createServiceDb();
    const { data: skill, error: skillError } = await db.from('skill_taxonomy').select('id').eq('id', input.skillId).eq('active', true).maybeSingle();
    if (skillError) throw skillError;
    if (!skill) throw new ApiError(400, 'Unknown ability.', 'invalid_skill');
    const { data, error } = await db.from('ability_claims').insert({ employee_id: participantId, ability_id: input.skillId, source: 'mentor', claim_text: input.observation, publication_status: 'draft', created_by_profile_id: actor.profileId }).select('*').single();
    if (error) throw error;
    await db.from('moderation_queue').upsert({ employee_id: participantId, kind: 'ability', resource_id: data.id, status: 'pending', reason: 'Mentor-suggested ability requires participant review.', assigned_mentor_profile_id: actor.profileId }, { onConflict: 'kind,resource_id' });
    await Promise.all([
      writeAudit({ actorProfileId: actor.profileId, action: 'ability.suggested', resourceType: 'participant_ability', resourceId: data.id, metadata: { participantId, source: 'mentor' } }),
      recordUsage('coach_ability_suggested', actor.profileId, { participantId }),
    ]);
    return NextResponse.json({ ability: data, publication: 'draft', participantMustPublish: true }, { status: 201 });
  });
}
