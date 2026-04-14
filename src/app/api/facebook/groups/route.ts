import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserGroups, validateToken } from '@/lib/facebook-api';

export const dynamic = "force-static";

/**
 * GET /api/facebook/groups
 *
 * Gets the user's Facebook Groups using the stored access token.
 * Returns only groups where the user is an administrator (can post).
 */
export async function GET() {
  try {
    const connection = await db.facebookConnection.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'No Facebook connection found. Please connect your Facebook account first.' },
        { status: 401 }
      );
    }

    // Check token validity
    const isValid = await validateToken(connection.accessToken);
    if (!isValid) {
      await db.facebookConnection.update({
        where: { id: connection.id },
        data: { isTokenValid: false },
      });

      return NextResponse.json(
        { error: 'Facebook token is invalid or expired. Please reconnect.' },
        { status: 401 }
      );
    }

    const groups = await getUserGroups(connection.accessToken);

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
