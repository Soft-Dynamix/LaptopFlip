import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-static";

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/upload-photo — Upload a photo as base64 data URL
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No photo file provided. Use form field "photo".' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type "${file.type}". Allowed types: JPEG, PNG, WebP.` },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File too large (${sizeMB}MB). Maximum size is 5MB.` },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Build data URL
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json(
      { url: dataUrl },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
