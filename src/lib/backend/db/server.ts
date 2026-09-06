import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/backend/env';
import type { Database } from './types';

export function createServiceDb() {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createUserDb() {
  const env = getServerEnv();
  const store = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => { try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server component. */ } },
    },
  });
}
