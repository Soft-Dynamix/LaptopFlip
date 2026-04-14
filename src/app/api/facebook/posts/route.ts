import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = "force-static";

/**
 * GET /api/facebook/posts
 *
 * Lists all Facebook posts from the database with their stats.
 * Supports filtering by status and targetType.
 * Returns paginated results.
 *
 * Query params:
 *   status: 'pending' | 'posted' | 'failed' | 'deleted'
 *   targetType: 'page' | 'group' | 'marketplace'
 *   page: number (default 1)
 *   limit: number (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.get('status');
    const targetType = searchParams.get('targetType');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20)
    );
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && ['pending', 'posted', 'failed', 'deleted'].includes(status)) {
      where.status = status;
    }

    if (targetType && ['page', 'group', 'marketplace'].includes(targetType)) {
      where.targetType = targetType;
    }

    // Fetch posts and total count in parallel
    const [posts, total] = await Promise.all([
      db.facebookPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          connection: {
            select: {
              id: true,
              facebookName: true,
            },
          },
          listing: {
            select: {
              id: true,
              platform: true,
              adTitle: true,
            },
          },
        },
      }),
      db.facebookPost.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format posts
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      targetType: post.targetType,
      targetId: post.targetId,
      targetName: post.targetName,
      facebookPostId: post.facebookPostId,
      adTitle: post.adTitle,
      status: post.status,
      errorMessage: post.errorMessage || undefined,
      postedAt: post.postedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      lastInsightsAt: post.lastInsightsAt,
      laptopId: post.laptopId,
      listingId: post.listingId,
      connection: post.connection
        ? {
            id: post.connection.id,
            name: post.connection.facebookName,
          }
        : null,
      listing: post.listing ?? null,
      stats: {
        impressions: post.impressions,
        reach: post.reach,
        clicks: post.clicks,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        engagement:
          post.reach > 0
            ? Math.round(
                ((post.likes + post.comments + post.shares) / post.reach) * 10000
              ) / 100
            : 0,
      },
    }));

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Facebook posts list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook posts' },
      { status: 500 }
    );
  }
}
