// @vitest-environment node
import { beforeEach, afterEach, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  createCommuteDb,
  asUser,
  command,
  readWorkspace,
  EMPLOYEE,
  MENTOR,
  EMPLOYER,
  OTHER_EMPLOYEE,
  OTHER_MENTOR,
  OTHER_EMPLOYER,
  future,
  id,
} from "@/test/commute-db";
let db: PGlite;
beforeEach(async () => {
  db = await createCommuteDb();
}, 30000);
afterEach(async () => {
  await db.close();
});
async function pair() {
  await asUser(db, MENTOR);
  const pairingId = await command(db, {
    action: "invite",
    employeeId: EMPLOYEE,
  });
  await asUser(db, EMPLOYEE);
  await command(db, { action: "accept_pairing", pairingId });
  return pairingId;
}
async function request(employerId: string | null = EMPLOYER) {
  await asUser(db, EMPLOYEE);
  return command(db, {
    action: "request",
    origin: "Downtown station",
    destination: "Gulf Coast Auto",
    arriveBy: future(48),
    employerId,
  });
}
async function propose(tripId: string, arranger = MENTOR) {
  await asUser(db, arranger);
  await command(db, {
    action: "propose",
    tripId,
    version: 1,
    plan: "I will drive my car. Meet by the station entrance.",
    pickupAt: future(47),
  });
}

it("requires employee acceptance before the mentor can read or arrange a ride", async () => {
  const tripId = await request(null);
  await asUser(db, MENTOR);
  const pairingId = await command(db, {
    action: "invite",
    employeeId: EMPLOYEE,
  });
  expect((await readWorkspace(db)).trips).toHaveLength(0);
  await expect(
    command(db, { action: "accept_pairing", pairingId }),
  ).rejects.toThrow();
  await expect(
    command(db, {
      action: "propose",
      tripId,
      version: 1,
      plan: "I can drive you there.",
      pickupAt: future(47),
    }),
  ).rejects.toThrow();
  await asUser(db, EMPLOYEE);
  await command(db, { action: "accept_pairing", pairingId });
  await asUser(db, MENTOR);
  expect((await readWorkspace(db)).trips).toHaveLength(1);
});

it("persists an employee request, mentor car plan, employee confirmation and completion", async () => {
  await pair();
  const tripId = await request();
  await propose(tripId);
  await expect(
    command(db, { action: "confirm", tripId, version: 2 }),
  ).rejects.toThrow();
  await expect(
    command(db, { action: "complete", tripId, version: 2 }),
  ).rejects.toThrow();
  await asUser(db, EMPLOYEE);
  await command(db, { action: "confirm", tripId, version: 2 });
  await asUser(db, EMPLOYER);
  const shared = (await readWorkspace(db)).trips[0];
  expect(shared).toMatchObject({
    status: "confirmed",
    arranged_by: MENTOR,
    origin: "Downtown station",
    destination: "Gulf Coast Auto",
  });
  await expect(
    command(db, { action: "complete", tripId, version: 3 }),
  ).rejects.toThrow();
  await asUser(db, MENTOR);
  await command(db, { action: "complete", tripId, version: 3 });
  await asUser(db, EMPLOYEE);
  expect((await readWorkspace(db)).trips[0].status).toBe("completed");
  await db.exec("reset role");
  expect((await db.query("select * from audit_log")).rows).toHaveLength(6);
});

it("allows the shared employer to arrange a car and the mentor to coordinate completion", async () => {
  await pair();
  const tripId = await request();
  await propose(tripId, EMPLOYER);
  await asUser(db, EMPLOYEE);
  await command(db, { action: "confirm", tripId, version: 2 });
  await asUser(db, MENTOR);
  expect((await readWorkspace(db)).trips[0].arranged_by).toBe(EMPLOYER);
  await command(db, { action: "complete", tripId, version: 3 });
});

it("blocks unrelated users and direct writes, including requests with a null employer", async () => {
  const tripId = await request(null);
  for (const user of [OTHER_EMPLOYEE, OTHER_MENTOR, EMPLOYER, OTHER_EMPLOYER]) {
    await asUser(db, user);
    expect((await readWorkspace(db)).trips).toHaveLength(0);
    await expect(
      command(db, { action: "cancel", tripId, version: 1 }),
    ).rejects.toThrow();
  }
  await asUser(db, EMPLOYEE);
  await expect(
    db.query("update commute_requests set status='cancelled' where id=$1", [
      tripId,
    ]),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query("update profiles set role='mentor' where id=$1", [EMPLOYEE]),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query(
      "insert into mentorships(mentor_id,employee_id,status) values($1,$2,'active')",
      [MENTOR, EMPLOYEE],
    ),
  ).rejects.toThrow("permission denied");
  await db.exec("reset role; set role anon");
  await expect(command(db, { action: "request" })).rejects.toThrow(
    "permission denied",
  );
});

it("rejects stale confirmation after the proposed ride changes", async () => {
  await pair();
  const tripId = await request();
  await propose(tripId);
  await command(db, {
    action: "propose",
    tripId,
    version: 2,
    plan: "Revised: company car, different pickup entrance.",
    pickupAt: future(46),
  });
  await asUser(db, EMPLOYEE);
  await expect(
    command(db, { action: "confirm", tripId, version: 2 }),
  ).rejects.toMatchObject({ code: "40001" });
  await command(db, { action: "confirm", tripId, version: 3 });
  expect((await readWorkspace(db)).trips[0]).toMatchObject({
    status: "confirmed",
    version: 4,
  });
});

it("ending a pairing removes access and withdraws the former mentor ride plan", async () => {
  const pairingId = await pair();
  const tripId = await request();
  await propose(tripId);
  await asUser(db, EMPLOYEE);
  await command(db, { action: "confirm", tripId, version: 2 });
  await command(db, { action: "end_pairing", pairingId });
  expect((await readWorkspace(db)).trips[0]).toMatchObject({
    status: "requested",
    plan: null,
    arranged_by: null,
  });
  await asUser(db, MENTOR);
  expect((await readWorkspace(db)).trips).toHaveLength(0);
  await expect(
    command(db, {
      action: "propose",
      tripId,
      version: 4,
      plan: "Another ride plan from former mentor.",
      pickupAt: future(47),
    }),
  ).rejects.toThrow();
});

it("removing employer access withdraws its upcoming plan but preserves mentor arrangements", async () => {
  await pair();
  const tripId = await request();
  await propose(tripId, EMPLOYER);
  await asUser(db, EMPLOYEE);
  await command(db, { action: "share", tripId, version: 2, employerId: null });
  expect((await readWorkspace(db)).trips[0]).toMatchObject({
    status: "requested",
    arranged_by: null,
  });
  await asUser(db, EMPLOYER);
  expect((await readWorkspace(db)).trips).toHaveLength(0);
  await asUser(db, MENTOR);
  await command(db, {
    action: "propose",
    tripId,
    version: 3,
    plan: "I can help arrange the car from the station.",
    pickupAt: future(47),
  });
  await asUser(db, EMPLOYEE);
  await command(db, {
    action: "share",
    tripId,
    version: 4,
    employerId: EMPLOYER,
  });
  expect((await readWorkspace(db)).trips[0]).toMatchObject({
    status: "proposed",
    arranged_by: MENTOR,
  });
});

it("validates pickup/arrival times and prevents public signup from assigning mentor access", async () => {
  await pair();
  const tripId = await request();
  await asUser(db, MENTOR);
  await expect(
    command(db, {
      action: "propose",
      tripId,
      version: 1,
      plan: "I can drive to the workplace.",
      pickupAt: future(49),
    }),
  ).rejects.toMatchObject({ code: "22023" });
  await expect(
    command(db, {
      action: "propose",
      tripId,
      version: 1,
      plan: "I can drive to the workplace.",
      pickupAt: future(-1),
    }),
  ).rejects.toMatchObject({ code: "22023" });
  await db.exec("reset role");
  await db.query("insert into auth.users values($1,$2,$3)", [
    id(900),
    JSON.stringify({ role: "mentor" }),
    "{}",
  ]);
  expect(
    (await db.query("select role from profiles where id=$1", [id(900)])).rows,
  ).toEqual([{ role: "employee" }]);
});
