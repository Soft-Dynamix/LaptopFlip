import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import type { CreateChatCompletionBody } from 'z-ai-web-dev-sdk';

// ─── Platform-specific formatting instructions ───────────
// These ONLY cover layout/format/tone — NOT spec guessing or inference.

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  whatsapp: `WhatsApp Broadcast / Status ad rules:
- STRICT 500-character limit for the entire message (title + body combined)
- Use WhatsApp formatting: *bold* for emphasis, _italic_ for subtitles
- TITLE must include the Stock ID if available: "#LF-XXXX Brand Model - R X,XXX"
- Open with an attention-grabbing hook using the laptop's name and biggest selling point from the provided data
- Only include specs that are ACTUALLY provided in the laptop details — DO NOT guess or add any specs
- Do NOT add any separate reference number in the body — the Stock ID goes in the title only
- Include a clear price line: *Price: R X,XXX*
- Include the location and WhatsApp number if provided
- Close with ONE urgent CTA: "DM now — won't last long!" or similar
- Use 2-3 emojis maximum, placed strategically at line starts
- NO long paragraphs — every line must earn its space
- Tone: energetic but honest, like a friend who found a great deal`,

  facebook: `Facebook Marketplace ad rules — follow this EXACT format:

TITLE must include the Stock ID if available: "#LF-XXXX Brand Model - Condition - R X,XXX"
(Example: #LF-0042 Dell Latitude E5570 - Excellent - R8,500)
- Use the Stock ID as the title number. If Stock ID is N/A, omit the # number entirely.

HEADER FORMAT:
#[Stock ID] 💻🔥 Brand Model – Catchy Tagline! 🔥💻
(Example: #LF-0042 💻🔥 Dell Latitude E5570 – Fast & Reliable! 🔥💻)
- The tagline should be catchy — use the CONDITION and PRICE to create urgency/value (e.g., "Like New!", "Priced to Sell!", "Amazing Deal!")


⚡ Specs That Impress:
- Header must be exactly: "⚡ Specs That Impress:"
- List ONLY the specs that are provided in the laptop details — each on its own line
- DO NOT add, guess, or infer any specs that are not explicitly listed
- If a spec is "Not specified", DO NOT include it

🧰 Features / Ports:
- Header must be exactly: "🧰 Features / Ports:"
- ONLY use the Features/Ports that the user has explicitly listed — do NOT make up or infer any ports
- If no features are provided by the user, skip this section entirely — DO NOT guess ports
- List each feature/port on its own line

📍 Location: [use the location from laptop data, or omit if not provided]
💵 Price: R[X,XXX] (formatted with comma separator)
📲 WhatsApp: [use the WhatsApp number from laptop data, or omit if not provided]

🚨 CTA LINE:
🚨 Grab it before it's gone! [Create an appropriate call-to-action based on condition and target audience]

STYLE RULES:
- Heavy emoji use is GOOD — this style is emoji-rich by design
- Keep it organised with clear section breaks
- Do NOT use bullet points (•) — list items directly on their own lines
- Each section separated by a blank line
- Be honest about condition but enthusiastic about the deal
- Use South African context (Rands, SA spelling)`,

  gumtree: `Gumtree South Africa classified ad rules:
- Write a TRADITIONAL classified ad with clear, professional structure
- TITLE must include the Stock ID if available: "Brand Model - Ref: LF-XXXX - Condition - R X,XXX" (e.g., "Dell XPS 15 - Ref: LF-0042 - Excellent - R12,500")
- OPENING: "FOR SALE:" followed by laptop name and a ONE-SENTENCE summary

- SPECIFICATIONS: List ONLY the specs that are provided. Use a clean numbered or bulleted list.
  - If a spec says "Not specified", DO NOT include it in the listing
  - DO NOT guess, infer, or add any specifications that are not explicitly given
- CONDITION section: Use the condition and battery health as provided. Mention repairs if listed. Be HONEST.
- FEATURES: ONLY list features/ports that the user has explicitly provided. DO NOT guess or infer ports.
- SELLER NOTES: If notes are provided, include them verbatim or paraphrased naturally
- PRICE: State clearly on its own line. Mention if negotiable or firm.
- CTA: Professional closing — "Contact to arrange a viewing", include WhatsApp number if provided
- Tone: Direct, honest, no-nonsense but polite
- Avoid excessive emojis — keep it professional (max 3-4 total)
- NEVER: overstate condition, hide defects, use all caps for the entire ad, include unrelated keywords`,

  olx: `OLX South Africa listing rules:
- TITLE must ALWAYS include the price and Stock ID if available: "Brand Model - Ref: LF-XXXX — R X,XXX" (e.g., "Dell XPS 15 - Ref: LF-0042 — R12,500")

- Write a WELL-STRUCTURED listing with clear headings:
  📌 Quick Summary (2-3 lines that make the buyer WANT to read more)
  🖥️ Specifications (list ONLY the specs that are provided — DO NOT guess or add any)
  🔋 Battery & Condition (use the provided condition and battery health data)
  💰 Price & Value (include the price clearly)
  📦 What's Included (only list accessories/features the user has mentioned)
- ONLY include specifications that are explicitly provided in the laptop data
- If a spec is "Not specified", DO NOT include it — DO NOT guess what it might be
- ONLY list Features/Ports that the user has explicitly listed — DO NOT infer or guess
- Include DELIVERY info if mentioned in notes
- END with an OLX-specific CTA
- Tone: Professional marketplace seller — confident, informative, responsive
- Keep paragraphs SHORT (2-3 sentences max) for mobile readability
- NEVER: use ALL CAPS, spam keywords, include unrelated item descriptions`,
};

// ─── Simple context builder — NO spec guessing ──────────

function buildContext(laptop: {
  condition: string;
  askingPrice: number;
  purchasePrice: number;
  notes: string;
  repairs?: string;
}): string {
  const tips: string[] = [];

  // Condition framing only — based on the actual condition value, not specs
  if (laptop.condition === 'Mint') {
    tips.push('Condition is Mint — frame as essentially indistinguishable from new, a significant saving vs retail.');
  } else if (laptop.condition === 'Excellent') {
    tips.push('Condition is Excellent — frame as barely broken in, incredible deal vs buying new.');
  } else if (laptop.condition === 'Good') {
    tips.push('Condition is Good — frame as well-maintained, reliable, every feature works perfectly.');
  } else if (laptop.condition === 'Fair') {
    tips.push('Condition is Fair — be honest about wear, redirect to value: everything works as it should.');
  } else if (laptop.condition === 'Poor') {
    tips.push('Condition is Poor — be fully transparent, frame as ideal for parts, repairs, or budget buyers.');
  }

  // Pricing context — only based on actual price data, not spec interpretation
  if (laptop.purchasePrice && laptop.askingPrice && laptop.purchasePrice > 0) {
    const margin = laptop.askingPrice - laptop.purchasePrice;
    if (margin > 0) {
      tips.push(`Asking price includes a resale margin — frame the price as fair.`);
    } else {
      tips.push(`Asking price is BELOW the seller's purchase price — frame as "Priced to sell quickly, my loss is your gain".`);
    }
  }

  // Repairs transparency
  if (laptop.repairs) {
    tips.push('Repairs have been done — be TRANSPARENT about them in the ad. This builds trust.');
  }

  // Notes intelligence — only if seller actually mentioned these things
  if (laptop.notes) {
    const notes = laptop.notes.toLowerCase();
    if (notes.includes('fresh') || notes.includes('clean install') || notes.includes('factory reset')) {
      tips.push('Fresh OS install mentioned — include as a trust signal.');
    }
    if (notes.includes('warranty')) {
      tips.push('Warranty mentioned — highlight this, it adds significant value.');
    }
    if (notes.includes('receipt') || notes.includes('proof of purchase')) {
      tips.push('Receipt/proof of purchase available — include as trust signal.');
    }
  }

  return tips.join(' ');
}

// ─── Prompt builder ────────────────────────────────────

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
  purchasePrice: number;
  notes: string;
  color?: string;
  year?: number;
  repairs?: string;
  location?: string;
  whatsappNumber?: string;
  defaultLocation?: string;
  stockId?: string;
}): string {
  const platformGuide = PLATFORM_INSTRUCTIONS[platform] || PLATFORM_INSTRUCTIONS.facebook;
  const context = buildContext(laptop);
  const stockLine = laptop.stockId
    ? `Stock ID: ${laptop.stockId} — include this in the ad TITLE for ALL platforms: WhatsApp as #${laptop.stockId} at the start of the title, Facebook as #${laptop.stockId} at the start of the title, Gumtree as "Ref: ${laptop.stockId}" in the title, OLX as "Ref: ${laptop.stockId}" in the title`
    : 'Stock ID: N/A — do not include any reference number in the ad title';

  return `Generate a ${platform.toUpperCase()} marketplace ad for this laptop being sold in South Africa.

━━━ LAPTOP DETAILS (USE ONLY THESE — DO NOT GUESS OR ADD ANYTHING) ━━━
${stockLine}
Brand: ${laptop.brand}
Model: ${laptop.model}
CPU: ${laptop.cpu || 'Not specified'}
RAM: ${laptop.ram || 'Not specified'}
Storage: ${laptop.storage || 'Not specified'}
GPU: ${laptop.gpu || 'Not specified'}
Screen Size: ${laptop.screenSize ? laptop.screenSize + '"' : 'Not specified'}
Condition: ${laptop.condition}
Battery Health: ${laptop.batteryHealth}
Asking Price: R${laptop.askingPrice.toLocaleString()}${laptop.purchasePrice ? `\nPurchase Price: R${laptop.purchasePrice.toLocaleString()} (for pricing context only)` : ''}${laptop.color ? `\nColour: ${laptop.color}` : ''}${laptop.year ? `\nYear: ${laptop.year}` : ''}${laptop.repairs ? `\nRepairs: ${laptop.repairs}` : ''}
Location: ${laptop.location || 'Not specified'}
WhatsApp Number: ${laptop.whatsappNumber || 'Not provided'}
Default Location: ${laptop.defaultLocation || 'Not specified'}${(laptop as Record<string, unknown>).features ? `\nFeatures / Ports (user-specified): ${(laptop as Record<string, unknown>).features}` : ''}
${laptop.notes ? `\nSeller Notes: ${laptop.notes}` : ''}

━━━ WRITING CONTEXT ━━━
${context}

━━━ CRITICAL RULES ━━━
1. ONLY use the laptop data provided above. DO NOT guess, infer, or add ANY specifications, ports, or features that are not explicitly listed.
2. If a spec says "Not specified", DO NOT include it in the ad and DO NOT guess what it might be.
3. DO NOT add generic selling angles like "great for gaming" or "perfect for students" UNLESS the specs clearly support it (e.g., RTX GPU exists in the data → gaming is fair to mention).
4. Your job is to make the ad TEXT persuasive and well-written — use strong copywriting, emotional appeal, urgency, and professional formatting.
5. DO NOT make up ports or features. If the user hasn't listed any Features/Ports, either skip that section or say "Contact for full specifications".

━━━ PLATFORM RULES ━━━
${platformGuide}

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON: { "title": "...", "body": "..." }
- title: The ad headline/title (optimised for the platform's search/visibility)
- body: The full ad description text (following ALL platform rules above)
Do NOT include explanations, markdown code fences, or any text outside the JSON.`;
}

// ─── Fallback ad builder (uses ONLY provided data) ──────

function buildFallbackAd(
  platform: string,
  laptop: { brand: string; model: string; cpu: string; ram: string; storage: string; gpu: string; screenSize: string; condition: string; batteryHealth: string; askingPrice: number; purchasePrice: number; notes: string; color?: string; year?: number; repairs?: string; location?: string; whatsappNumber?: string; defaultLocation?: string; features?: string; stockId?: string }
): { platform: string; title: string; body: string; price: number } {
  const priceStr = `R${laptop.askingPrice.toLocaleString()}`;

  // Only include specs that are actually provided (not empty)
  const specs = [
    laptop.cpu && laptop.cpu.trim() && `CPU: ${laptop.cpu}`,
    laptop.ram && laptop.ram.trim() && `RAM: ${laptop.ram}`,
    laptop.storage && laptop.storage.trim() && `Storage: ${laptop.storage}`,
    laptop.gpu && laptop.gpu.trim() && `GPU: ${laptop.gpu}`,
    laptop.screenSize && laptop.screenSize.trim() && `Screen: ${laptop.screenSize}"`,
  ].filter(Boolean);

  const extraInfo = [
    laptop.year && `Year: ${laptop.year}`,
    laptop.color && `Colour: ${laptop.color}`,
    laptop.repairs && `Repairs: ${laptop.repairs}`,
  ].filter(Boolean).join(" | ");

  // User-specified features only — NO inference
  const userFeatures = laptop.features && laptop.features.trim()
    ? laptop.features.split(/[,.\n]+/).map(f => f.trim()).filter(Boolean)
    : [];

  const savingsNote = (laptop.purchasePrice && laptop.purchasePrice > laptop.askingPrice)
    ? `Priced BELOW cost - urgent sale!`
    : '';

  if (platform === "whatsapp") {
    const topSpecs = specs.slice(0, 3).map(s => s.split(": ")[1]).join(" | ");
    const stockRef = laptop.stockId ? `#${laptop.stockId} ` : "";
    const title = `${stockRef}${laptop.brand} ${laptop.model} - ${priceStr}`;
    const body = [
      `*${laptop.brand} ${laptop.model}*`,
      `_${laptop.condition} condition | Battery: ${laptop.batteryHealth}_`,
      "",
      topSpecs || "Contact for specifications",
      `*Price: ${priceStr}*`,
      savingsNote || "",
      (laptop.location || laptop.defaultLocation) ? `📍 ${laptop.location || laptop.defaultLocation}` : null,
      (laptop.whatsappNumber) ? `📲 ${laptop.whatsappNumber}` : null,
      "",
      "DM now - won't last long! 📲",
    ].filter(Boolean).join("\n");
    return { platform, title, body: body.substring(0, 500), price: laptop.askingPrice };
  }

  if (platform === "facebook") {
    const adHeader = laptop.stockId ? `#${laptop.stockId}` : "";
    const stockRef = laptop.stockId ? `#${laptop.stockId} ` : "";
    const title = `${stockRef}${laptop.brand} ${laptop.model} - ${laptop.condition} - ${priceStr}`;

    // Simple tagline based on condition and price only
    let tagline = "Great Deal!";
    if (laptop.condition === "Mint") tagline = "Like New Condition!";
    else if (laptop.condition === "Excellent") tagline = "Barely Used - Amazing Deal!";
    else if (laptop.purchasePrice && laptop.purchasePrice > laptop.askingPrice) tagline = "Priced to Sell!";
    else if (laptop.condition === "Good") tagline = "Well Maintained!";

    const location = laptop.location || laptop.defaultLocation || "";
    const whatsapp = laptop.whatsappNumber || "";

    const body = [
      `${adHeader} 💻🔥 ${laptop.brand} ${laptop.model} – ${tagline} 🔥💻`,
      "",
      "⚡ Specs That Impress:",
      ...specs,
      "",
      ...(userFeatures.length > 0 ? ["🧰 Features / Ports:", ...userFeatures, ""] : []),
      location ? `📍 Location: ${location}` : null,
      `💵 Price: ${priceStr}`,
      whatsapp ? `📲 WhatsApp: ${whatsapp}` : null,
      "",
      `🚨 Grab it before it's gone!`,
    ].filter(Boolean).join("\n");
    return { platform, title, body, price: laptop.askingPrice };
  }

  if (platform === "gumtree") {
    const stockRef = laptop.stockId ? ` - Ref: ${laptop.stockId}` : "";
    const title = `${laptop.brand} ${laptop.model}${stockRef} - ${laptop.condition} - ${priceStr}`;
    const body = [
      `FOR SALE: ${laptop.brand} ${laptop.model}`,
      "",
      `Condition: ${laptop.condition}`,
      `Battery Health: ${laptop.batteryHealth}`,
      extraInfo,
      "",
      "Specifications:",
      ...specs.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      ...(userFeatures.length > 0 ? [`Features / Ports:`, ...userFeatures.map(f => `  • ${f}`), ""] : []),
      laptop.notes ? `Seller Notes: ${laptop.notes}` : null,
      "",
      `Asking Price: ${priceStr}`,
      savingsNote || "",
      (laptop.location || laptop.defaultLocation) ? `📍 Location: ${laptop.location || laptop.defaultLocation}` : null,
      (laptop.whatsappNumber) ? `📲 WhatsApp: ${laptop.whatsappNumber}` : null,
      "",
      "Contact to arrange a viewing. Serious buyers only please.",
    ].filter(Boolean).join("\n");
    return { platform, title, body, price: laptop.askingPrice };
  }

  // OLX fallback
  const stockRef = laptop.stockId ? ` - Ref: ${laptop.stockId}` : "";
  const title = `${laptop.brand} ${laptop.model}${stockRef} - ${priceStr}`;
  const body = [
    `📌 ${laptop.brand} ${laptop.model} - ${laptop.condition} Condition`,
    "",
    `💰 Price: ${priceStr}`,
    savingsNote || "",
    "",
    "🖥️ Specifications:",
    ...specs.map(s => `  • ${s}`),
    "",
    `🔋 Battery: ${laptop.batteryHealth}`,
    extraInfo,
    "",
    ...(userFeatures.length > 0 ? [`🧰 Features / Ports:`, ...userFeatures.map(f => `  • ${f}`), ""] : []),
    laptop.notes ? `📝 Notes: ${laptop.notes}` : null,
    (laptop.location || laptop.defaultLocation) ? `📍 Location: ${laptop.location || laptop.defaultLocation}` : null,
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

// ─── System prompt — focused on ad copy quality, NOT spec guessing ────

const SYSTEM_PROMPT = `You are a senior marketplace ad copywriter specialising in second-hand electronics in South Africa. Your SOLE job is to write persuasive, well-formatted ad text using ONLY the laptop data provided to you.

YOUR #1 RULE: USE ONLY PROVIDED DATA
- ONLY include specifications that are explicitly listed in the laptop details.
- If a spec says "Not specified", DO NOT include it and DO NOT guess what it might be.
- DO NOT guess, infer, or add ANY ports, features, or specifications that are not listed.
- DO NOT add generic selling angles like "great for gaming" UNLESS a gaming-capable GPU is explicitly listed.
- DO NOT add "16GB RAM = multitasking powerhouse" type comments UNLESS the RAM is actually 16GB.
- If no Features/Ports are provided by the user, skip that section or write "Contact for full specifications".

YOUR COPYWRITING PRINCIPLES:

1. HONESTY FIRST
   - Never exaggerate condition. If "Good", say "good" — do not upgrade it.
   - Mention any repairs, defects, or wear UPFRONT.
   - Transparency builds trust and prevents returns.

2. THE HOOK (First 2 seconds)
   - The first line must stop the scroll. ONE sentence to grab attention.
   - Use: a question, a bold value claim, or a lifestyle benefit.
   - AVOID weak hooks: "Selling my laptop", "Good laptop for sale".

3. USE PROVIDED SPECS ACCURATELY
   - Include EVERY spec that is provided — buyers compare specs.
   - List them cleanly, formatted for the platform.
   - Do NOT add commentary on specs that aren't there.

4. EMOTIONAL BENEFITS
   - Help the buyer IMAGINE owning this laptop.
   - Base benefits on ACTUAL specs provided (e.g., if battery health is "Excellent", mention long battery life).

5. TRUST ARCHITECTURE
   - Weave 2-3 trust signals naturally into the copy.
   - Use data from notes: "clean install", "original charger", "receipt available", etc.
   - For repairs: "Professionally repaired" — never hide them.

6. URGENCY & SCARCITY
   - Subtly suggest limited availability WITHOUT sounding desperate.
   - Frame as opportunity, not desperation.

7. VALUE ANCHORING
   - Frame the price as a SMART DEAL.
   - Use the condition to justify value.

8. MOBILE-FIRST FORMATTING
   - 80%+ of SA marketplace browsing is on phones.
   - Short paragraphs, generous line breaks, clean spec lists.

9. SOUTH AFRICAN CONTEXT
   - Use Rands (R). SA English spelling: colour, programme, centre.
   - SA norms: "DM me", "WhatsApp preferred", "Can courier".

10. WHAT TO AVOID
    - NEVER: use clickbait, ALL CAPS body, excessive emojis, false urgency, unrelated keywords.
    - NEVER: guess specs, infer ports, add features not listed, or write "Not specified" in the ad.
    - NEVER: include personal phone numbers or addresses not in the provided data.

11. OUTPUT FORMAT
    - ALWAYS respond with valid JSON only: { "title": "...", "body": "..." }
    - Do NOT include explanations, markdown code fences, or any text outside the JSON.`;

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
            content: SYSTEM_PROMPT,
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
          // Fallback: create ad using provided data only
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
