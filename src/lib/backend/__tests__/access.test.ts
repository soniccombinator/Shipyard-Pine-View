import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/backend/http';
import { authorizeCoachParticipant, relationshipAllowsAccess, type RelationshipReader } from '@/lib/backend/access';
import type { Actor } from '@/lib/backend/auth';
import type { MentorshipRow } from '@/lib/backend/db/types';

const coach: Actor = { profileId: 'mentor-1', authUserId: 'auth-1', role: 'mentor', displayName: 'Jordan Blake' };
const participantId = 'participant-1';
const active: MentorshipRow = {
  id: 'relationship-1', mentor_id: coach.profileId, employee_id: participantId,
  status: 'active', consent_granted_at: '2026-09-01T12:00:00Z', consent_revoked_at: null,
  delegated_publish: false, created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z',
};

const reader = (relationship: MentorshipRow | null): RelationshipReader => ({ find: async () => relationship });

describe('coach-participant access', () => {
  it('allows the assigned coach only while consent is active', async () => {
    await expect(authorizeCoachParticipant(coach, participantId, reader(active))).resolves.toEqual(active);
    expect(relationshipAllowsAccess(active)).toBe(true);
  });

  it('denies a coach with no relationship', async () => {
    await expect(authorizeCoachParticipant(coach, participantId, reader(null))).rejects.toMatchObject({ status: 403, code: 'relationship_forbidden' } satisfies Partial<ApiError>);
  });

  it('denies a revoked relationship immediately', async () => {
    const revoked = { ...active, status: 'ended' as const, consent_revoked_at: '2026-09-05T12:00:00Z' };
    await expect(authorizeCoachParticipant(coach, participantId, reader(revoked))).rejects.toMatchObject({ status: 403, code: 'relationship_forbidden' });
  });

  it('denies an active-looking relationship where consent was never granted', async () => {
    const noConsent = { ...active, consent_granted_at: null };
    await expect(authorizeCoachParticipant(coach, participantId, reader(noConsent))).rejects.toMatchObject({ status: 403, code: 'relationship_forbidden' });
  });

  it('denies a different role even if a relationship record is supplied', async () => {
    const employer: Actor = { ...coach, role: 'employer' };
    await expect(authorizeCoachParticipant(employer, participantId, reader(active))).rejects.toMatchObject({ status: 403, code: 'role_forbidden' });
  });
});
