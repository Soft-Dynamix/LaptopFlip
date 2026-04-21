import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getUserInfo,
  exchangeShortTokenForLong,
} from '@/lib/facebook-api';

/**
 * POST /api/facebook/connect
 *
 * Receives a Facebook access token from the client (after OAuth or manual entry),
 * validates it, tries to exchange it for a long-lived token, and stores the
 * connection in the database.
 *
 * If the Facebook App Secret is not configured (no App ID/Secret in .env),
 * the token is saved as-is (short-lived, ~1-2 hours) with a warning.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Facebook access token is required' },
        { status: 400 }
      );
    }

    // Step 1: Verify the token by fetching user info
    let userInfo;
    try {
      userInfo = await getUserInfo(accessToken);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Facebook token verification failed:', msg);
      // Check if it's a known error
      if (msg.includes('OAuthException') || msg.includes('Error validating')) {
        return NextResponse.json(
          { error: 'Invalid or expired Facebook access token. Generate a fresh one from Facebook Graph Explorer and try again.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Token verification failed: ${msg}` },
        { status: 401 }
      );
    }

    // Step 2: Try to exchange short-lived token for long-lived token (60 days)
    let savedToken = accessToken;
    let tokenExpiresAt: Date | null = null;
    let isLongLived = false;

    try {
      const tokenResult = await exchangeShortTokenForLong(accessToken);
      savedToken = tokenResult.access_token;
      const expiresIn = tokenResult.expires_in; // seconds
      tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      isLongLived = true;
    } catch {
      // Token exchange failed (likely because App Secret is not configured).
      // Save the token as-is — it will be short-lived (~1-2 hours).
      console.warn(
        'Token exchange failed (App Secret not configured?). ' +
        'Saving short-lived token. Configure FACEBOOK_APP_SECRET for 60-day tokens.'
      );
      // Set expiry to ~2 hours from now for short-lived tokens
      tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }

    // Step 3: Upsert the connection in the database
    const existingConnection = await db.facebookConnection.findFirst({
      where: { facebookUserId: userInfo.id },
    });

    let connection;
    if (existingConnection) {
      connection = await db.facebookConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: savedToken,
          tokenExpiresAt,
          facebookUserId: userInfo.id,
          facebookName: userInfo.name ?? '',
          facebookEmail: userInfo.email ?? '',
          profilePicUrl: userInfo.picture?.data?.url ?? '',
          isTokenValid: true,
        },
      });
    } else {
      connection = await db.facebookConnection.create({
        data: {
          accessToken: savedToken,
          tokenExpiresAt,
          facebookUserId: userInfo.id,
          facebookName: userInfo.name ?? '',
          facebookEmail: userInfo.email ?? '',
          profilePicUrl: userInfo.picture?.data?.url ?? '',
          isTokenValid: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      isLongLived,
      connection: {
        id: connection.id,
        facebookUserId: connection.facebookUserId,
        facebookName: connection.facebookName,
        facebookEmail: connection.facebookEmail,
        profilePicUrl: connection.profilePicUrl,
        tokenExpiresAt: connection.tokenExpiresAt,
        createdAt: connection.createdAt,
      },
    });
  } catch (error) {
    console.error('Facebook connect error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Facebook account. Please check the server logs.' },
      { status: 500 }
    );
  }
}
