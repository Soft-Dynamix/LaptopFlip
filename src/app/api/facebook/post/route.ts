import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { postToPage, postToGroup, postToMarketplace } from '@/lib/facebook-api';

export const dynamic = "force-static";

/**
 * POST /api/facebook/post
 *
 * Posts content to a Facebook Page, Group, or Marketplace.
 * Creates a FacebookPost record in the database and optionally
 * updates the Listing status to 'posted'.
 *
 * Body:
 *   targetType: 'page' | 'group' | 'marketplace'
 *   targetId: string (page ID, group ID, etc.)
 *   targetName?: string
 *   message: string
 *   link?: string
 *   imageUrls?: string[]
 *   accessToken?: string (page access token for pages, or user token for groups)
 *   laptopId?: string
 *   listingId?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.targetType || !['page', 'group', 'marketplace'].includes(body.targetType)) {
      return NextResponse.json(
        { error: 'targetType must be "page", "group", or "marketplace"' },
        { status: 400 }
      );
    }

    if (!body.targetId || typeof body.targetId !== 'string') {
      return NextResponse.json(
        { error: 'targetId is required' },
        { status: 400 }
      );
    }

    if (!body.message || typeof body.message !== 'string' || body.message.trim() === '') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    // Get current connection
    const connection = await db.facebookConnection.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'No Facebook connection. Please connect your Facebook account first.' },
        { status: 401 }
      );
    }

    // Use provided accessToken (e.g. page token) or fall back to stored user token
    const accessToken = typeof body.accessToken === 'string' && body.accessToken
      ? body.accessToken
      : connection.accessToken;

    // Get laptop info if laptopId provided (for ad title)
    let adTitle = body.adTitle ?? '';
    if (!adTitle && body.laptopId) {
      const laptop = await db.laptop.findUnique({
        where: { id: body.laptopId },
      });
      if (laptop) {
        adTitle = `${laptop.brand} ${laptop.model}`;
      }
    }

    // Create a pending FacebookPost record first
    const facebookPost = await db.facebookPost.create({
      data: {
        connectionId: connection.id,
        listingId: body.listingId ?? null,
        laptopId: body.laptopId ?? null,
        targetType: body.targetType,
        targetId: body.targetId,
        targetName: body.targetName ?? '',
        adTitle,
        status: 'pending',
      },
    });

    // Attempt to post to Facebook
    let postResult: { id: string };

    try {
      switch (body.targetType) {
        case 'page':
          postResult = await postToPage(accessToken, body.targetId, {
            message: body.message,
            link: body.link,
            imageUrls: body.imageUrls,
          });
          break;

        case 'group':
          postResult = await postToGroup(accessToken, body.targetId, {
            message: body.message,
            link: body.link,
          });
          break;

        case 'marketplace':
          postResult = await postToMarketplace(accessToken, {
            title: body.marketplaceTitle ?? adTitle ?? 'Laptop for Sale',
            description: body.message,
            price: body.price ?? 0,
            currency: body.currency ?? 'ZAR',
            condition: body.condition ?? 'Good',
            availability: 'FOR_SALE',
            images: body.imageUrls ?? [],
            listing_type: 'PRODUCT',
          });
          break;

        default:
          throw new Error(`Unknown target type: ${body.targetType}`);
      }
    } catch (postError) {
      const errorMessage =
        postError instanceof Error ? postError.message : 'Unknown posting error';

      // Update the FacebookPost record with failure
      await db.facebookPost.update({
        where: { id: facebookPost.id },
        data: {
          status: 'failed',
          errorMessage,
        },
      });

      return NextResponse.json(
        {
          error: `Failed to post to ${body.targetType}: ${errorMessage}`,
          postId: facebookPost.id,
          status: 'failed',
        },
        { status: 500 }
      );
    }

    // Update the FacebookPost record with success
    const updatedPost = await db.facebookPost.update({
      where: { id: facebookPost.id },
      data: {
        status: 'posted',
        facebookPostId: postResult.id,
        postedAt: new Date(),
      },
    });

    // Update listing status if listingId provided
    if (body.listingId) {
      try {
        await db.listing.update({
          where: { id: body.listingId },
          data: {
            status: 'posted',
            postedAt: new Date(),
            facebookPostId: postResult.id,
          },
        });
      } catch (listingError) {
        console.error('Failed to update listing status:', listingError);
        // Non-critical — the post was successful
      }
    }

    return NextResponse.json({
      success: true,
      facebookPostId: postResult.id,
      postId: updatedPost.id,
      targetType: body.targetType,
      status: 'posted',
      postedAt: updatedPost.postedAt,
    });
  } catch (error) {
    console.error('Facebook post error:', error);
    return NextResponse.json(
      { error: 'Failed to create Facebook post' },
      { status: 500 }
    );
  }
}
