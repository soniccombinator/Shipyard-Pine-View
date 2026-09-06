import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  prepare: false,
  ssl: "require",
});

const migrationsDirectory = path.resolve("supabase", "migrations");

try {
  await sql`
    create table if not exists public.schema_migrations (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `;

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of migrationFiles) {
    const contents = await readFile(path.join(migrationsDirectory, filename), "utf8");
    const checksum = createHash("sha256").update(contents).digest("hex");
    const applied = await sql`
      select checksum from public.schema_migrations where filename = ${filename}
    `;

    if (applied.length > 0) {
      if (applied[0].checksum !== checksum) {
        throw new Error(`Migration ${filename} changed after it was applied.`);
      }
      console.log(`Already applied: ${filename}`);
      continue;
    }

    // The shared project predates this local runner. Record its existing
    // foundation as the baseline instead of trying to recreate its tables.
    if (filename.endsWith('_init.sql')) {
      const [existing] = await sql`select to_regclass('public.profiles') is not null as present`;
      if (existing.present) {
        await sql`insert into public.schema_migrations (filename, checksum) values (${filename}, ${checksum})`;
        console.log(`Recorded existing foundation: ${filename}`);
        continue;
      }
    }

    await sql.unsafe(contents);
    await sql`
      insert into public.schema_migrations (filename, checksum)
      values (${filename}, ${checksum})
    `;
    console.log(`Applied: ${filename}`);
  }

  const [counts] = await sql`
    select
      (select count(*)::int from public.skill_taxonomy) as abilities,
      (select count(*)::int from public.accommodation_taxonomy) as accommodations,
      (select count(*)::int from public.profiles where role = 'employee') as employees,
      (select count(*)::int from public.profiles where role = 'employer') as employers,
      (select count(*)::int from public.jobs) as jobs
  `;

  console.log(
    `Verified demo data: ${counts.abilities} abilities, ${counts.accommodations} accommodations, ` +
      `${counts.employees} employees, ${counts.employers} employers, ${counts.jobs} jobs.`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown migration error";
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
