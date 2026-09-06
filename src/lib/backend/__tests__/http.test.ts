import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError, readJson, requireBearer } from '@/lib/backend/http';

describe('HTTP boundaries', () => {
  it('validates JSON before route logic runs', async () => {
    const request = new Request('https://example.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: '' }) });
    await expect(readJson(request, z.object({ value: z.string().min(1) }))).rejects.toMatchObject({ status: 400, code: 'validation_error' } satisfies Partial<ApiError>);
  });

  it('requires an exact bearer token', () => {
    expect(() => requireBearer(new Request('https://example.test'), 'expected')).toThrowError(ApiError);
    expect(() => requireBearer(new Request('https://example.test', { headers: { authorization: 'Bearer expected' } }), 'expected')).not.toThrow();
  });
});
