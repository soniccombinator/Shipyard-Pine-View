import { NextResponse } from 'next/server';
import { createServiceDb } from '@/lib/backend/db/server';
import { getServerEnv } from '@/lib/backend/env';
import { requireBearer, withApiErrors } from '@/lib/backend/http';
import { writeAudit } from '@/lib/backend/audit';

export async function POST(request: Request) {
  return withApiErrors(async () => {
    requireBearer(request, getServerEnv().ADMIN_API_SECRET);
    const db = createServiceDb();
    const { data, error } = await db.rpc('reseed_demo', {});
    if (error) throw error;
    await writeAudit({ action: 'demo.reseeded', resourceType: 'demo_dataset', metadata: { result: data[0] } });
    return NextResponse.json({ reset: true, counts: data[0] });
  });
}
