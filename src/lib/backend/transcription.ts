import { z } from 'zod';
import { createServiceDb } from '@/lib/backend/db/server';

const payloadSchema = z.object({ evidenceId: z.string().uuid(), transcript: z.string().trim().max(20_000).optional() });

export async function transcribeEvidence(payload: Record<string, unknown>) {
  const input = payloadSchema.parse(payload);
  const db = createServiceDb();
  const { data: evidence, error } = await db.from('evidence').select('id, employee_id').eq('id', input.evidenceId).single();
  if (error) throw error;
  const generatedText = input.transcript || '[Automatic transcription unavailable. Review the original recording and enter an accurate caption.]';
  const { data: caption, error: captionError } = await db.from('captions').upsert({ evidence_id: evidence.id, generated_text: generatedText, moderation_status: 'pending' }, { onConflict: 'evidence_id' }).select('*').single();
  if (captionError) throw captionError;
  const { error: queueError } = await db.from('moderation_queue').upsert({ employee_id: evidence.employee_id, kind: 'caption', resource_id: caption.id, status: 'pending', reason: input.transcript ? 'Machine-generated caption requires human review.' : 'Manual transcription required.' }, { onConflict: 'kind,resource_id' });
  if (queueError) throw queueError;
}
