import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = "force-static";

export function generateStaticParams() {
  return [];
}

// PUT /api/listings/[id] — Update a listing (status change)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check listing exists
    const existing = await db.listing.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build update data
    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const validStatuses = ['draft', 'posted', 'removed'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      data.status = body.status;

      // Auto-set postedAt when marking as posted
      if (body.status === 'posted' && !existing.postedAt) {
        data.postedAt = new Date();
      }

      // Clear postedAt when un-posting
      if (body.status === 'draft') {
        data.postedAt = null;
      }
    }

    if (body.adTitle !== undefined) data.adTitle = String(body.adTitle);
    if (body.adBody !== undefined) data.adBody = String(body.adBody);
    if (body.price !== undefined) data.price = Number(body.price) || 0;

    const listing = await db.listing.update({
      where: { id },
      data,
    });

    return NextResponse.json(listing, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
