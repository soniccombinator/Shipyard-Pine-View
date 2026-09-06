/**
 * Demo data for ConnectAble.
 *
 *   npm run seed
 *
 * Creates (or reuses) demo accounts through the auth admin API, fills in
 * their profiles, posts 25 jobs, and computes matches. Safe to re-run.
 * All demo accounts share the password "connectable-demo".
 */
import { createClient } from "@supabase/supabase-js";
import { computeMatchRows, type EmployeeForMatch, type JobForMatch, type SalaryForMatch } from "../src/lib/match/score.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required (run with --env-file=.env.local).");
  process.exit(1);
}
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

export const DEMO_PASSWORD = "connectable-demo";

type Employee = {
  email: string;
  full_name: string;
  slug: string;
  headline: string;
  about: string;
  about_raw: string;
  city: string;
  state: string;
  remote_preference: "remote" | "in_person" | "either";
  abilities: string[];
  accommodations: string[];
  availability: string[];
  awards: object[];
  education: object[];
  volunteer: object[];
  salary_min: number;
  salary_max: number;
};

const EMPLOYEES: Employee[] = [
  {
    email: "nick@connectable.demo",
    full_name: "Nick Alvarez",
    slug: "nick-demo",
    headline: "Friendly team member who loves keeping things organized",
    about: "Nick is dependable, upbeat and detail-focused. He kept the stockroom at a busy café running smoothly for two years and is known for greeting every customer by name.",
    about_raw: "I worked at the cafe and I made sure everything was in the right place. People liked when I said hi to them. I never missed a shift.",
    city: "Sarasota",
    state: "FL",
    remote_preference: "in_person",
    abilities: ["Greeting customers", "Stocking shelves", "Following a checklist", "Being on time", "Working on a team"],
    accommodations: ["Written instructions", "Regular schedule", "Job coach visits"],
    availability: ["Weekday mornings", "Weekday afternoons", "Saturdays"],
    awards: [{ title: "Employee of the Month", org: "Rise Up Café", year: "2025" }],
    education: [{ title: "High school diploma", org: "Booker High School", year: "2022" }],
    volunteer: [{ title: "Food bank helper", org: "All Faiths Food Bank", year: "2023–2024", details: "Sorted and packed donations every Saturday." }],
    salary_min: 15,
    salary_max: 18,
  },
  {
    email: "priya@connectable.demo",
    full_name: "Priya Nair",
    slug: "priya-demo",
    headline: "Careful, patient and great with animals",
    about: "Priya volunteers at the humane society and thrives on routine tasks done well.",
    about_raw: "",
    city: "Sarasota",
    state: "FL",
    remote_preference: "in_person",
    abilities: ["Caring for animals", "Cleaning and organizing", "Following a checklist"],
    accommodations: ["Quiet workspace", "Visual reminders"],
    availability: ["Weekday mornings", "Sundays"],
    awards: [],
    education: [{ title: "Certificate in Animal Care", org: "Suncoast Technical College", year: "2024" }],
    volunteer: [{ title: "Kennel assistant", org: "Humane Society of Sarasota", year: "2023–2025" }],
    salary_min: 14,
    salary_max: 17,
  },
  {
    email: "marcus@connectable.demo",
    full_name: "Marcus Lee",
    slug: "marcus-demo",
    headline: "Fast, focused and happy on his feet all day",
    about: "Marcus ran the drive-through line at a coffee cart program and loves a busy morning rush.",
    about_raw: "",
    city: "Sarasota",
    state: "FL",
    remote_preference: "in_person",
    abilities: ["Cash register", "Greeting customers", "Food prep", "Being on time"],
    accommodations: ["Clear step-by-step tasks", "Breaks when needed"],
    availability: ["Weekday mornings", "Weekday afternoons"],
    awards: [],
    education: [],
    volunteer: [],
    salary_min: 16,
    salary_max: 20,
  },
  {
    email: "elena@connectable.demo",
    full_name: "Elena Rossi",
    slug: "elena-demo",
    headline: "Organized and calm, loves data entry and sorting",
    about: "Elena prefers quiet, structured work and is meticulous with details.",
    about_raw: "",
    city: "Sarasota",
    state: "FL",
    remote_preference: "either",
    abilities: ["Data entry", "Sorting and packing", "Following a checklist"],
    accommodations: ["Quiet workspace", "Written instructions"],
    availability: ["Weekday afternoons", "Weekday evenings"],
    awards: [],
    education: [],
    volunteer: [],
    salary_min: 15,
    salary_max: 19,
  },
  {
    email: "tyler@connectable.demo",
    full_name: "Tyler Brooks",
    slug: "tyler-demo",
    headline: "Strong, steady and great outdoors",
    about: "Tyler grew vegetables in a garden-to-market program and likes physical work with a clear plan.",
    about_raw: "",
    city: "Bradenton",
    state: "FL",
    remote_preference: "in_person",
    abilities: ["Gardening", "Sorting and packing", "Working on a team"],
    accommodations: ["Regular schedule", "Extra training time"],
    availability: ["Weekday mornings", "Saturdays", "Sundays"],
    awards: [],
    education: [],
    volunteer: [],
    salary_min: 14,
    salary_max: 16,
  },
];

const EXTRA_EMPLOYEES: Employee[] = [
  ['maya', 'Maya Chen', 'Reliable hospitality teammate', ['Prepare a meeting room', 'Fold towels and linens', 'Complete a cleaning checklist']],
  ['devon', 'Devon Williams', 'Positive warehouse and delivery helper', ['Pack a shipment', 'Apply shipping labels', 'Keep aisles clear']],
  ['sofia', 'Sofia Martinez', 'Patient office assistant with an eye for detail', ['Scan a document', 'Enter data accurately', 'Sort incoming mail']],
  ['jamal', 'Jamal Carter', 'Friendly customer service team member', ['Welcome a customer', 'Offer directions', 'Thank a customer']],
  ['lily', 'Lily Nguyen', 'Focused café and food prep teammate', ['Wash produce', 'Prepare cold foods', 'Clean a coffee station']],
  ['noah', 'Noah Thompson', 'Dependable groundskeeping assistant', ['Water plants', 'Pull weeds', 'Collect yard debris']],
  ['ava', 'Ava Robinson', 'Organized digital workplace assistant', ['Use business email', 'Enter information in a form', 'Follow a digital checklist']],
].map(([slug, fullName, headline, abilities], index) => ({
  email: `${slug}@connectable.demo`, full_name: fullName as string, slug: `${slug}-demo`, headline: headline as string,
  about: `${fullName} is ready to contribute in a structured, supportive workplace.`, about_raw: `I like doing useful work and learning each task step by step.`,
  city: index % 2 ? 'Bradenton' : 'Sarasota', state: 'FL', remote_preference: index === 6 ? 'either' : 'in_person',
  abilities: abilities as string[], accommodations: ['Written instructions', 'Predictable schedule'],
  availability: ['Weekday mornings', 'Weekday afternoons'], awards: [], education: [], volunteer: [], salary_min: 14, salary_max: 19,
}));
EMPLOYEES.push(...EXTRA_EMPLOYEES);

const EMPLOYER = {
  email: "employer@connectable.demo",
  full_name: "Dana Whitfield",
  company_name: "Gulf Coast Auto Group",
  description: "Family-owned dealership with a service center, detail bay and café. We have hired through Inclusion Revolution since 2023.",
  website: "https://example.com",
  city: "Sarasota",
  state: "FL",
  accommodations_offered: ["Written instructions", "Regular schedule", "Job coach visits", "Clear step-by-step tasks"],
};

const EMPLOYERS = [EMPLOYER, ...[
  ['Suncoast Hospitality', 'Morgan Reed'], ['Sarasota Garden Center', 'Alex Patel'], ['Manatee Distribution', 'Taylor Kim'],
  ['Bayfront Offices', 'Casey Johnson'], ['Harbor Café Group', 'Jamie Rivera'], ['Community Market', 'Robin Davis'],
  ['Gulfside Services', 'Cameron Wilson'],
].map(([company_name, full_name], index) => ({
  email: `employer${index + 2}@connectable.demo`, full_name, company_name,
  description: `${company_name} offers clear training, supportive supervisors, and inclusive opportunities.`, website: 'https://example.com',
  city: index % 2 ? 'Bradenton' : 'Sarasota', state: 'FL', accommodations_offered: ['Written instructions', 'Predictable schedule', 'Visual instructions'],
}))];

const JOBS = [
  {
    title: "Lot Attendant",
    description: "Keep the front lot looking sharp: park and line up vehicles, wipe down cars, keep the walkways clear and greet customers as they arrive.",
    abilities_required: ["Greeting customers", "Following a checklist", "Being on time", "Cleaning and organizing"],
    city: "Sarasota",
    state: "FL",
    remote: "in_person",
    availability: ["Weekday mornings", "Saturdays"],
    salary_min: 15,
    salary_max: 17,
    accommodations_offered: ["Written instructions", "Regular schedule", "Job coach visits"],
    status: "open",
  },
  {
    title: "Service Greeter",
    description: "Welcome customers to the service drive, check them in on a tablet and walk them to the lounge. A warm smile matters most.",
    abilities_required: ["Greeting customers", "Working on a team", "Data entry"],
    city: "Sarasota",
    state: "FL",
    remote: "in_person",
    availability: ["Weekday mornings", "Weekday afternoons"],
    salary_min: 16,
    salary_max: 19,
    accommodations_offered: ["Clear step-by-step tasks", "Breaks when needed", "Regular schedule"],
    status: "open",
  },
];

const EXTRA_JOB_TITLES = [
  'Stockroom Assistant', 'Café Prep Assistant', 'Dishroom Attendant', 'Guest Services Helper', 'Housekeeping Assistant',
  'Event Setup Assistant', 'Garden Center Helper', 'Landscape Crew Assistant', 'Package Sorter', 'Shipping Assistant',
  'Customer Welcome Associate', 'Cart Attendant', 'Checkout Assistant', 'Mailroom Assistant', 'Document Scanning Clerk',
  'Data Entry Assistant', 'Reception Support', 'Office Supply Assistant', 'Delivery Helper', 'Community Center Assistant',
  'Food Bank Warehouse Helper', 'Library Shelving Assistant', 'Pet Care Assistant',
];
const ALL_JOBS = [...JOBS, ...EXTRA_JOB_TITLES.map((title, index) => ({
  title,
  description: `Support the ${title.toLowerCase()} team with clear daily tasks and hands-on training.`,
  abilities_required: index % 3 === 0 ? ['Follow a multi-step direction', 'Complete an assigned team role'] : index % 3 === 1 ? ['Complete a cleaning checklist', 'Being on time'] : ['Enter information in a form', 'Ask a clarifying question'],
  city: index % 2 ? 'Bradenton' : 'Sarasota', state: 'FL', remote: 'in_person',
  availability: ['Weekday mornings', 'Weekday afternoons'], salary_min: 15, salary_max: 19,
  accommodations_offered: ['Written instructions', 'Predictable schedule', 'Visual instructions'], status: 'open',
}))];

const MENTOR = { email: "mentor@connectable.demo", full_name: "Sam Ortiz" };

async function ensureUser(email: string, full_name: string, role: string): Promise<string> {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name, role },
    app_metadata: { connectable_role: role },
  });
  if (error || !data.user) throw error ?? new Error("no user returned");
  return data.user.id;
}

async function must<T>(
  label: string,
  p: PromiseLike<{ error: { message: string } | null; data?: T | null }>,
): Promise<T | null | undefined> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function main() {
  const employerIds: string[] = [];
  for (const employer of EMPLOYERS) {
    const employerId = await ensureUser(employer.email, employer.full_name, "employer");
    employerIds.push(employerId);
    await must("employer profile", admin.from("employer_profiles").upsert(
      { user_id: employerId, company_name: employer.company_name, description: employer.description, website: employer.website, city: employer.city, state: employer.state, accommodations_offered: employer.accommodations_offered },
      { onConflict: "user_id" },
    ));
  }

  const employeeIds: string[] = [];
  for (const e of EMPLOYEES) {
    const id = await ensureUser(e.email, e.full_name, "employee");
    employeeIds.push(id);
    const { slug, salary_min, salary_max } = e;
    const profile = Object.fromEntries(Object.entries(e).filter(([key]) => !['email', 'full_name', 'slug', 'salary_min', 'salary_max'].includes(key)));
    await must(
      `profile ${e.full_name}`,
      admin.from("employee_profiles").upsert({ user_id: id, ...profile, passport_slug: slug, passport_public: true, searchable: true }, { onConflict: "user_id" }),
    );
    await must(`pay ${e.full_name}`, admin.from("employee_private").upsert({ user_id: id, salary_min, salary_max }, { onConflict: "user_id" }));
  }

  const mentorId = await ensureUser(MENTOR.email, MENTOR.full_name, "mentor");
  await must("mentor profile", admin.from("mentor_profiles").upsert({ user_id: mentorId, bio: "Job coach with Inclusion Revolution since 2021.", background_check: "cleared", capacity: 20 }, { onConflict: "user_id" }));
  for (const employeeId of employeeIds) await must("mentorship", admin.from("mentorships").upsert({ mentor_id: mentorId, employee_id: employeeId, status: "active", consent_granted_at: new Date().toISOString() }, { onConflict: "mentor_id,employee_id" }));

  const jobIds: string[] = [];
  for (const [index, job] of ALL_JOBS.entries()) {
    const employerId = employerIds[index % employerIds.length];
    const { data: existing } = await admin.from("jobs").select("id").eq("employer_id", employerId).eq("title", job.title).maybeSingle();
    if (existing) {
      await must(`job ${job.title}`, admin.from("jobs").update(job).eq("id", existing.id));
      jobIds.push(existing.id as string);
    } else {
      const data = await must<{ id: string }>(`job ${job.title}`, admin.from("jobs").insert({ ...job, employer_id: employerId }).select("id").single());
      jobIds.push(data!.id);
    }
  }

  const { data: jobs } = await admin.from("jobs").select("id, abilities_required, accommodations_offered, availability, city, state, remote, salary_min, salary_max").in("id", jobIds);
  const { data: employees } = await admin.from("employee_profiles").select("user_id, abilities, accommodations, availability, city, state, remote_preference").in("user_id", employeeIds);
  const { data: pay } = await admin.from("employee_private").select("user_id, salary_min, salary_max").in("user_id", employeeIds);
  const num = (v: unknown) => (v == null ? null : Number(v));
  const salaryMap = new Map<string, SalaryForMatch>((pay ?? []).map((p) => [p.user_id as string, { salary_min: num(p.salary_min), salary_max: num(p.salary_max) }]));
  const rows = computeMatchRows(
    (jobs ?? []).map((j) => ({ ...j, salary_min: num(j.salary_min), salary_max: num(j.salary_max) })) as JobForMatch[],
    (employees ?? []) as EmployeeForMatch[],
    salaryMap,
  );
  await must("matches", admin.from("matches").upsert(rows, { onConflict: "job_id,employee_id" }));

  const lot = rows.find((r) => r.job_id === jobIds[0] && r.employee_id === employeeIds[0]);
  if (lot) {
    const { data: m } = await admin.from("matches").select("id").eq("job_id", lot.job_id).eq("employee_id", lot.employee_id).maybeSingle();
    if (m) await must("feedback", admin.from("match_feedback").upsert({ match_id: m.id, user_id: employerIds[0], value: "interested" }, { onConflict: "match_id,user_id" }));
  }

  console.log(`Seeded ${EMPLOYERS.length} employers, ${EMPLOYEES.length} employees, 1 mentor, ${ALL_JOBS.length} jobs, ${rows.length} matches.`);
  console.log(`Log in as ${EMPLOYERS[0].email} or ${EMPLOYEES[0].email} with password "${DEMO_PASSWORD}".`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
