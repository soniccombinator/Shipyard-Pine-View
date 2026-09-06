import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260905230000_phase_0_2_backend.sql'), 'utf8');

describe('Phase 0 and Phase 2 migration', () => {
  it('enforces consent and preserves employee-authored profile text', () => {
    expect(migration).toContain('consent_granted_at');
    expect(migration).toContain('consent_revoked_at');
    expect(migration).toContain('delegated_publish');
    expect(migration).toContain('drop policy if exists "employee_profiles: active mentor can update"');
    expect(migration).toContain('audit_log_immutable');
    expect(migration.toLowerCase()).toContain('for update skip locked');
    expect(migration).toContain("locked_at < now() - interval '10 minutes'");
  });

  it('contains 150 abilities across 15 practical categories', () => {
    const section = migration.slice(migration.indexOf('with source(category, labels)'), migration.indexOf('), expanded as'));
    const arrays = Array.from(section.matchAll(/array\[(.*?)\]\)/g), match => Array.from(match[1].matchAll(/'[^']+'/g)).length);
    expect(arrays).toHaveLength(15);
    expect(arrays.every(count => count === 10)).toBe(true);
    expect(arrays.reduce((sum, count) => sum + count, 0)).toBe(150);
  });

  it('contains 30 accommodation options and idempotent inserts', () => {
    const start = migration.indexOf('insert into public.accommodation_taxonomy');
    const end = migration.indexOf('on conflict (slug)', start);
    const rows = migration.slice(start, end).match(/^\('[^\n]+\),?$/gm) ?? [];
    expect(rows).toHaveLength(30);
    expect(migration.slice(end)).toContain('do update');
    expect(migration).toContain('create or replace function public.reseed_demo()');
  });

  it('keeps scheduled check-ins private to the mentee and active, consented mentor', () => {
    const checkIns = readFileSync(join(process.cwd(), 'supabase/migrations/20260906000100_mentor_check_ins.sql'), 'utf8');
    expect(checkIns).toContain('create table public.mentor_check_ins');
    expect(checkIns).toContain("status in ('scheduled', 'completed', 'cancelled')");
    expect(checkIns).toContain('consent_granted_at is not null');
    expect(checkIns).toContain('consent_revoked_at is null');
  });
});
