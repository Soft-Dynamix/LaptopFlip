import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserPages, validateToken } from '@/lib/facebook-api';

export const dynamic = "force-static";

/**
 * GET /api/facebook/pages
 *
 * Gets the user's Facebook Pages using the stored access token.
 * Returns list of pages with their access tokens and info.
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
      // Mark as invalid
      await db.facebookConnection.update({
        where: { id: connection.id },
        data: { isTokenValid: false },
      });

      return NextResponse.json(
        { error: 'Facebook token is invalid or expired. Please reconnect.' },
        { status: 401 }
      );
    }

    const pages = await getUserPages(connection.accessToken);

    return NextResponse.json({
      success: true,
      pages: pages.map((page) => ({
        id: page.id,
        name: page.name,
        category: page.category,
        picture: page.picture?.data?.url ?? null,
        // Note: access_token is included so the client can use it for posting
        access_token: page.access_token,
      })),
    });
  } catch (error) {
    console.error('Facebook pages fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook pages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/facebook/pages
 *
 * Saves the selected page preference. The client sends the page info
 * they want to use for posting. This is informational — the actual
 * posting uses the page access token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, pageName, pageAccessToken } = body;

    if (!pageId || !pageAccessToken) {
      return NextResponse.json(
        { error: 'pageId and pageAccessToken are required' },
        { status: 400 }
      );
    }

    // Validate the page token
    const isValid = await validateToken(pageAccessToken);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Page access token is invalid or expired' },
        { status: 401 }
      );
    }

    // Return the page info for the client to store
    return NextResponse.json({
      success: true,
      page: {
        id: pageId,
        name: pageName ?? 'Unknown Page',
        access_token: pageAccessToken,
        tokenValid: true,
      },
    });
  } catch (error) {
    console.error('Facebook page select error:', error);
    return NextResponse.json(
      { error: 'Failed to validate page' },
      { status: 500 }
    );
  }
}
