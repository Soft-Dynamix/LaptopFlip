import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/laptops/[id] — Return a single laptop by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const laptop = await db.laptop.findUnique({
      where: { id },
      include: { listings: true },
    });

    if (!laptop) {
      return NextResponse.json(
        { error: 'Laptop not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse photos from JSON string to array
    const parsed = {
      ...laptop,
      photos: JSON.parse(laptop.photos),
    };

    return NextResponse.json(parsed, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching laptop:', error);
    return NextResponse.json(
      { error: 'Failed to fetch laptop' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT /api/laptops/[id] — Update a laptop by ID (partial updates)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check laptop exists
    const existing = await db.laptop.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Laptop not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build update data from provided fields only
    const data: Record<string, unknown> = {};

    if (body.brand !== undefined) data.brand = String(body.brand).trim();
    if (body.model !== undefined) data.model = String(body.model).trim();
    if (body.cpu !== undefined) data.cpu = String(body.cpu);
    if (body.ram !== undefined) data.ram = String(body.ram);
    if (body.storage !== undefined) data.storage = String(body.storage);
    if (body.gpu !== undefined) data.gpu = String(body.gpu);
    if (body.screenSize !== undefined) data.screenSize = String(body.screenSize);
    if (body.condition !== undefined) data.condition = String(body.condition);
    if (body.batteryHealth !== undefined) data.batteryHealth = String(body.batteryHealth);
    if (body.purchasePrice !== undefined) data.purchasePrice = Number(body.purchasePrice) || 0;
    if (body.askingPrice !== undefined) data.askingPrice = Number(body.askingPrice) || 0;
    if (body.notes !== undefined) data.notes = String(body.notes);
    if (body.photos !== undefined) {
      data.photos = Array.isArray(body.photos) ? JSON.stringify(body.photos) : String(body.photos);
    }
    if (body.status !== undefined) data.status = String(body.status);
    if (body.color !== undefined) data.color = String(body.color);
    if (body.year !== undefined) data.year = Number(body.year) || 0;
    if (body.serialNumber !== undefined) data.serialNumber = String(body.serialNumber);
    if (body.repairs !== undefined) data.repairs = String(body.repairs);

    const laptop = await db.laptop.update({
      where: { id },
      data,
      include: { listings: true },
    });

    // Parse photos back to array for response
    const parsed = {
      ...laptop,
      photos: JSON.parse(laptop.photos),
    };

    return NextResponse.json(parsed, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating laptop:', error);
    return NextResponse.json(
      { error: 'Failed to update laptop' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE /api/laptops/[id] — Delete a laptop by ID (cascade deletes listings)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check laptop exists
    const existing = await db.laptop.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Laptop not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete cascade will handle listings automatically via the schema relation
    await db.laptop.delete({ where: { id } });

    return NextResponse.json(
      { message: 'Laptop deleted successfully', id },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting laptop:', error);
    return NextResponse.json(
      { error: 'Failed to delete laptop' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
