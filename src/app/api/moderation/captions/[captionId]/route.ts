import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeCoachParticipant } from '@/lib/backend/access';
import { requireCoach } from '@/lib/backend/auth';
import { createServiceDb } from '@/lib/backend/db/server';
import { ApiError, readJson, withApiErrors } from '@/lib/backend/http';
import { writeAudit } from '@/lib/backend/audit';

const schema = z.object({ decision: z.enum(['approved', 'rejected']), reviewedText: z.string().trim().max(20_000).optional(), reason: z.string().trim().max(1000).optional() }).strict().superRefine((value, ctx) => {
  if (value.decision === 'approved' && !value.reviewedText) ctx.addIssue({ code: 'custom', message: 'Reviewed text is required before a caption can be approved.', path: ['reviewedText'] });
  if (value.decision === 'rejected' && !value.reason) ctx.addIssue({ code: 'custom', message: 'A reason is required when rejecting a caption.', path: ['reason'] });
});

export async function PATCH(request: Request, context: { params: Promise<{ captionId: string }> }) {
  return withApiErrors(async () => {
    const { captionId } = await context.params;
    const actor = await requireCoach();
    const input = await readJson(request, schema);
    const db = createServiceDb();
    const { data: caption, error } = await db.from('captions').select('*').eq('id', captionId).eq('moderation_status', 'pending').maybeSingle();
    if (error) throw error;
    if (!caption) throw new ApiError(404, 'Pending caption not found.', 'caption_not_found');
    const { data: evidence, error: evidenceError } = await db.from('evidence').select('id, employee_id').eq('id', caption.evidence_id).single();
    if (evidenceError) throw evidenceError;
    await authorizeCoachParticipant(actor, evidence.employee_id);
    const reviewedAt = new Date().toISOString();
    const { data, error: updateError } = await db.from('captions').update({ moderation_status: input.decision, reviewed_text: input.reviewedText ?? caption.reviewed_text, reviewed_by_profile_id: actor.profileId, reviewed_at: reviewedAt }).eq('id', captionId).eq('moderation_status', 'pending').select('*').maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw new ApiError(409, 'This caption was already reviewed.', 'already_resolved');
    await db.from('moderation_queue').update({ status: input.decision, reason: input.reason, assigned_mentor_profile_id: actor.profileId, resolved_at: reviewedAt }).eq('kind', 'caption').eq('resource_id', captionId).eq('status', 'pending');
    await writeAudit({ actorProfileId: actor.profileId, action: `caption.${input.decision}`, resourceType: 'caption', resourceId: captionId, metadata: { participantId: evidence.employee_id, evidenceId: evidence.id, textChanged: input.reviewedText !== caption.generated_text, reason: input.reason } });
    return NextResponse.json({ caption: data, attribution: { profileId: actor.profileId, displayName: actor.displayName } });
  });
}
