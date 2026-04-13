import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getUserInfo,
  exchangeShortTokenForLong,
} from '@/lib/facebook-api';

/**
 * POST /api/facebook/connect
 *
 * Receives a short-lived Facebook access token from the client
 * (after OAuth or manual entry), validates it, exchanges it for a
 * long-lived token, and stores the connection in the database.
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
      console.error('Facebook token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired Facebook access token. Please try again.' },
        { status: 401 }
      );
    }

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    let tokenResult;
    try {
      tokenResult = await exchangeShortTokenForLong(accessToken);
    } catch (error) {
      console.error('Token exchange failed:', error);
      return NextResponse.json(
        { error: 'Failed to exchange token. Check Facebook App ID and Secret.' },
        { status: 500 }
      );
    }

    const longToken = tokenResult.access_token;
    const expiresIn = tokenResult.expires_in; // seconds
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Step 3: Upsert the connection in the database
    // Find any existing connection for this Facebook user
    const existingConnection = await db.facebookConnection.findFirst({
      where: { facebookUserId: userInfo.id },
    });

    let connection;
    if (existingConnection) {
      // Update existing connection
      connection = await db.facebookConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: longToken,
          tokenExpiresAt,
          facebookUserId: userInfo.id,
          facebookName: userInfo.name ?? '',
          facebookEmail: userInfo.email ?? '',
          profilePicUrl: userInfo.picture?.data?.url ?? '',
          isTokenValid: true,
        },
      });
    } else {
      // Create new connection
      connection = await db.facebookConnection.create({
        data: {
          accessToken: longToken,
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
      { error: 'Failed to connect Facebook account' },
      { status: 500 }
    );
  }
}
