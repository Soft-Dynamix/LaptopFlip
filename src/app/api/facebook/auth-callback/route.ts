import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeShortTokenForLong, getUserInfo } from "@/lib/facebook-api";

/**
 * POST /api/facebook/auth-callback
 *
 * Called after a successful NextAuth Facebook sign-in.
 * Exchanges the short-lived OAuth token for a 60-day long-lived token
 * and stores it in the FacebookConnection table.
 *
 * This approach keeps the NextAuth session for user identity
 * while using the long-lived token for Graph API calls.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "No Facebook access token found. Please sign in with Facebook first." },
        { status: 401 }
      );
    }

    const shortToken = session.accessToken;

    // Validate the short token by fetching user info
    const userInfo = await getUserInfo(shortToken);

    // Exchange short-lived token for long-lived token (60 days)
    let longToken: string;
    let expiresIn: number;

    try {
      const exchangeResult = await exchangeShortTokenForLong(shortToken);
      longToken = exchangeResult.access_token;
      expiresIn = exchangeResult.expires_in;
    } catch (exchangeError) {
      // If exchange fails (e.g. app not configured), use the short token as fallback
      console.warn("Token exchange failed, using short-lived token:", exchangeError);
      longToken = shortToken;
      expiresIn = 3600; // ~1 hour for short tokens
    }

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Upsert the Facebook connection in the database
    const connection = await db.facebookConnection.upsert({
      where: { facebookUserId: userInfo.id },
      update: {
        accessToken: longToken,
        tokenExpiresAt: expiresAt,
        facebookName: userInfo.name,
        facebookEmail: userInfo.email ?? "",
        profilePicUrl: userInfo.picture?.data?.url ?? "",
        isTokenValid: true,
      },
      create: {
        facebookUserId: userInfo.id,
        accessToken: longToken,
        tokenExpiresAt: expiresAt,
        facebookName: userInfo.name,
        facebookEmail: userInfo.email ?? "",
        profilePicUrl: userInfo.picture?.data?.url ?? undefined,
        isTokenValid: true,
      },
    });

    return NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        facebookName: connection.facebookName,
        facebookEmail: connection.facebookEmail,
        profilePicUrl: connection.profilePicUrl,
        tokenExpiresAt: connection.tokenExpiresAt,
        isLongLived: expiresIn > 86400,
      },
    });
  } catch (error) {
    console.error("Facebook auth callback error:", error);
    return NextResponse.json(
      { error: "Failed to complete Facebook connection" },
      { status: 500 }
    );
  }
}
