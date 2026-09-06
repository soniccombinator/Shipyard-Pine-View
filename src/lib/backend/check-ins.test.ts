import { describe, expect, it } from "vitest";
import { checkInEmailDedupeKey, formatCheckInEmail, scheduleCheckInSchema } from "./check-ins";

describe("check-in scheduling", () => {
  it("validates a future meeting and formats its notification email", () => {
    const startsAt = new Date(Date.now() + 3_600_000).toISOString();
    expect(scheduleCheckInSchema.safeParse({ startsAt, timeZone: "America/New_York", durationMinutes: 30, location: "Video call" }).success).toBe(true);
    const email = formatCheckInEmail({ menteeName: "Priya", mentorName: "Riya", startsAt, timeZone: "America/New_York", durationMinutes: 30, location: "Video call" });
    expect(email.subject).toBe("Your ConnectAble check-in is scheduled");
    expect(email.body).toContain("Priya");
    expect(email.body).toContain("Riya");
    expect(email.body).toContain("Video call");
    expect(checkInEmailDedupeKey("check-in-1")).toBe("check-in-scheduled:check-in-1");
  });

  it("rejects a past schedule and an invalid time zone", () => {
    expect(scheduleCheckInSchema.safeParse({ startsAt: "2020-01-01T12:00:00.000Z", timeZone: "America/New_York" }).success).toBe(false);
    expect(scheduleCheckInSchema.safeParse({ startsAt: new Date(Date.now() + 3_600_000).toISOString(), timeZone: "Not/A-Time-Zone" }).success).toBe(false);
  });
});
