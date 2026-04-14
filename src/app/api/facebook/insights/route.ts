import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPostInsights, type PostInsights } from '@/lib/facebook-api';

export const dynamic = "force-static";

/**
 * GET /api/facebook/insights
 *
 * Gets insights for all Facebook posts in the database.
 * Optionally refreshes insights from Facebook API.
 *
 * Query params:
 *   refresh: 'true' — re-fetch insights from Facebook API
 *   connectionId: string — only fetch insights for a specific connection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldRefresh = searchParams.get('refresh') === 'true';
    const connectionId = searchParams.get('connectionId');

    // Build the where clause
    const where: Record<string, unknown> = {
      status: 'posted',
      facebookPostId: { not: '' },
    };

    if (connectionId) {
      where.connectionId = connectionId;
    }

    // Get all posted Facebook posts
    const posts = await db.facebookPost.findMany({
      where,
      orderBy: { postedAt: 'desc' },
      include: {
        connection: {
          select: {
            id: true,
            facebookName: true,
            accessToken: true,
          },
        },
      },
    });

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        aggregated: {
          totalPosts: 0,
          totalImpressions: 0,
          totalReach: 0,
          totalClicks: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          avgEngagement: 0,
        },
      });
    }

    // Fetch insights from Facebook API if refresh requested
    if (shouldRefresh) {
      // Get a page access token for insights (try the connection's token first)
      for (const post of posts) {
        if (post.facebookPostId && post.connection?.accessToken) {
          try {
            const insights: PostInsights = await getPostInsights(
              post.connection.accessToken,
              post.facebookPostId
            );

            // Update the post with fresh insights
            await db.facebookPost.update({
              where: { id: post.id },
              data: {
                impressions: insights.impressions,
                reach: insights.reach,
                clicks: insights.clicks,
                likes: insights.likes,
                comments: insights.comments,
                shares: insights.shares,
                lastInsightsAt: new Date(),
              },
            });
          } catch (error) {
            console.error(
              `Failed to fetch insights for post ${post.facebookPostId}:`,
              error
            );
          }
        }
      }
    }

    // Re-fetch posts with potentially updated insights
    const updatedPosts = shouldRefresh
      ? await db.facebookPost.findMany({
          where,
          orderBy: { postedAt: 'desc' },
          include: {
            connection: {
              select: {
                id: true,
                facebookName: true,
              },
            },
          },
        })
      : posts;

    // Calculate aggregated stats
    const aggregated = {
      totalPosts: updatedPosts.length,
      totalImpressions: 0,
      totalReach: 0,
      totalClicks: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      avgEngagement: 0,
    };

    for (const post of updatedPosts) {
      aggregated.totalImpressions += post.impressions;
      aggregated.totalReach += post.reach;
      aggregated.totalClicks += post.clicks;
      aggregated.totalLikes += post.likes;
      aggregated.totalComments += post.comments;
      aggregated.totalShares += post.shares;
    }

    // Calculate average engagement rate (likes + comments + shares) / reach
    if (aggregated.totalReach > 0) {
      aggregated.avgEngagement =
        ((aggregated.totalLikes + aggregated.totalComments + aggregated.totalShares) /
          aggregated.totalReach) *
        100;
    }

    // Format posts for response (exclude access token)
    const formattedPosts = updatedPosts.map((post) => ({
      id: post.id,
      facebookPostId: post.facebookPostId,
      targetType: post.targetType,
      targetId: post.targetId,
      targetName: post.targetName,
      adTitle: post.adTitle,
      status: post.status,
      postedAt: post.postedAt,
      lastInsightsAt: post.lastInsightsAt,
      laptopId: post.laptopId,
      listingId: post.listingId,
      insights: {
        impressions: post.impressions,
        reach: post.reach,
        clicks: post.clicks,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        engagement:
          post.reach > 0
            ? ((post.likes + post.comments + post.shares) / post.reach) * 100
            : 0,
      },
    }));

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      aggregated: {
        ...aggregated,
        avgEngagement: Math.round(aggregated.avgEngagement * 100) / 100,
      },
      refreshed: shouldRefresh,
    });
  } catch (error) {
    console.error('Facebook insights error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook insights' },
      { status: 500 }
    );
  }
}
