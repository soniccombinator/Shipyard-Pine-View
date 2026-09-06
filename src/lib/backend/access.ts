import type { Actor } from '@/lib/backend/auth';
import type { MentorshipRow } from '@/lib/backend/db/types';
import { ApiError } from '@/lib/backend/http';
import { createServiceDb } from '@/lib/backend/db/server';

export interface RelationshipReader {
  find(mentorProfileId: string, employeeId: string): Promise<MentorshipRow | null>;
}

export class SupabaseRelationshipReader implements RelationshipReader {
  async find(mentorProfileId: string, employeeId: string) {
    const db = createServiceDb();
    const { data, error } = await db.from('mentorships').select('*').eq('mentor_id', mentorProfileId).eq('employee_id', employeeId).maybeSingle();
    if (error) throw error;
    return data;
  }
}

export function relationshipAllowsAccess(relationship: MentorshipRow | null): boolean {
  return Boolean(relationship && relationship.status === 'active' && relationship.consent_granted_at && !relationship.consent_revoked_at);
}

export async function authorizeCoachParticipant(actor: Actor, participantId: string, reader: RelationshipReader = new SupabaseRelationshipReader()) {
  if (actor.role !== 'mentor') throw new ApiError(403, 'Mentor access is required.', 'role_forbidden');
  const relationship = await reader.find(actor.profileId, participantId);
  if (!relationshipAllowsAccess(relationship)) throw new ApiError(403, 'No active, consented coaching relationship exists for this participant.', 'relationship_forbidden');
  return relationship!;
}

export async function assertCoachCanPublish(actor: Actor, participantId: string, reader?: RelationshipReader) {
  const relationship = await authorizeCoachParticipant(actor, participantId, reader);
  if (!relationship.delegated_publish) throw new ApiError(403, 'Only the participant may publish this content.', 'participant_publish_required');
  return relationship;
}
