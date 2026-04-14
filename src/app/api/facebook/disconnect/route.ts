import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { disconnectFacebook } from '@/lib/facebook-api';

export const dynamic = "force-static";

/**
 * POST /api/facebook/disconnect
 *
 * Deletes the FacebookConnection from the database.
 * Body can optionally contain { connectionId } to delete a specific connection.
 * If no ID provided, deletes all connections.
 */
export async function POST(request: Request) {
  try {
    // Try to parse body for specific connection ID
    let body: { connectionId?: string } | null = null;
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    if (body?.connectionId) {
      // Delete specific connection
      await disconnectFacebook(body.connectionId);
      return NextResponse.json({
        success: true,
        message: 'Facebook connection removed',
      });
    }

    // Delete all connections (disconnect everything)
    const deleteResult = await db.facebookConnection.deleteMany({});
    return NextResponse.json({
      success: true,
      message: `Removed ${deleteResult.count} Facebook connection(s)`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error('Facebook disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Facebook account' },
      { status: 500 }
    );
  }
}
