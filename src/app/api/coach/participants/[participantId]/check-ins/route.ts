import { NextResponse } from "next/server";
import { authorizeCoachParticipant } from "@/lib/backend/access";
import { requireCoach } from "@/lib/backend/auth";
import { checkInEmailDedupeKey, formatCheckInEmail, scheduleCheckInSchema } from "@/lib/backend/check-ins";
import { queueCommunication } from "@/lib/backend/comms";
import { createServiceDb } from "@/lib/backend/db/server";
import { ApiError, readJson, withApiErrors } from "@/lib/backend/http";
import { writeAudit } from "@/lib/backend/audit";
import { recordUsage } from "@/lib/backend/metrics";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ participantId: string }> }) {
  return withApiErrors(async () => {
    const { participantId } = await context.params;
    const actor = await requireCoach();
    await authorizeCoachParticipant(actor, participantId);
    const input = await readJson(request, scheduleCheckInSchema);
    const db = createServiceDb();

    const [{ data: participant, error: participantError }, { data: authUser, error: authError }] = await Promise.all([
      db.from("profiles").select("id, full_name").eq("id", participantId).maybeSingle(),
      db.auth.admin.getUserById(participantId),
    ]);
    if (participantError) throw participantError;
    if (authError) throw authError;
    if (!participant) throw new ApiError(404, "Participant not found.", "not_found");
    if (!authUser.user.email) throw new ApiError(400, "This participant does not have an email address for check-in notifications.", "participant_email_missing");

    const { data: checkIn, error: checkInError } = await db.from("mentor_check_ins").insert({
      mentor_id: actor.profileId,
      employee_id: participantId,
      starts_at: input.startsAt,
      time_zone: input.timeZone,
      duration_minutes: input.durationMinutes,
      location: input.location || null,
      status: "scheduled",
    }).select("*").single();
    if (checkInError) throw checkInError;

    const email = formatCheckInEmail({
      menteeName: participant.full_name,
      mentorName: actor.displayName,
      startsAt: input.startsAt,
      timeZone: input.timeZone,
      durationMinutes: input.durationMinutes,
      location: input.location,
    });
    const communicationId = await queueCommunication({
      channel: "email",
      recipient: authUser.user.email,
      template: "check_in_scheduled",
      payload: email,
      dedupeKey: checkInEmailDedupeKey(checkIn.id),
    });

    await Promise.all([
      writeAudit({ actorProfileId: actor.profileId, action: "check_in.scheduled", resourceType: "mentor_check_in", resourceId: checkIn.id, metadata: { participantId, startsAt: input.startsAt, durationMinutes: input.durationMinutes, notificationQueued: Boolean(communicationId) } }),
      recordUsage("coach_check_in_scheduled", actor.profileId, { participantId, notificationQueued: Boolean(communicationId) }),
    ]);
    return NextResponse.json({ checkIn, notification: { channel: "email", queued: Boolean(communicationId) } }, { status: 201 });
  });
}
