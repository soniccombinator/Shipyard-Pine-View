import { z } from "zod";

function isTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const scheduleCheckInSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  timeZone: z.string().trim().min(1).max(100).refine(isTimeZone, "Use a valid time zone."),
  durationMinutes: z.number().int().min(15).max(180).default(30),
  location: z.string().trim().max(300).optional(),
}).strict().superRefine((value, ctx) => {
  if (new Date(value.startsAt).getTime() <= Date.now() + 60_000) {
    ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Schedule the check-in at least one minute from now." });
  }
});

export type ScheduledCheckIn = z.infer<typeof scheduleCheckInSchema>;

export function formatCheckInEmail(input: {
  menteeName: string;
  mentorName: string;
  startsAt: string;
  timeZone: string;
  durationMinutes: number;
  location?: string | null;
}) {
  const when = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: input.timeZone,
  }).format(new Date(input.startsAt));
  const location = input.location ? `\nLocation or link: ${input.location}` : "";
  return {
    subject: "Your ConnectAble check-in is scheduled",
    body: `Hi ${input.menteeName},\n\nYour check-in with ${input.mentorName} is scheduled for ${when} (${input.timeZone}).\nLength: ${input.durationMinutes} minutes.${location}\n\nIf you need to make a change, please contact your mentor.\n\nConnectAble`,
  };
}

export function checkInEmailDedupeKey(checkInId: string) {
  return `check-in-scheduled:${checkInId}`;
}
