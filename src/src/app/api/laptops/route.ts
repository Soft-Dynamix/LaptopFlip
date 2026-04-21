import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/laptops — Return all laptops ordered by createdAt desc
export async function GET() {
  try {
    const laptops = await db.laptop.findMany({
      orderBy: { createdAt: 'desc' },
      include: { listings: true },
    });

    // Parse photos from JSON string to array for each laptop
    const parsed = laptops.map((laptop) => ({
      ...laptop,
      photos: JSON.parse(laptop.photos),
    }));

    return NextResponse.json(parsed, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching laptops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch laptops' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST /api/laptops — Create a new laptop
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.brand || typeof body.brand !== 'string' || body.brand.trim() === '' || body.brand === '__custom__') {
      return NextResponse.json(
        { error: 'Brand is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!body.model || typeof body.model !== 'string' || body.model.trim() === '') {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stringify photos array if provided
    const photos = Array.isArray(body.photos) ? JSON.stringify(body.photos) : '[]';

    // Generate stock ID: LF-XXXX format (sequential)
    const laptopCount = await db.laptop.count();
    const nextNum = laptopCount + 1;
    const stockId = `LF-${String(nextNum).padStart(4, '0')}`;

    const laptop = await db.laptop.create({
      data: {
        brand: body.brand.trim(),
        model: body.model.trim(),
        cpu: body.cpu ?? '',
        ram: body.ram ?? '',
        storage: body.storage ?? '',
        gpu: body.gpu ?? '',
        screenSize: body.screenSize ?? '',
        condition: body.condition ?? 'Good',
        batteryHealth: body.batteryHealth ?? 'Good',
        purchasePrice: Number(body.purchasePrice) || 0,
        askingPrice: Number(body.askingPrice) || 0,
        notes: body.notes ?? '',
        photos,
        status: body.status ?? 'draft',
        color: body.color ?? '',
        year: Number(body.year) || 0,
        serialNumber: body.serialNumber ?? '',
        repairs: body.repairs ?? '',
        features: body.features ?? '',
        stockId,
        location: body.location || null,
      },
      include: { listings: true },
    });

    // Parse photos back to array for response
    const parsed = {
      ...laptop,
      photos: JSON.parse(laptop.photos),
    };

    return NextResponse.json(parsed, {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating laptop:', error);
    return NextResponse.json(
      { error: 'Failed to create laptop' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
