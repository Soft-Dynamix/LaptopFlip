import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserGroups, validateToken } from '@/lib/facebook-api';

/**
 * GET /api/facebook/groups?token=xxx
 *
 * Gets the user's Facebook Groups using the stored access token.
 * Accepts optional `token` query param from client (localStorage fallback).
 * Returns only groups where the user is an administrator (can post).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientToken = searchParams.get('token');

    // Get DB connection
    const connection = await db.facebookConnection.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // Use DB token or client token
    const token = connection?.accessToken || (clientToken?.length > 20 ? clientToken : null);

    if (!token) {
      return NextResponse.json(
        { error: 'No Facebook connection found. Please connect your Facebook account first.' },
        { status: 401 }
      );
    }

    // If no DB connection but we have a client token, create a DB entry
    if (!connection && clientToken) {
      try {
        const isValid = await validateToken(clientToken);
        if (isValid) {
          await db.facebookConnection.create({
            data: {
              accessToken: clientToken,
              facebookUserId: 'local',
              facebookName: 'Facebook User',
              facebookEmail: '',
              profilePicUrl: '',
              tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
              isTokenValid: true,
            },
          });
        }
      } catch { /* DB create failed, still try to fetch groups */ }
    }

    const groups = await getUserGroups(token);

    return NextResponse.json({
      success: true,
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        privacy: group.privacy,
        memberCount: group.member_count,
      })),
    });
  } catch (error) {
    console.error('Facebook groups fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook groups' },
      { status: 500 }
    );
  }
}
