"use client";
import { useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { saveCommute } from "@/lib/commute/actions";
import {
  canArrange,
  isPaired,
  tripStatus,
  type CommuteData,
  type CommuteCommand,
  type Executor,
} from "@/lib/commute/model";
import type { Role } from "@/lib/domain";

const dateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const localInput = (value: string) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function CommuteWorkspace({
  data,
  userId,
  viewerRole: role,
  execute = saveCommute,
}: {
  data: CommuteData;
  userId: string;
  viewerRole: Role;
  execute?: Executor;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showAll, setShowAll] = useState(false);
  const person = (id: string | null) =>
    data.people.find((p) => p.id === id)?.name ?? "Team member";
  const pairs = data.pairings.filter((p) => p.status !== "ended");
  const candidates = data.people.filter(
    (p) =>
      p.role === "employee" &&
      !pairs.some(
        (pair) => pair.employee_id === p.id && pair.mentor_id === userId,
      ),
  );
  const employers = data.people.filter((p) => p.role === "employer");
  async function run(command: CommuteCommand, form?: HTMLFormElement) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await execute(command);
      if (result.error) setError(result.error);
      else {
        setNotice(
          command.action === "invite"
            ? "Invitation sent. The employee must accept before you can see their rides."
            : command.action === "confirm"
              ? "Ride confirmed. Your mentor and employer can see the agreed plan."
              : "Saved.",
        );
        form?.reset();
      }
    } catch {
      setError(
        "Connection interrupted. Refresh to check whether your change was saved.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive p-3 text-sm"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-green-soft p-3 text-sm">
          {notice}
        </p>
      )}
      {role !== "employer" && (
        <section
          aria-label="Mentor pairing"
          className="rounded-xl border bg-card p-5"
        >
          <h2 className="text-lg font-bold">
            {role === "mentor" ? "Your employees" : "Your mentor"}
          </h2>
          {!pairs.length && (
            <p className="mt-2 text-sm text-muted-foreground">
              {role === "mentor"
                ? "Invite an employee to help with their commute."
                : "No mentor paired yet. Accept an invitation here when your mentor sends one."}
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {pairs.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3"
              >
                <div>
                  <span className="font-medium">
                    {person(role === "mentor" ? p.employee_id : p.mentor_id)}
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {isPaired(p) ? "Paired" : "Awaiting employee"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {role === "employee" && p.status === "pending" && (
                    <Button
                      disabled={pending}
                      onClick={() =>
                        void run({ action: "accept_pairing", pairingId: p.id })
                      }
                    >
                      Accept mentor
                    </Button>
                  )}
                  <Button
                    disabled={pending}
                    variant="ghost"
                    onClick={() =>
                      void run({ action: "end_pairing", pairingId: p.id })
                    }
                  >
                    {isPaired(p)
                      ? "End pairing"
                      : role === "employee"
                        ? "Decline"
                        : "Withdraw"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {role === "employee" && pairs.some((p) => p.status === "pending") && (
            <p className="mt-3 text-sm text-muted-foreground">
              Accepting lets this mentor see your commute requests and help
              arrange rides. You can end the pairing here.
            </p>
          )}
          {role === "mentor" && candidates.length > 0 && (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run({
                  action: "invite",
                  employeeId: String(
                    new FormData(e.currentTarget).get("employee"),
                  ),
                });
              }}
            >
              <label className="min-w-0 flex-1 text-sm font-medium">
                Invite an employee
                <select
                  name="employee"
                  required
                  className="mt-1 block h-10 w-full rounded-lg border bg-background px-2"
                >
                  <option value="">Choose an employee</option>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" disabled={pending}>
                Invite
              </Button>
            </form>
          )}
        </section>
      )}

      {role === "employee" && (
        <details className="rounded-xl border bg-card p-5">
          <summary className="cursor-pointer font-bold">Request a ride</summary>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              void run(
                {
                  action: "request",
                  origin: String(f.get("origin")),
                  destination: String(f.get("destination")),
                  arriveBy: new Date(String(f.get("arrival"))).toISOString(),
                  employerId: String(f.get("employer")) || null,
                },
                form,
              );
            }}
          >
            <label className="text-sm font-medium">
              From
              <Input
                name="origin"
                required
                minLength={3}
                maxLength={160}
                placeholder="Pickup location"
              />
            </label>
            <label className="text-sm font-medium">
              To
              <Input
                name="destination"
                required
                minLength={3}
                maxLength={160}
                placeholder="Workplace or destination"
              />
            </label>
            <label className="text-sm font-medium">
              Arrive by
              <Input name="arrival" type="datetime-local" required />
            </label>
            <label className="text-sm font-medium">
              Share with employer (optional)
              <select
                name="employer"
                className="block h-10 w-full rounded-lg border bg-background px-2"
              >
                <option value="">Only my mentor</option>
                {employers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Your paired mentor and the employer you choose can see these
              locations and help arrange the ride.
            </p>
            <Button disabled={pending} type="submit">
              Request ride
            </Button>
          </form>
        </details>
      )}

      <section aria-label="Commute requests" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Commutes</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show finished trips
          </label>
        </div>
        {!data.trips.filter(
          (t) => showAll || !["completed", "cancelled"].includes(t.status),
        ).length && (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {role === "employee"
              ? "No rides requested. Add your first commute above."
              : role === "mentor"
                ? "No open rides from your paired employees."
                : "No open rides have been shared with your company."}
          </p>
        )}
        {data.trips
          .filter(
            (t) => showAll || !["completed", "cancelled"].includes(t.status),
          )
          .map((t) => {
            const closed = ["completed", "cancelled"].includes(t.status);
            return (
              <article
                key={t.id}
                aria-label={`${person(t.employee_id)}: ${t.origin} to ${t.destination}`}
                className="rounded-xl border bg-card p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">{person(t.employee_id)}</h3>
                  <Badge variant="outline">{tripStatus[t.status]}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-lg font-bold">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  <span className="break-words">{t.origin}</span>
                  <ArrowRight className="size-4 shrink-0" aria-label="to" />
                  <span className="break-words">{t.destination}</span>
                </div>
                <p className="mt-2 text-sm">
                  Arrive by {dateTime(t.arrive_by)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.employer_id
                    ? `Shared with ${person(t.employer_id)}`
                    : "Shared with paired mentors only"}
                </p>
                {t.plan && (
                  <div className="mt-4 rounded-lg bg-green-soft p-4">
                    <p className="font-bold">
                      Plan from {person(t.arranged_by)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words">
                      {t.plan}
                    </p>
                    <p className="mt-2 text-sm">
                      Pickup: {dateTime(t.pickup_at!)}
                    </p>
                    {t.status === "proposed" && (
                      <p className="mt-2 text-sm">
                        Waiting for the employee to confirm.
                      </p>
                    )}
                  </div>
                )}
                {canArrange(t, userId, role) && (
                  <details className="mt-4 rounded-lg border p-3">
                    <summary className="cursor-pointer font-bold">
                      {t.plan ? "Edit ride plan" : "Help arrange this ride"}
                    </summary>
                    <form
                      key={t.version}
                      className="mt-3 space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void run({
                          action: "propose",
                          tripId: t.id,
                          version: t.version,
                          plan: String(f.get("plan")),
                          pickupAt: new Date(
                            String(f.get("pickup")),
                          ).toISOString(),
                        });
                      }}
                    >
                      <label className="block text-sm font-medium">
                        Ride plan
                        <Textarea
                          name="plan"
                          defaultValue={t.plan ?? ""}
                          required
                          minLength={10}
                          maxLength={1000}
                          placeholder="Who will drive, whose car, and where to meet. You can arrange this with the employer."
                        />
                      </label>
                      <label className="block text-sm font-medium">
                        Pickup time
                        <Input
                          name="pickup"
                          type="datetime-local"
                          defaultValue={
                            t.pickup_at ? localInput(t.pickup_at) : ""
                          }
                          required
                        />
                      </label>
                      <Button disabled={pending} type="submit">
                        Send plan for confirmation
                      </Button>
                    </form>
                  </details>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {role === "employee" && t.status === "proposed" && (
                    <Button
                      disabled={pending}
                      onClick={() =>
                        void run({
                          action: "confirm",
                          tripId: t.id,
                          version: t.version,
                        })
                      }
                    >
                      Confirm ride
                    </Button>
                  )}
                  {t.status === "confirmed" &&
                    (role !== "employer" || t.arranged_by === userId) && (
                      <Button
                        disabled={pending}
                        onClick={() =>
                          void run({
                            action: "complete",
                            tripId: t.id,
                            version: t.version,
                          })
                        }
                      >
                        Mark completed
                      </Button>
                    )}
                  {!closed &&
                    (role !== "employer" || t.arranged_by === userId) && (
                      <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          void run({
                            action: "cancel",
                            tripId: t.id,
                            version: t.version,
                          })
                        }
                      >
                        Cancel ride
                      </Button>
                    )}
                </div>
                {role === "employee" && (!closed || t.employer_id) && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      Employer sharing
                    </summary>
                    <form
                      className="mt-2 flex flex-wrap items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run({
                          action: "share",
                          tripId: t.id,
                          version: t.version,
                          employerId:
                            String(
                              new FormData(e.currentTarget).get("employer"),
                            ) || null,
                        });
                      }}
                    >
                      <label className="min-w-0 flex-1">
                        Share with
                        <select
                          name="employer"
                          defaultValue={t.employer_id ?? ""}
                          className="block h-10 w-full rounded-lg border bg-background px-2"
                        >
                          <option value="">Only my mentor</option>
                          {employers
                            .filter((p) => !closed || p.id === t.employer_id)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <Button
                        type="submit"
                        disabled={pending}
                        variant="outline"
                      >
                        Save sharing
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Removing an employer also withdraws their upcoming ride
                        plan. A mentor&apos;s plan stays in place.
                      </p>
                    </form>
                  </details>
                )}
              </article>
            );
          })}
      </section>
      <p className="text-xs text-muted-foreground">
        Times are shown in your device&apos;s time zone. Refresh to see updates
        from other people.
      </p>
    </div>
  );
}
