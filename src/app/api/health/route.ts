import { NextResponse } from 'next/server';

export async function GET() {
  // Basic health check
  // You can expand this later to check DB, external services, etc.
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    },
    { status: 200 }
  );
}
