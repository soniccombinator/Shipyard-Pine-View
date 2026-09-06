import { ApiError } from '@/lib/backend/http';
import { createServiceDb, createUserDb } from '@/lib/backend/db/server';
import type { UserRole } from '@/lib/backend/db/types';

export type Actor = { profileId: string; authUserId: string; role: UserRole; displayName: string };

export async function requireActor(allowedRoles?: UserRole[]): Promise<Actor> {
  const userDb = await createUserDb();
  const { data: { user }, error: authError } = await userDb.auth.getUser();
  if (authError || !user) throw new ApiError(401, 'Sign in is required.', 'unauthenticated');

  const db = createServiceDb();
  const { data, error } = await db.from('profiles').select('id, role, full_name').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(403, 'This account has no ConnectAble profile.', 'profile_missing');
  if (allowedRoles && !allowedRoles.includes(data.role)) throw new ApiError(403, 'This account does not have access to this area.', 'role_forbidden');
  return { profileId: data.id, authUserId: user.id, role: data.role, displayName: data.full_name };
}

export const requireCoach = () => requireActor(['mentor']);
