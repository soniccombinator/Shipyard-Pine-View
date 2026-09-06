import { z } from "zod";
import type { Role } from "@/lib/domain";

export type Person = { id: string; name: string; role: Role };
export type Pairing = {
  id: string;
  mentor_id: string;
  employee_id: string;
  status: "pending" | "active" | "ended";
  consent_granted_at: string | null;
  consent_revoked_at: string | null;
};
export type Trip = {
  id: string;
  employee_id: string;
  employer_id: string | null;
  origin: string;
  destination: string;
  arrive_by: string;
  status: "requested" | "proposed" | "confirmed" | "completed" | "cancelled";
  arranged_by: string | null;
  plan: string | null;
  pickup_at: string | null;
  version: number;
};
export type CommuteData = {
  people: Person[];
  pairings: Pairing[];
  trips: Trip[];
};
const uuid = z.string().uuid();
export const commuteCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), employeeId: uuid }).strict(),
  z.object({ action: z.literal("accept_pairing"), pairingId: uuid }).strict(),
  z.object({ action: z.literal("end_pairing"), pairingId: uuid }).strict(),
  z
    .object({
      action: z.literal("request"),
      origin: z.string().trim().min(3).max(160),
      destination: z.string().trim().min(3).max(160),
      arriveBy: z.string().datetime(),
      employerId: uuid.nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal("propose"),
      tripId: uuid,
      version: z.number().int().positive(),
      plan: z.string().trim().min(10).max(1000),
      pickupAt: z.string().datetime(),
    })
    .strict(),
  z
    .object({
      action: z.literal("confirm"),
      tripId: uuid,
      version: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("complete"),
      tripId: uuid,
      version: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("cancel"),
      tripId: uuid,
      version: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("share"),
      tripId: uuid,
      version: z.number().int().positive(),
      employerId: uuid.nullable(),
    })
    .strict(),
]);
export type CommuteCommand = z.infer<typeof commuteCommand>;
export type Executor = (command: CommuteCommand) => Promise<{ error?: string }>;
export const tripStatus = {
  requested: "Needs a ride",
  proposed: "Review the plan",
  confirmed: "Ride confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};
export function isPaired(p: Pairing) {
  return (
    p.status === "active" && !!p.consent_granted_at && !p.consent_revoked_at
  );
}
export function canArrange(trip: Trip, userId: string, role: Role) {
  return (
    role !== "employee" &&
    (trip.status === "requested" ||
      (trip.status === "proposed" && trip.arranged_by === userId))
  );
}
