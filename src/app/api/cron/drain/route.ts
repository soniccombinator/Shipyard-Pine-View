import { NextResponse } from 'next/server';
import { drainJobs } from '@/lib/backend/jobs';
import { sendEmail, sendSms } from '@/lib/backend/comms';
import { transcribeEvidence } from '@/lib/backend/transcription';
import { getServerEnv } from '@/lib/backend/env';
import { requireBearer, withApiErrors } from '@/lib/backend/http';
import { recordUsage } from '@/lib/backend/metrics';

export const runtime = 'nodejs';
export const maxDuration = 55;

export async function POST(request: Request) {
  return withApiErrors(async () => {
    requireBearer(request, getServerEnv().CRON_SECRET);
    const result = await drainJobs({
      send_sms: sendSms,
      send_email: sendEmail,
      transcribe_evidence: transcribeEvidence,
      recompute_matches: async payload => { await recordUsage('matches_recompute_requested', null, { trigger: payload.trigger ?? 'job' }); },
    });
    return NextResponse.json(result);
  });
}
