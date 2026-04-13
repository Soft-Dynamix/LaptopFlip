import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateToken } from '@/lib/facebook-api';

/**
 * GET /api/facebook/status
 *
 * Returns the current Facebook connection info (name, profile pic,
 * connected pages count). Returns null if not connected.
 * Also checks token validity and updates the database accordingly.
 */
export async function GET() {
  try {
    // Get the most recent connection
    const connection = await db.facebookConnection.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null,
      });
    }

    // Check if token is expired
    const isExpired =
      connection.tokenExpiresAt && new Date() > connection.tokenExpiresAt;

    // Optionally validate the token with Facebook
    let isValid = !isExpired;
    if (!isExpired && connection.accessToken) {
      try {
        const valid = await validateToken(connection.accessToken);
        isValid = valid;
      } catch {
        isValid = false;
      }

      // Update token validity in database if changed
      if (connection.isTokenValid !== isValid) {
        await db.facebookConnection.update({
          where: { id: connection.id },
          data: { isTokenValid: isValid },
        });
      }
    }

    if (!isValid) {
      return NextResponse.json({
        connected: false,
        connection: {
          id: connection.id,
          facebookName: connection.facebookName,
          profilePicUrl: connection.profilePicUrl,
          reason: isExpired ? 'token_expired' : 'token_invalid',
        },
      });
    }

    // Count connected pages (posts with targetType 'page')
    const pageCount = await db.facebookPost.groupBy({
      by: ['targetId'],
      where: {
        connectionId: connection.id,
        targetType: 'page',
      },
    });

    const groupCount = await db.facebookPost.groupBy({
      by: ['targetId'],
      where: {
        connectionId: connection.id,
        targetType: 'group',
      },
    });

    const totalPosts = await db.facebookPost.count({
      where: { connectionId: connection.id, status: 'posted' },
    });

    return NextResponse.json({
      connected: true,
      connection: {
        id: connection.id,
        facebookUserId: connection.facebookUserId,
        facebookName: connection.facebookName,
        facebookEmail: connection.facebookEmail,
        profilePicUrl: connection.profilePicUrl,
        tokenExpiresAt: connection.tokenExpiresAt,
        connectedAt: connection.createdAt,
        isTokenValid: true,
        stats: {
          uniquePages: pageCount.length,
          uniqueGroups: groupCount.length,
          totalPosts,
        },
      },
    });
  } catch (error) {
    console.error('Facebook status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook connection status' },
      { status: 500 }
    );
  }
}
