import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { CommuteWorkspace } from "./commute-workspace";
import { saveCommute } from "@/lib/commute/actions";
import type { CommuteCommand, CommuteData } from "@/lib/commute/model";
import {
  createCommuteDb,
  asUser,
  command,
  readWorkspace,
  EMPLOYEE,
  MENTOR,
  EMPLOYER,
  future,
} from "@/test/commute-db";

let db: PGlite;
let user = MENTOR;
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Replace only the Supabase transport. The real action validates input and
// invokes the real PostgreSQL command, including permissions and persistence.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: user } }, error: null }),
    },
    rpc: async (name: string, params: { command: unknown }) => {
      expect(name).toBe("commute_command");
      await asUser(db, user);
      try {
        return { data: await command(db, params.command), error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
  }),
}));
beforeEach(async () => {
  db = await createCommuteDb();
  user = MENTOR;
  await asUser(db, user);
}, 30000);
afterEach(async () => {
  cleanup();
  await db.close();
});
const fill = (name: string, value: string) =>
  fireEvent.change(screen.getByLabelText(name, { exact: true }), {
    target: { value },
  });
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const local = (value: string) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

function TestApp({ initial }: { initial: CommuteData }) {
  const [data, setData] = useState(initial);
  const [actor, setActor] = useState(user);
  async function switchSession(id: string) {
    user = id;
    await asUser(db, user);
    setData(await readWorkspace(db));
    setActor(user);
  }
  async function execute(input: CommuteCommand) {
    const result = await saveCommute(input);
    setData(await readWorkspace(db));
    return result;
  }
  return (
    <>
      <label>
        Test session
        <select
          value={actor}
          onChange={(e) => void switchSession(e.target.value)}
        >
          <option value={MENTOR}>Mentor</option>
          <option value={EMPLOYEE}>Employee</option>
          <option value={EMPLOYER}>Employer</option>
        </select>
      </label>
      <CommuteWorkspace
        key={actor}
        data={data}
        userId={actor}
        viewerRole={data.people.find((p) => p.id === actor)!.role}
        execute={execute}
      />
    </>
  );
}

it("runs pairing → employee trip → mentor car plan → employee confirmation → employer visibility → completion through the actual action and SQL", async () => {
  render(<TestApp initial={await readWorkspace(db)} />);
  fill("Invite an employee", EMPLOYEE);
  click("Invite");
  await screen.findByText("Awaiting employee");
  fill("Test session", EMPLOYEE);
  await screen.findByRole("button", { name: "Accept mentor" });
  click("Accept mentor");
  await screen.findByText("Paired");
  fireEvent.click(screen.getByText("Request a ride", { exact: true }));
  fill("From", "Downtown bus station");
  fill("To", "Gulf Coast Auto");
  fill("Arrive by", local(future(48)));
  fill("Share with employer (optional)", EMPLOYER);
  click("Request ride");
  await screen.findByText("Needs a ride");
  fill("Test session", MENTOR);
  await screen.findByText("Help arrange this ride");
  fireEvent.click(screen.getByText("Help arrange this ride"));
  fill(
    "Ride plan",
    "I will coordinate with the employer and drive the company car. Meet at the main entrance.",
  );
  fill("Pickup time", local(future(47)));
  click("Send plan for confirmation");
  await screen.findByText("Review the plan");
  expect(
    screen.queryByRole("button", { name: "Confirm ride" }),
  ).not.toBeInTheDocument();
  fill("Test session", EMPLOYEE);
  await screen.findByRole("button", { name: "Confirm ride" });
  click("Confirm ride");
  await screen.findByText("Ride confirmed");
  fill("Test session", EMPLOYER);
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "Mentor pairing" }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByText("Plan from Sam Ortiz")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Mark completed" }),
  ).not.toBeInTheDocument();
  fill("Test session", MENTOR);
  await screen.findByRole("button", { name: "Mark completed" });
  click("Mark completed");
  await screen.findByText("No open rides from your paired employees.");
  // Remount the UI from a fresh database read, with no retained component state.
  cleanup();
  render(<TestApp initial={await readWorkspace(db)} />);
  fireEvent.click(screen.getByLabelText("Show finished trips"));
  expect(screen.getByText("Completed")).toBeInTheDocument();
  expect(screen.getByText("Downtown bus station")).toBeInTheDocument();
}, 30000);

it("surfaces server errors without claiming the trip saved", async () => {
  user = EMPLOYEE;
  await asUser(db, user);
  render(<TestApp initial={await readWorkspace(db)} />);
  fireEvent.click(screen.getByText("Request a ride", { exact: true }));
  fill("From", "Station");
  fill("To", "Workplace");
  fill("Arrive by", local(future(-1)));
  click("Request ride");
  await screen.findByRole("alert");
  expect((await readWorkspace(db)).trips).toHaveLength(0);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
