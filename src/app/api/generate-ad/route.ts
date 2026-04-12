import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import type { CreateChatCompletionBody } from 'z-ai-web-dev-sdk';

// Platform-specific instructions for ad generation
const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  whatsapp: `WhatsApp ad rules:
- Keep the entire message under 500 characters
- Use minimal emoji (1-2 max)
- Start with a catchy one-liner
- Bullet points for key specs only
- End with price and a simple call to action
- Very concise format suitable for messaging`,
  facebook: `Facebook Marketplace ad rules:
- Write a full, detailed marketplace listing
- Include a catchy, descriptive title
- Use bullet points for all specifications
- Add sections: Condition, Specs, Why buy this?
- Include price prominently
- End with a friendly call to action
- Can be longer and more detailed`,
  gumtree: `Gumtree classified ad rules:
- Write a traditional classified ad format
- Clear, no-nonsense title with brand and model
- Structured with clear sections
- Be specific about condition and what's included
- Include price
- Add contact call to action at the end`,
  olx: `OLX structured listing rules:
- Title MUST include the price (e.g., "Brand Model - R5000")
- Well-structured listing with clear headings
- Detailed specs section
- Condition description
- Price clearly stated in both title and body
- Professional marketplace tone`,
};

function buildPrompt(platform: string, laptop: {
  brand: string;
  model: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  screenSize: string;
  condition: string;
  batteryHealth: string;
  askingPrice: number;
  notes: string;
}): string {
  const platformGuide = PLATFORM_INSTRUCTIONS[platform] || PLATFORM_INSTRUCTIONS.facebook;

  return `Generate a ${platform} marketplace ad for this laptop:

Brand: ${laptop.brand}
Model: ${laptop.model}
CPU: ${laptop.cpu || 'Not specified'}
RAM: ${laptop.ram || 'Not specified'}
Storage: ${laptop.storage || 'Not specified'}
GPU: ${laptop.gpu || 'Not specified'}
Screen: ${laptop.screenSize || 'Not specified'}
Condition: ${laptop.condition}
Battery: ${laptop.batteryHealth}
Asking Price: R${laptop.askingPrice}
${laptop.notes ? `Notes: ${laptop.notes}` : ''}

${platformGuide}

Return JSON format ONLY: { "title": "...", "body": "..." }
Do not include any explanation or markdown around the JSON.`;
}

function extractJson(text: string): { title: string; body: string } | null {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // fall through
      }
    }

    // Try finding JSON object in the text
    const objectMatch = text.match(/\{[\s\S]*"title"[\s\S]*"body"[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // fall through
      }
    }
  }

  return null;
}

// POST /api/generate-ad — Generate AI ads for specified platforms
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { laptopId, platforms } = body;

    if (!laptopId) {
      return NextResponse.json(
        { error: 'laptopId is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'At least one platform is required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate platforms
    const validPlatforms = ['whatsapp', 'facebook', 'gumtree', 'olx'];
    const invalidPlatforms = platforms.filter((p: string) => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(', ')}` },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch laptop from database
    const laptop = await db.laptop.findUnique({
      where: { id: laptopId },
    });

    if (!laptop) {
      return NextResponse.json(
        { error: 'Laptop not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create();

    // Generate ads for each platform
    const results: Array<{ platform: string; title: string; body: string; price: number }> = [];

    for (const platform of platforms) {
      const prompt = buildPrompt(platform, laptop);

      const chatBody: CreateChatCompletionBody = {
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert ad copywriter for second-hand electronics in South Africa. Write compelling, honest marketplace ads. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      try {
        const response = await zai.chat.completions.create(chatBody);
        const content = response?.choices?.[0]?.message?.content || '';

        const parsed = extractJson(content);
        if (!parsed) {
          // Fallback: create a basic ad
          results.push({
            platform,
            title: `${laptop.brand} ${laptop.model} - R${laptop.askingPrice}`,
            body: `${laptop.brand} ${laptop.model} in ${laptop.condition} condition.\n\nSpecs:\n- CPU: ${laptop.cpu || 'N/A'}\n- RAM: ${laptop.ram || 'N/A'}\n- Storage: ${laptop.storage || 'N/A'}\n- Battery: ${laptop.batteryHealth}\n\nPrice: R${laptop.askingPrice}\n\nDM me if interested!`,
            price: laptop.askingPrice,
          });
          continue;
        }

        // Enforce WhatsApp character limit
        let bodyText = parsed.body;
        if (platform === 'whatsapp' && bodyText.length > 500) {
          bodyText = bodyText.substring(0, 497) + '...';
        }

        results.push({
          platform,
          title: parsed.title,
          body: bodyText,
          price: laptop.askingPrice,
        });
      } catch (llmError) {
        console.error(`Error generating ad for ${platform}:`, llmError);
        // Fallback ad for this platform
        results.push({
          platform,
          title: `${laptop.brand} ${laptop.model} - R${laptop.askingPrice}`,
          body: `${laptop.brand} ${laptop.model} in ${laptop.condition} condition. ${laptop.cpu ? `CPU: ${laptop.cpu}.` : ''} ${laptop.ram ? `RAM: ${laptop.ram}.` : ''} ${laptop.storage ? `Storage: ${laptop.storage}.` : ''} Price: R${laptop.askingPrice}. DM if interested!`,
          price: laptop.askingPrice,
        });
      }
    }

    // Save each ad as a Listing in the database
    for (const ad of results) {
      await db.listing.create({
        data: {
          laptopId: laptop.id,
          platform: ad.platform,
          adTitle: ad.title,
          adBody: ad.body,
          price: ad.price,
          status: 'draft',
        },
      });
    }

    return NextResponse.json(results, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating ads:', error);
    return NextResponse.json(
      { error: 'Failed to generate ads' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
