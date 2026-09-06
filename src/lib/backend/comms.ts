import nodemailer from 'nodemailer';
import { z } from 'zod';
import { createServiceDb } from '@/lib/backend/db/server';
import { getServerEnv } from '@/lib/backend/env';
import { enqueueJob } from '@/lib/backend/jobs';

const smsPayload = z.object({ communicationId: z.string().uuid(), recipient: z.string().min(7).max(30), body: z.string().min(1).max(1200) });
const emailPayload = z.object({ communicationId: z.string().uuid(), recipient: z.string().email(), subject: z.string().min(1).max(160), body: z.string().min(1).max(20_000) });

export async function queueCommunication(input: { channel: 'sms' | 'email'; recipient: string; template: string; payload: Record<string, unknown>; dedupeKey: string }) {
  const db = createServiceDb();
  const { data, error } = await db.from('communications').upsert({ channel: input.channel, recipient: input.recipient, template: input.template, payload: input.payload, dedupe_key: input.dedupeKey }, { onConflict: 'dedupe_key', ignoreDuplicates: true }).select('id').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  await enqueueJob(input.channel === 'sms' ? 'send_sms' : 'send_email', { communicationId: data.id, recipient: input.recipient, ...input.payload }, `communication:${data.id}`);
  return data.id;
}

export async function sendSms(raw: Record<string, unknown>) {
  const payload = smsPayload.parse(raw);
  const env = getServerEnv();
  if (!env.GHL_LOCATION_ID || !env.GHL_PRIVATE_INTEGRATION_KEY) throw new Error('GHL messaging is not configured.');
  const response = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
    method: 'POST', headers: { Authorization: `Bearer ${env.GHL_PRIVATE_INTEGRATION_KEY}`, Version: '2021-04-15', 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'SMS', locationId: env.GHL_LOCATION_ID, contactId: payload.recipient, message: payload.body }),
  });
  if (!response.ok) throw new Error(`GHL send failed with status ${response.status}.`);
  await createServiceDb().from('communications').update({ status: 'sent' }).eq('id', payload.communicationId);
}

export async function sendEmail(raw: Record<string, unknown>) {
  const payload = emailPayload.parse(raw);
  const env = getServerEnv();
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) throw new Error('Gmail messaging is not configured.');
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } });
  await transport.sendMail({ from: `ConnectAble <${env.GMAIL_USER}>`, to: payload.recipient, subject: payload.subject, text: payload.body });
  await createServiceDb().from('communications').update({ status: 'sent' }).eq('id', payload.communicationId);
}
