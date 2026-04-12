import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import type { CreateChatCompletionBody } from 'z-ai-web-dev-sdk';

// ─── Detailed platform-specific instructions ─────────────

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  whatsapp: `WhatsApp Broadcast / Status ad rules:
- STRICT 500-character limit for the entire message (title + body combined)
- Use WhatsApp formatting: *bold* for emphasis, _italic_ for subtitles
- Open with an attention-grabbing hook line (question, bold claim, or emoji)
- Only list the TOP 3-4 specs as bullet points (no fluff)
- Include a clear price line: *Price: R X,XXX*
- Close with ONE urgent CTA: "DM now — won't last long!" or "First come, first served."
- Use 2-3 emojis maximum, placed strategically (not randomly)
- NO long paragraphs — every line must earn its space
- Tone: energetic but honest, like a friend recommending something`,

  facebook: `Facebook Marketplace ad rules:
- Write a FULL, RICH marketplace listing (300-600 words)
- TITLE: Must be descriptive and searchable — include brand, model, key spec, and price
- OPENING HOOK: Start with the most compelling selling point (condition, price, performance)
- STRUCTURE with clear sections using emoji headers:
  📋 Full Specifications (detailed bullet list)
  ✅ Condition & Battery Health
  💡 Why You'll Love This Laptop (2-3 persuasive benefits tied to the specs)
  🎯 Perfect For (suggest use cases: students, professionals, gaming, etc.)
- Mention ANY upgrades, accessories, or extras included
- Add TRUST SIGNALS: "Well looked after", "Smoke-free home", "Receipt available"
- Include COMPETITIVE CONTEXT subtly if price is good: "Priced to sell fast"
- CLOSE with: urgency + clear CTA + delivery/collection info
- Tone: friendly, trustworthy, enthusiastic — like a proud owner selling something they cared for
- Use line breaks generously for readability on mobile`,

  gumtree: `Gumtree South Africa classified ad rules:
- Write a TRADITIONAL classified ad with clear, professional structure
- TITLE: Brand + Model + Condition + Price (e.g., "Dell XPS 15 - Excellent - R12,500")
- OPENING: "FOR SALE:" followed by laptop name and a one-line summary of its best feature
- SPECIFICATIONS: Use a clean numbered or bulleted list — every spec on its own line
- CONDITION section: Be thorough and HONEST — mention any wear, scratches, or issues
- INCLUDE: What's in the box, any accessories, original charger, bag, etc.
- SELLER NOTES: If notes are provided, weave them naturally into the description
- PRICE: State clearly. Mention if negotiable or not.
- CTA: Professional closing — "Contact to arrange a viewing", "Call or WhatsApp"
- Tone: Direct, honest, no-nonsense but polite — Gumtree buyers appreciate transparency
- Avoid excessive emojis — keep it professional`,

  olx: `OLX South Africa listing rules:
- TITLE must ALWAYS include the price in this exact format: "Brand Model — R X,XXX"
- Example: "HP ProBook 450 G9 — R8,500" or "MacBook Air M2 — R18,999"
- Write a WELL-STRUCTURED listing with clear headings:
  📌 Quick Summary (2-3 lines)
  🖥️ Full Specifications (all specs listed)
  🔋 Battery & Condition
  💰 Price & Value (justify the price if possible)
- Highlight KEY SELLING POINTS that differentiate this laptop from others
- MENTION if the laptop is: freshly serviced, updated, has warranty, comes with accessories
- Include DELIVERY info: "Can courier nationwide" or "Collection in [area]"
- END with: "Message me on OLX for fastest response" or similar OLX-specific CTA
- Tone: Professional marketplace seller — confident and informative
- Keep paragraphs SHORT (2-3 sentences max) for mobile readability`,
};

// ─── Context-aware value proposition builder ─────────────

function buildValueContext(laptop: {
  condition: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  askingPrice: number;
 notes: string;
}): string {
  const tips: string[] = [];

  // Condition-based angle
  if (laptop.condition === 'Mint' || laptop.condition === 'Excellent') {
    tips.push('This laptop is in outstanding condition — emphasize it looks and performs like new, making it a smarter buy than paying full retail price.');
  } else if (laptop.condition === 'Good') {
    tips.push('Condition is good with normal signs of use — frame it as "well-maintained" and "great value for money" compared to retail pricing.');
  } else if (laptop.condition === 'Fair') {
    tips.push('Be honest about wear but highlight what still works perfectly. Price is likely competitive — emphasize affordability and functionality.');
  } else if (laptop.condition === 'Poor') {
    tips.push('Be fully transparent about condition. Frame it as ideal for parts, repairs, or budget buyers. Emphasize any working components.');
  }

  // Spec-based use case suggestions
  const specs = `${laptop.cpu} ${laptop.ram} ${laptop.gpu}`.toLowerCase();
  if (specs.includes('i7') || specs.includes('i9') || specs.includes('ryzen 7') || specs.includes('ryzen 9')) {
    tips.push('High-performance CPU — great for professionals, developers, content creators, or power users.');
  }
  if (specs.includes('i3') || specs.includes('celeron') || specs.includes('pentium')) {
    tips.push('Budget-friendly specs — perfect for students, office work, web browsing, and everyday tasks.');
  }
  if (specs.includes('rtx') || specs.includes('gtx') || specs.includes('radeon rx')) {
    tips.push('Dedicated GPU present — highlight gaming, video editing, or 3D rendering capability.');
  }
  if (specs.includes('16gb') || specs.includes('32gb') || specs.includes('64gb')) {
    tips.push('Generous RAM — emphasize multitasking ability, smooth performance with many apps open.');
  }
  if (specs.includes('1tb') || specs.includes('2tb')) {
    tips.push('Large storage — mention plenty of room for files, apps, games, and media.');
  }
  if (laptop.ram?.toLowerCase().includes('4gb') && !specs.includes('16gb')) {
    tips.push('4GB RAM is basic — frame it as suitable for light use: browsing, documents, streaming.');
  }

  return tips.join(' ');
}

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
  color?: string;
  year?: number;
  repairs?: string;
}): string {
  const platformGuide = PLATFORM_INSTRUCTIONS[platform] || PLATFORM_INSTRUCTIONS.facebook;
  const valueContext = buildValueContext(laptop);

  return `Generate a ${platform.toUpperCase()} marketplace ad for this laptop being sold in South Africa:

━━━ LAPTOP DETAILS ━━━
Brand: ${laptop.brand}
Model: ${laptop.model}
CPU: ${laptop.cpu || 'Not specified'}
RAM: ${laptop.ram || 'Not specified'}
Storage: ${laptop.storage || 'Not specified'}
GPU: ${laptop.gpu || 'Not specified'}
Screen Size: ${laptop.screenSize ? laptop.screenSize + '"' : 'Not specified'}
Condition: ${laptop.condition}
Battery Health: ${laptop.batteryHealth}
Asking Price: R${laptop.askingPrice.toLocaleString()}${laptop.color ? `\nColour: ${laptop.color}` : ''}${laptop.year ? `\nYear: ${laptop.year}` : ''}${laptop.repairs ? `\nRepairs: ${laptop.repairs}` : ''}
${laptop.notes ? `\nSeller Notes: ${laptop.notes}` : ''}

━━━ SELLING CONTEXT & ANGLES ━━━
${valueContext}

━━━ PLATFORM RULES ━━━
${platformGuide}

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON: { "title": "...", "body": "..." }
- title: The ad headline/title
- body: The full ad description text
Do NOT include explanations, markdown code fences, or any text outside the JSON.`;
}

// ─── Improved fallback ad builder ─────────────────────────

function buildFallbackAd(
  platform: string,
  laptop: { brand: string; model: string; cpu: string; ram: string; storage: string; gpu: string; screenSize: string; condition: string; batteryHealth: string; askingPrice: number; notes: string; color?: string; year?: number; repairs?: string }
): { platform: string; title: string; body: string; price: number } {
  const priceStr = `R${laptop.askingPrice.toLocaleString()}`;
  const specsLine = [
    laptop.cpu && `CPU: ${laptop.cpu}`,
    laptop.ram && `RAM: ${laptop.ram}`,
    laptop.storage && `Storage: ${laptop.storage}`,
    laptop.gpu && `GPU: ${laptop.gpu}`,
    laptop.screenSize && `Screen: ${laptop.screenSize}"`,
  ].filter(Boolean).join(" | ");

  const conditionLine = `Condition: ${laptop.condition} | Battery: ${laptop.batteryHealth}`;
  const extraLines = [
    laptop.year && `Year: ${laptop.year}`,
    laptop.color && `Colour: ${laptop.color}`,
    laptop.repairs && `Repairs: ${laptop.repairs}`,
  ].filter(Boolean).join(" | ");

  if (platform === "whatsapp") {
    const title = `${laptop.brand} ${laptop.model} — ${priceStr}`;
    const body = [
      `💻 *${laptop.brand} ${laptop.model}* — _${laptop.condition} condition_`,
      specsLine || "Great specs for the price",
      conditionLine,
      extraLines,
      `*Price: ${priceStr}*`,
      "",
      "DM me now — won't last long! 📲",
    ].filter(Boolean).join("\n");
    return { platform, title, body: body.substring(0, 500), price: laptop.askingPrice };
  }

  if (platform === "facebook") {
    const title = `${laptop.brand} ${laptop.model} (${laptop.condition}) — ${priceStr}`;
    const body = [
      `Looking for a reliable laptop that won't break the bank? Check this out 👇`,
      "",
      `✨ ${laptop.brand} ${laptop.model} — ${laptop.condition} Condition`,
      "",
      "📋 Specifications:",
      specsLine || "Contact for full specifications",
      "",
      `✅ ${conditionLine}`,
      extraLines ? `📌 ${extraLines}` : null,
      "",
      "💡 Why this laptop?",
      laptop.condition === "Mint" || laptop.condition === "Excellent"
        ? "Looks and performs like new — save thousands vs retail!"
        : "Well-maintained and ready for a new owner. Great value for money.",
      "",
      `💰 *Asking Price: ${priceStr}*`,
      "Priced to sell — first come, first served!",
      "",
      "📲 DM me if interested or comment below.",
      "📦 Can arrange delivery or collection.",
    ].filter(Boolean).join("\n");
    return { platform, title, body, price: laptop.askingPrice };
  }

  if (platform === "gumtree") {
    const title = `${laptop.brand} ${laptop.model} — ${laptop.condition} — ${priceStr}`;
    const body = [
      `FOR SALE: ${laptop.brand} ${laptop.model}`,
      "",
      `Condition: ${laptop.condition}`,
      `Battery Health: ${laptop.batteryHealth}`,
      extraLines,
      "",
      "Specifications:",
      specsLine || "Contact for specifications",
      "",
      laptop.notes ? `Seller Notes: ${laptop.notes}` : null,
      "",
      `Asking Price: ${priceStr}`,
      "",
      "Please contact me if you have any questions or would like to view the laptop. Serious buyers only.",
    ].filter(Boolean).join("\n");
    return { platform, title, body, price: laptop.askingPrice };
  }

  // OLX fallback
  const title = `${laptop.brand} ${laptop.model} — ${priceStr}`;
  const body = [
    `${laptop.brand} ${laptop.model} — ${laptop.condition} Condition`,
    "",
    `Price: ${priceStr}`,
    "",
    "Full Specifications:",
    specsLine || "Contact for specifications",
    "",
    conditionLine,
    extraLines,
    laptop.notes ? `\nNotes: ${laptop.notes}` : null,
    "",
    "Message me on OLX for more details or to arrange a viewing.",
  ].filter(Boolean).join("\n");
  return { platform, title, body, price: laptop.askingPrice };
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
            content: `You are a senior marketplace ad copywriter specialising in second-hand electronics in South Africa. You write ads that SELL — they are persuasive, honest, and optimised for each platform's audience.

Your writing principles:
1. HONESTY FIRST: Never exaggerate specs or condition. South African buyers value transparency and will walk away from misleading ads.
2. HOOK THE READER: The first line must stop the scroll. Use a question, bold statement, or the laptop's strongest selling point.
3. SPECIFICATIONS SELL: Detail the specs that matter — buyers compare specs obsessively on SA marketplaces.
4. PAINT A PICTURE: Help the buyer imagine owning this laptop. What can they do with it? Who is it perfect for?
5. BUILD TRUST: Include subtle trust signals — "well maintained", "clean instal", "original charger included".
6. CREATE URGENCY: Subtly suggest limited availability without being pushy — "Priced to sell", "Won't stay listed long".
7. VALUE PROPOSITION: Frame the price as a smart deal — compare implicitly to retail or new pricing.
8. MOBILE-FIRST: Most SA marketplace browsing happens on phones. Keep paragraphs short, use bullet points, lots of white space.
9. SOUTH AFRICAN CONTEXT: Use Rands (R), South African English spelling (colour, programme), and local marketplace norms.
10. ALWAYS respond with valid JSON only: { "title": "...", "body": "..." }`,
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
          // Fallback: create a compelling ad using the improved template
          results.push(buildFallbackAd(platform, laptop));
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
        results.push(buildFallbackAd(platform, laptop));
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
