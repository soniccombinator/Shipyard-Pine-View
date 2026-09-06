import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ service: 'connectable', status: 'ok', phases: [0, 2] });
}
