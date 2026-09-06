export type UserRole = 'employee' | 'mentor' | 'employer';
export type RelationshipStatus = 'pending' | 'active' | 'ended';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export type ProfileRow = { id: string; role: UserRole; full_name: string; avatar_url: string | null; created_at: string; updated_at: string };
export type EmployeeProfileRow = { user_id: string; headline: string; about: string; about_raw: string; city: string; state: string; abilities: string[]; accommodations: string[]; searchable: boolean; passport_public: boolean; created_at: string; updated_at: string; [key: string]: unknown };
export type MentorshipRow = { id: string; mentor_id: string; employee_id: string; status: RelationshipStatus; consent_granted_at: string | null; consent_revoked_at: string | null; delegated_publish: boolean; created_at: string; updated_at: string };
export type SkillRow = { id: string; slug: string; category: string; label: string; aliases: string[]; active: boolean };
export type AbilityRow = { id: string; employee_id: string; ability_id: string; source: 'employee' | 'mentor' | 'ai'; claim_text: string | null; publication_status: 'draft' | 'published'; created_by_profile_id: string; created_at: string; updated_at: string };
export type EndorsementRow = { id: string; ability_claim_id: string; mentor_profile_id: string; observation: string; support_level: 'independent' | 'light_support' | 'regular_support'; status: 'draft' | 'confirmed'; created_at: string; updated_at: string };
export type EvidenceRow = { id: string; employee_id: string; ability_claim_id: string | null; storage_path: string; media_type: string; moderation_status: ModerationStatus; flagged_reason: string | null; created_at: string };
export type CaptionRow = { id: string; evidence_id: string; generated_text: string; reviewed_text: string | null; moderation_status: ModerationStatus; reviewed_by_profile_id: string | null; reviewed_at: string | null; created_at: string };
export type ModerationQueueRow = { id: string; employee_id: string; kind: 'ability' | 'evidence' | 'caption'; resource_id: string; status: ModerationStatus; reason: string | null; assigned_mentor_profile_id: string | null; created_at: string; resolved_at: string | null };
export type JobRow = { id: string; kind: string; payload: Record<string, unknown>; dedupe_key: string; status: 'pending' | 'running' | 'completed' | 'failed'; attempts: number; available_at: string; locked_at: string | null; last_error: string | null; created_at: string };
export type MentorCheckInRow = { id: string; mentor_id: string; employee_id: string; starts_at: string; time_zone: string; duration_minutes: number; location: string | null; status: 'scheduled' | 'completed' | 'cancelled'; created_at: string; updated_at: string };

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type Database = { public: {
  Tables: {
    profiles: Table<ProfileRow>;
    mentor_profiles: Table<{ user_id: string; bio: string; background_check: string; capacity: number; created_at: string; updated_at: string }>;
    employee_profiles: Table<EmployeeProfileRow>;
    mentorships: Table<MentorshipRow>;
    skill_taxonomy: Table<SkillRow>;
    ability_claims: Table<AbilityRow>;
    endorsements: Table<EndorsementRow>;
    evidence: Table<EvidenceRow>;
    captions: Table<CaptionRow>;
    moderation_queue: Table<ModerationQueueRow>;
    applications: Table<{ id: string; employee_id: string; job_id: string; status: string; created_at: string; updated_at: string }>;
    mentor_check_ins: Table<MentorCheckInRow>;
    background_jobs: Table<JobRow>;
    audit_log: Table<{ id: string; actor_profile_id: string | null; action: string; resource_type: string; resource_id: string | null; metadata: Record<string, unknown>; created_at: string }>;
    usage_events: Table<{ id: string; actor_profile_id: string | null; event_name: string; properties: Record<string, unknown>; dedupe_key: string | null; created_at: string }>;
    model_usage: Table<{ id: string; request_id: string; model: string; input_tokens: number; output_tokens: number; cost_usd: number; degraded: boolean; created_at: string }>;
    communications: Table<{ id: string; channel: 'sms' | 'email'; recipient: string; template: string; payload: Record<string, unknown>; dedupe_key: string; status: string; created_at: string }>;
  };
  Views: Record<string, never>;
  Functions: {
    reseed_demo: { Args: Record<string, never>; Returns: { employees: number; employers: number; jobs: number }[] };
    claim_background_jobs: { Args: { max_jobs: number }; Returns: JobRow[] };
  };
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
} };
