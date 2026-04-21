import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateToken, getUserInfo, getUserPages, getUserGroups } from '@/lib/facebook-api';

/**
 * GET /api/facebook/status?token=xxx
 *
 * Returns the current Facebook connection info.
 * Accepts optional `token` query param from client (localStorage fallback).
 * If no DB connection but token provided, validates it and returns connected.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientToken = searchParams.get('token');

    // Get the most recent DB connection
    const connection = await db.facebookConnection.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // Determine which token to use
    const token = connection?.accessToken || (clientToken?.length > 20 ? clientToken : null);

    if (!token) {
      return NextResponse.json({ connected: false, connection: null });
    }

    // Validate the token with Facebook
    let isValid = false;
    let userInfo: { id: string; name: string; pictureUrl?: string } | null = null;

    try {
      isValid = await validateToken(token);
      if (isValid) {
        userInfo = await getUserInfo(token);
      }
    } catch {
      isValid = false;
    }

    // If we have a client token but no DB connection, create one
    if (isValid && !connection && clientToken) {
      const newConn = await db.facebookConnection.create({
        data: {
          accessToken: clientToken,
          facebookUserId: userInfo?.id || 'local',
          facebookName: userInfo?.name || 'Facebook User',
          facebookEmail: '',
          profilePicUrl: userInfo?.pictureUrl || '',
          tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          isTokenValid: true,
        },
      });

      return NextResponse.json({
        connected: true,
        connection: {
          id: newConn.id,
          facebookUserId: newConn.facebookUserId,
          facebookName: newConn.facebookName,
          facebookEmail: newConn.facebookEmail,
          profilePicUrl: newConn.profilePicUrl,
          tokenExpiresAt: newConn.tokenExpiresAt,
          connectedAt: newConn.createdAt,
          isTokenValid: true,
          stats: { uniquePages: 0, uniqueGroups: 0, totalPosts: 0 },
        },
      });
    }

    if (!isValid) {
      // Mark as invalid in DB if it exists
      if (connection) {
        await db.facebookConnection.update({
          where: { id: connection.id },
          data: { isTokenValid: false },
        });
      }
      return NextResponse.json({
        connected: false,
        connection: connection ? {
          id: connection.id,
          facebookName: connection.facebookName,
          profilePicUrl: connection.profilePicUrl,
          reason: 'token_invalid',
        } : null,
      });
    }

    // Update DB with fresh info if we have user info
    if (connection && userInfo) {
      try {
        await db.facebookConnection.update({
          where: { id: connection.id },
          data: {
            isTokenValid: true,
            ...(userInfo.name && userInfo.name !== 'Facebook User' ? { facebookName: userInfo.name } : {}),
            ...(userInfo.pictureUrl ? { profilePicUrl: userInfo.pictureUrl } : {}),
          },
        });
      } catch { /* ignore update error */ }
    }

    // Count connected pages and groups
    const pageCount = await db.facebookPost.groupBy({
      by: ['targetId'],
      where: { connectionId: connection?.id, targetType: 'page' },
    });

    const groupCount = await db.facebookPost.groupBy({
      by: ['targetId'],
      where: { connectionId: connection?.id, targetType: 'group' },
    });

    const totalPosts = await db.facebookPost.count({
      where: { connectionId: connection?.id, status: 'posted' },
    });

    return NextResponse.json({
      connected: true,
      connection: {
        id: connection?.id,
        facebookUserId: userInfo?.id || connection?.facebookUserId,
        facebookName: userInfo?.name || connection?.facebookName || 'Facebook User',
        facebookEmail: connection?.facebookEmail || '',
        profilePicUrl: userInfo?.pictureUrl || connection?.profilePicUrl || '',
        tokenExpiresAt: connection?.tokenExpiresAt,
        connectedAt: connection?.createdAt,
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
