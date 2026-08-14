import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    project_id: process.env.NEXT_PUBLIC_PROJECT_ID ?? 'unknown',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
}
