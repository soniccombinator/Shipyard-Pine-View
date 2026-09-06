import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeCoachParticipant } from '@/lib/backend/access';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { ApiError, readJson, withApiErrors } from '@/lib/backend/http';
import { writeAudit } from '@/lib/backend/audit';

const schema = z.object({ decision: z.enum(['approved', 'rejected']), reason: z.string().trim().min(3).max(1000).optional() }).strict().refine(value => value.decision === 'approved' || value.reason, { message: 'A reason is required when rejecting evidence.', path: ['reason'] });

export async function PATCH(request: Request, context: { params: Promise<{ evidenceId: string }> }) {
  return withApiErrors(async () => {
    const { evidenceId } = await context.params;
    const actor = await requireCoach();
    const input = await readJson(request, schema);
    const db = createServiceDb();
    const { data: evidence, error } = await db.from('evidence').select('*').eq('id', evidenceId).eq('moderation_status', 'pending').maybeSingle();
    if (error) throw error;
    if (!evidence) throw new ApiError(404, 'Pending evidence not found.', 'evidence_not_found');
    await authorizeCoachParticipant(actor, evidence.employee_id);
    const { data, error: updateError } = await db.from('evidence').update({ moderation_status: input.decision, flagged_reason: input.reason ?? evidence.flagged_reason }).eq('id', evidenceId).eq('moderation_status', 'pending').select('*').maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw new ApiError(409, 'This evidence was already reviewed.', 'already_resolved');
    await db.from('moderation_queue').update({ status: input.decision, reason: input.reason, assigned_mentor_profile_id: actor.profileId, resolved_at: new Date().toISOString() }).eq('kind', 'evidence').eq('resource_id', evidenceId).eq('status', 'pending');
    await writeAudit({ actorProfileId: actor.profileId, action: `evidence.${input.decision}`, resourceType: 'evidence', resourceId: evidenceId, metadata: { participantId: evidence.employee_id, reason: input.reason } });
    return NextResponse.json({ evidence: data, attribution: { profileId: actor.profileId, displayName: actor.displayName } });
  });
}
