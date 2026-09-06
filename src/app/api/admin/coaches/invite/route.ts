import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceDb } from '@/lib/backend/db/server';
import { getServerEnv } from '@/lib/backend/env';
import { readJson, requireBearer, withApiErrors } from '@/lib/backend/http';
import { queueCommunication } from '@/lib/backend/comms';
import { writeAudit } from '@/lib/backend/audit';

const schema = z.object({ email: z.string().email(), displayName: z.string().trim().min(2).max(120) }).strict();

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const env = getServerEnv();
    requireBearer(request, env.ADMIN_API_SECRET);
    const input = await readJson(request, schema);
    const db = createServiceDb();
    const { data, error } = await db.auth.admin.generateLink({ type: 'invite', email: input.email, options: { data: { full_name: input.displayName, role: 'mentor' } } });
    if (error) throw error;
    await db.auth.admin.updateUserById(data.user.id, { app_metadata: { connectable_role: 'mentor' }, user_metadata: { full_name: input.displayName, role: 'mentor' } });
    const { data: profile, error: profileError } = await db.from('profiles').update({ role: 'mentor', full_name: input.displayName }).eq('id', data.user.id).select('id').single();
    if (profileError) throw profileError;
    await db.from('mentor_profiles').upsert({ user_id: data.user.id }, { onConflict: 'user_id' });
    await queueCommunication({ channel: 'email', recipient: input.email, template: 'mentor_invite', payload: { subject: 'Your ConnectAble mentor invitation', body: `You have been invited as a ConnectAble mentor. Accept the invitation: ${data.properties.action_link}` }, dedupeKey: `mentor-invite:${data.user.id}` });
    await writeAudit({ action: 'mentor.invited', resourceType: 'profile', resourceId: profile.id, metadata: { emailDomain: input.email.split('@')[1] } });
    return NextResponse.json({ invited: true, profileId: profile.id }, { status: 201 });
  });
}
