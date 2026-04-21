import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserPages, validateToken } from '@/lib/facebook-api';

/**
 * GET /api/facebook/pages?token=xxx
 *
 * Gets the user's Facebook Pages using the stored access token.
 * Accepts optional `token` query param from client (localStorage fallback).
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
      } catch { /* DB create failed, still try to fetch pages */ }
    }

    const pages = await getUserPages(token);

    return NextResponse.json({
      success: true,
      pages: pages.map((page) => ({
        id: page.id,
        name: page.name,
        category: page.category,
        picture: page.picture?.data?.url ?? null,
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

    const isValid = await validateToken(pageAccessToken);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Page access token is invalid or expired' },
        { status: 401 }
      );
    }

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
