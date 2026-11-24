import { NextRequest, NextResponse } from 'next/server';
import { syncCatalog } from '@/lib/square/sync';
import { requireTier } from '@/lib/auth/team';

export async function POST(req: NextRequest) {
  try {
    const team = await requireTier(req, 'owner');
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncCatalog();

    return NextResponse.json({
      success: result.success,
      synced: result.synced,
      errors: result.errors,
      timestamp: result.timestamp,
    });
  } catch (e: any) {
    console.error('[admin/sync-catalog]', e);
    return NextResponse.json({ error: 'Catalog sync failed' }, { status: 500 });
  }
}
