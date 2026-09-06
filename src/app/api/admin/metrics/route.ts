import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/backend/env';
import { requireBearer, withApiErrors } from '@/lib/backend/http';
import { readMetrics } from '@/lib/backend/metrics';

export async function GET(request: Request) {
  return withApiErrors(async () => {
    requireBearer(request, getServerEnv().ADMIN_API_SECRET);
    return NextResponse.json(await readMetrics());
  });
}
