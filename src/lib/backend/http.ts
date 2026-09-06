import { NextResponse } from 'next/server';
import { z } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'request_error') { super(message); }
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try { body = await request.json(); } catch { throw new ApiError(400, 'Request body must be valid JSON.', 'invalid_json'); }
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiError(400, result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '), 'validation_error');
  return result.data;
}

export function withApiErrors(handler: () => Promise<Response>) {
  return handler().catch(error => {
    if (error instanceof ApiError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    console.error('Unhandled API error', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'internal_error', message: 'The request could not be completed.' }, { status: 500 });
  });
}

export function requireBearer(request: Request, expected: string) {
  const supplied = request.headers.get('authorization');
  if (supplied !== `Bearer ${expected}`) throw new ApiError(401, 'Unauthorized.', 'unauthorized');
}
