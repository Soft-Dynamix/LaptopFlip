import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import type { CreateChatCompletionBody } from 'z-ai-web-dev-sdk';

// ─── Platform-specific formatting instructions ───────────

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  whatsapp: `WhatsApp Broadcast / Status ad rules:
- STRICT 1000-character limit for the entire message (title + body combined)
- Use WhatsApp formatting: *bold* for emphasis, _italic_ for subtitles
- TITLE must include the Stock ID if available: "#LF-XXXX Brand Model - R X,XXX"
- Start with a STRONG hook line that grabs attention (question, bold claim, or lifestyle angle)
- Write a short engaging description paragraph (3-4 lines) about the laptop
- List key specs on separate lines with emoji markers
- Include a "Why buy?" one-liner about the deal value
- Include a clear price line: *Price: R X,XXX*
- Include the location and WhatsApp number if provided
- Close with an urgent CTA: "DM now — won't last long!" or similar
- Use 3-5 emojis strategically at line starts
- Every line must earn its space — no fluff
- Tone: energetic but honest, like a friend who found a great deal
- MINIMUM body length: 400 characters — make it substantial`,

  facebook: `Facebook Marketplace ad rules — write a FULL, RICH listing:

TITLE must include the Stock ID if available: "#LF-XXXX Brand Model - Condition - R X,XXX"

BODY MUST INCLUDE ALL OF THESE SECTIONS (write 2-4 lines per section):

1. HOOK LINE: Open with an attention-grabbing first line (question, bold value claim, or lifestyle benefit). NOT "Selling my laptop" — be creative.

2. INTRODUCTION: Write 3-4 lines describing the laptop, its condition, and why it's a great buy. Help the buyer picture owning it.

3. ⚡ SPECS THAT IMPRESS:
List ONLY provided specs, each with a short benefit note. Format:
⚡ Specs That Impress:
• CPU: Intel Core i7-1270P — Fast and responsive for any task
• RAM: 16GB DDR5 — Multitask without slowing down
(Add a short benefit after each spec — explain what it MEANS for the buyer)

4. 🧰 FEATURES / Ports: (ONLY if user provided features — skip if empty)

5. 💡 WHY THIS LAPTOP?:
Write 3-4 lines about what makes THIS laptop special. Compare condition value vs new retail price. Mention battery health if Excellent. Frame the price as a smart deal.

6. ✅ TRUST SIGNALS:
Write 2-3 trust points based on provided data (fresh OS install, charger included, condition honesty, transparent about repairs, etc.)

7. 📍 Location: [location or omit]
💵 Price: R[X,XXX]
📲 WhatsApp: [number or omit]
🚨 Grab it before it's gone! [urgent CTA]

STYLE RULES:
- Heavy emoji section headers — this style is emoji-rich
- Organised with clear section breaks and blank lines between sections
- Each section should be SUBSTANTIAL (2-4 lines minimum)
- Be honest about condition but very enthusiastic about the deal
- South African context (Rands, SA spelling: colour, programme)
- MINIMUM body length: 800 characters — this must be a full listing, not a brief`,

  gumtree: `Gumtree South Africa classified ad rules — write a FULL professional listing:

TITLE must include Stock ID: "Brand Model - Ref: LF-XXXX - Condition - R X,XXX"

BODY MUST INCLUDE ALL OF THESE SECTIONS:

1. FOR SALE: opener with brand + model + ONE attention-grabbing sentence

2. ABOUT THIS LAPTOP: Write a 4-6 line paragraph describing the laptop in detail. Cover condition honestly, mention battery health, and explain why someone should buy it. Be descriptive and professional.

3. FULL SPECIFICATIONS: List ALL provided specs in a clean numbered format. Add brief explanations after each spec.

4. CONDITION & BATTERY: Write 2-3 honest lines about the physical condition and battery. If Mint/Excellent, explain what that means for the buyer. If repairs done, be transparent.

5. FEATURES & CONNECTIVITY: (ONLY user-provided features — skip if empty)

6. WHY BUY FROM ME?: Write 2-3 lines building trust. Mention any notes about charger, fresh install, warranty, receipt.

7. SELLER NOTES: Include provided notes naturally.

8. PRICE & CONTACT: Clear price, location, WhatsApp number.
CTA: "Contact to arrange a viewing — first come, first served."

STYLE: Professional but warm. Max 5-6 emojis total. Clean sections with blank lines.
MINIMUM body length: 800 characters — this must be a comprehensive classified ad`,

  olx: `OLX South Africa listing rules — write a FULL marketplace listing:

TITLE must include price and Stock ID: "Brand Model - Ref: LF-XXXX — R X,XXX"

BODY MUST INCLUDE ALL OF THESE SECTIONS:

1. 📌 QUICK SUMMARY: Write 3-4 punchy lines that make the buyer WANT to read more. Lead with the biggest selling point.

2. 🖥️ FULL SPECIFICATIONS: List ALL provided specs. Each spec on its own line with a brief note about what it means.

3. 🔋 BATTERY & CONDITION: 3-4 lines about condition and battery health. Be honest and descriptive.

4. 💡 WHY THIS IS A GREAT DEAL: Write 3-4 lines justifying the price. Compare to new retail if relevant. Frame as smart buy.

5. 📦 WHAT'S INCLUDED: Only list accessories/features the user mentioned. If nothing listed, say "Laptop and charger included" if notes suggest it, otherwise skip.

6. 📍 DELIVERY & COLLECTION: Mention location. Add delivery info if in notes.

7. PRICE: Clear price line.
CTA: OLX-specific closing — "Message me now for more photos or to arrange a viewing. Quick replies guaranteed!"

MINIMUM body length: 800 characters — full listing, not brief`,
};

// ─── Simple context builder ──────────────────────────────

function buildContext(laptop: {
  condition: string;
  askingPrice: number;
  purchasePrice: number;
  notes: string;
  repairs?: string;
}): string {
  const tips: string[] = [];

  if (laptop.condition === 'Mint') {
    tips.push('Condition is Mint — frame as essentially indistinguishable from new. Emphasise the massive saving vs retail price for the same laptop brand new.');
  } else if (laptop.condition === 'Excellent') {
    tips.push('Condition is Excellent — frame as barely broken in, incredible deal vs buying new. Mention it looks and performs like new.');
  } else if (laptop.condition === 'Good') {
    tips.push('Condition is Good — frame as well-maintained, reliable, every feature works perfectly. Great value for a working laptop.');
  } else if (laptop.condition === 'Fair') {
    tips.push('Condition is Fair — be honest about normal wear signs, redirect to value: everything works as it should, priced accordingly.');
  } else if (laptop.condition === 'Poor') {
    tips.push('Condition is Poor — be fully transparent, frame as ideal for parts, repairs, or budget buyers who need a working machine.');
  }

  if (laptop.purchasePrice && laptop.askingPrice && laptop.purchasePrice > 0) {
    const margin = laptop.askingPrice - laptop.purchasePrice;
    if (margin > 0) {
      tips.push(`Asking price includes a resale margin — frame the price as fair market value.`);
    } else {
      tips.push(`Asking price is BELOW the seller's purchase price — frame as "Priced to sell quickly, my loss is your gain".`);
    }
  }

  if (laptop.repairs) {
    tips.push('Repairs have been done — be TRANSPARENT about them. Frame as "professionally repaired, fully functional, builds trust".');
  }

  if (laptop.notes) {
    const notes = laptop.notes.toLowerCase();
    if (notes.includes('fresh') || notes.includes('clean install') || notes.includes('factory reset')) {
      tips.push('Fresh OS install mentioned — include as trust signal: "Fresh Windows/macOS installed — ready to use from day one".');
    }
    if (notes.includes('warranty')) {
      tips.push('Warranty mentioned — highlight this: "Still under warranty for peace of mind".');
    }
    if (notes.includes('receipt') || notes.includes('proof of purchase')) {
      tips.push('Receipt/proof of purchase available — include as trust signal.');
    }
    if (notes.includes('charger') || notes.includes('adapter')) {
      tips.push('Charger/adapter included — mention as "comes with original charger".');
    }
    if (notes.includes('bag') || notes.includes('case')) {
      tips.push('Laptop bag/case included — mention as bonus item.');
    }
    if (notes.includes('delivery') || notes.includes('courier') || notes.includes('ship')) {
      tips.push('Delivery/courier available — mention delivery options in the ad.');
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
    ? `Stock ID: ${laptop.stockId} — include this in the ad TITLE for ALL platforms`
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
3. Your job is to write a FULL, DETAILED, PERSUASIVE ad — not a brief summary. Include every required section from the platform rules above.
4. Each section should have 2-4 lines minimum. The total ad body must be SUBSTANTIAL.
5. DO NOT make up ports or features. If the user hasn't listed any Features/Ports, either skip that section or say "Contact for full specifications".
6. Write naturally — make it read like a human seller wrote it, not a robot.

━━━ PLATFORM RULES ━━━
${platformGuide}

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON: { "title": "...", "body": "..." }
- title: The ad headline/title
- body: The FULL ad description text — must be LONG and DETAILED, following ALL platform rules above. Minimum 800 characters for Facebook/Gumtree/OLX, 400 characters for WhatsApp.
Do NOT include explanations, markdown code fences, or any text outside the JSON.`;
}

// ─── Fallback ad builder (uses ONLY provided data) ──────

function buildFallbackAd(
  platform: string,
  laptop: { brand: string; model: string; cpu: string; ram: string; storage: string; gpu: string; screenSize: string; condition: string; batteryHealth: string; askingPrice: number; purchasePrice: number; notes: string; color?: string; year?: number; repairs?: string; location?: string; whatsappNumber?: string; defaultLocation?: string; features?: string; stockId?: string }
): { platform: string; title: string; body: string; price: number } {
  const priceStr = `R${laptop.askingPrice.toLocaleString()}`;
  const name = `${laptop.brand} ${laptop.model}`;

  const specs = [
    laptop.cpu && laptop.cpu.trim() && { label: 'Processor', value: laptop.cpu },
    laptop.ram && laptop.ram.trim() && { label: 'Memory', value: laptop.ram },
    laptop.storage && laptop.storage.trim() && { label: 'Storage', value: laptop.storage },
    laptop.gpu && laptop.gpu.trim() && { label: 'Graphics', value: laptop.gpu },
    laptop.screenSize && laptop.screenSize.trim() && { label: 'Display', value: `${laptop.screenSize}" screen` },
  ].filter(Boolean) as { label: string; value: string }[];

  const userFeatures = laptop.features && laptop.features.trim()
    ? laptop.features.split(/[,.\n]+/).map(f => f.trim()).filter(Boolean)
    : [];

  const location = laptop.location || laptop.defaultLocation || '';
  const whatsapp = laptop.whatsappNumber || '';
  const isBelowCost = laptop.purchasePrice && laptop.purchasePrice > laptop.askingPrice;

  // Condition description builder
  function conditionDesc(): string {
    switch (laptop.condition) {
      case 'Mint': return 'This laptop is in Mint condition — virtually indistinguishable from brand new. No scratches, no marks, keyboard feels crisp, screen is flawless. You are essentially getting a new laptop at a fraction of the retail price.';
      case 'Excellent': return 'In Excellent condition — barely broken in. May have the tiniest signs of use but looks and performs like new. Battery still holds excellent charge, all ports work perfectly, screen is bright and clear.';
      case 'Good': return 'In Good condition — well looked after with normal signs of use. Everything works exactly as it should, no functional issues whatsoever. A reliable machine that will serve you well for years.';
      case 'Fair': return 'In Fair condition — shows some cosmetic wear from regular use but is fully functional. All features work correctly. Priced to reflect the cosmetic wear — mechanically sound and reliable.';
      case 'Poor': return 'In Poor condition — shows significant wear but still works. Ideal for budget buyers, students, or anyone needing a functional laptop without spending big. Priced accordingly for a quick sale.';
      default: return `Condition: ${laptop.condition}`;
    }
  }

  // Battery description
  function batteryDesc(): string {
    const bh = laptop.batteryHealth.toLowerCase();
    if (bh.includes('excellent')) return `Battery health is Excellent — expect all-day battery life for normal use. No need to carry a charger everywhere you go.`;
    if (bh.includes('good')) return `Battery health is Good — still holds a solid charge for several hours of use. Perfectly fine for working away from a plug point.`;
    if (bh.includes('fair')) return `Battery health is Fair — holds enough charge for a couple of hours. Fine for desk use with occasional portability.`;
    return `Battery: ${laptop.batteryHealth}`;
  }

  // Trust signals from notes
  function trustSignals(): string[] {
    const signals: string[] = [];
    if (laptop.notes) {
      const n = laptop.notes.toLowerCase();
      if (n.includes('fresh') || n.includes('clean install') || n.includes('factory reset'))
        signals.push('Fresh OS installed — ready to use from day one, no setup hassle');
      if (n.includes('warranty'))
        signals.push('Still under warranty — buy with peace of mind');
      if (n.includes('receipt') || n.includes('proof'))
        signals.push('Proof of purchase/receipt available');
      if (n.includes('charger') || n.includes('adapter'))
        signals.push('Original charger/adapter included');
      if (n.includes('bag') || n.includes('case'))
        signals.push('Laptop bag/case included as a bonus');
      if (n.includes('delivery') || n.includes('courier'))
        signals.push('Can arrange delivery/courier — ask for details');
    }
    if (laptop.condition === 'Mint' || laptop.condition === 'Excellent')
      signals.push(`${laptop.condition} condition — a genuine saving vs buying brand new`);
    return signals;
  }

  const stockRef = laptop.stockId ? `#${laptop.stockId} ` : '';
  const stockRefBody = laptop.stockId ? `#${laptop.stockId}` : '';

  // ─── WHATSAPP ───
  if (platform === "whatsapp") {
    const title = `${stockRef}${name} - ${priceStr}`;
    const signals = trustSignals();
    const hook = laptop.condition === 'Mint'
      ? `Looking for a ${name} that looks brand new but doesn't cost brand new?`
      : isBelowCost
        ? `Priced below cost — this ${name} needs to go!`
        : `Looking for a reliable laptop at a fair price?`;

    const body = [
      `*${hook}*`,
      ``,
      `*${name}*`,
      `_${laptop.condition} condition | Battery: ${laptop.batteryHealth}_`,
      ``,
      specs.map(s => `▸ ${s.value}`).join('\n'),
      ``,
      conditionDesc().split('. ').slice(0, 2).join('. '),
      ``,
      `💰 *Price: ${priceStr}*`,
      isBelowCost ? `🔥 *Priced BELOW cost — urgent sale!*` : '',
      location ? `📍 ${location}` : null,
      whatsapp ? `📲 WhatsApp: ${whatsapp}` : null,
      signals.length > 0 ? `✅ ${signals.slice(0, 2).join(' | ')}` : null,
      ``,
      `*DM me now — this won't last long!* 🚀`,
    ].filter(Boolean).join('\n');
    return { platform, title, body: body.substring(0, 1000), price: laptop.askingPrice };
  }

  // ─── FACEBOOK ───
  if (platform === "facebook") {
    const title = `${stockRef}${name} - ${laptop.condition} - ${priceStr}`;
    const signals = trustSignals();

    // Hook line
    let hook: string;
    if (laptop.condition === 'Mint') hook = `Why pay full retail price when this ${name} looks and feels brand new?`;
    else if (isBelowCost) hook = `This ${name} is priced BELOW what I paid — my loss is your gain!`;
    else if (laptop.condition === 'Excellent') hook = `Barely used and priced to sell — this ${name} won't hang around for long.`;
    else hook = `Looking for a solid, reliable ${name} at a fair price? Here it is.`;

    const body = [
      `${stockRefBody} 💻🔥 ${name} — ${hook} 🔥💻`,
      ``,
      conditionDesc(),
      batteryDesc(),
      laptop.repairs ? `\n🔧 Repairs: ${laptop.repairs} — fully functional, transparent about history.` : '',
      ``,
      `⚡ *Specs That Impress:*`,
      specs.map(s => `  • ${s.label}: ${s.value}`).join('\n'),
      ``,
      userFeatures.length > 0
        ? [`🧰 *Features / Ports:*`, ...userFeatures.map(f => `  • ${f}`), ''].join('\n')
        : '',
      `💡 *Why This Laptop?*`,
      isBelowCost ? `  Priced BELOW cost — this is a genuine bargain. I need it gone, so you win.` : `  ${laptop.condition} condition at ${priceStr} represents excellent value for money. Compare to retail pricing for the same specs and you'll see the savings.`,
      specs.length >= 3 ? `  With specs like ${specs[0].value} and ${specs[1].value}, this machine handles everyday tasks with ease.` : '',
      ``,
      `✅ *Trust Signals:*`,
      ...signals.map(s => `  ✔ ${s}`),
      ``,
      location ? `📍 Location: ${location}` : null,
      `💵 Price: ${priceStr}`,
      whatsapp ? `📲 WhatsApp: ${whatsapp}` : null,
      ``,
      `🚨 *Grab it before it's gone — message me now to arrange a viewing or for more photos!*`,
    ].filter(Boolean).join('\n');
    return { platform, title, body, price: laptop.askingPrice };
  }

  // ─── GUMTREE ───
  if (platform === "gumtree") {
    const stockRefTitle = laptop.stockId ? ` - Ref: ${laptop.stockId}` : '';
    const title = `${name}${stockRefTitle} - ${laptop.condition} - ${priceStr}`;
    const signals = trustSignals();

    const body = [
      `FOR SALE: ${name}`,
      ``,
      conditionDesc(),
      batteryDesc(),
      laptop.repairs ? `\nRepairs: ${laptop.repairs} — I believe in full transparency. The laptop is fully functional.` : '',
      ``,
      `Full Specifications:`,
      specs.map((s, i) => `  ${i + 1}. ${s.label}: ${s.value}`).join('\n'),
      ``,
      userFeatures.length > 0
        ? [`Features / Connectivity:`, ...userFeatures.map(f => `  • ${f}`), ''].join('\n')
        : '',
      `Why Buy From Me?`,
      `  I'm an honest seller — what you see is what you get. ${laptop.condition === 'Mint' ? 'This laptop is in stunning condition.' : 'The condition is accurately described.'} I'm happy to answer any questions and can arrange a viewing at your convenience.`,
      ...signals.map(s => `  ✔ ${s}`),
      ``,
      laptop.notes ? `Seller Notes: ${laptop.notes}` : '',
      ``,
      `Asking Price: ${priceStr}${isBelowCost ? ' — PRICED BELOW COST, urgent sale!' : ''}`,
      location ? `Location: ${location}` : null,
      whatsapp ? `WhatsApp: ${whatsapp}` : null,
      ``,
      `Contact to arrange a viewing. First come, first served. Serious buyers only please.`,
    ].filter(Boolean).join('\n');
    return { platform, title, body, price: laptop.askingPrice };
  }

  // ─── OLX ───
  const stockRefTitle = laptop.stockId ? ` - Ref: ${laptop.stockId}` : '';
  const title = `${name}${stockRefTitle} — ${priceStr}`;
  const signals = trustSignals();

  // Hook
  let olxHook: string;
  if (laptop.condition === 'Mint') olxHook = `Don't pay retail — this ${name} is in Mint condition for a fraction of the new price.`;
  else if (isBelowCost) olxHook = `Priced BELOW cost! This ${name} is an absolute steal.`;
  else olxHook = `Quality ${name} in ${laptop.condition} condition — well priced and ready to go.`;

  const body = [
    `📌 ${olxHook}`,
    ``,
    `This ${name} is in ${laptop.condition} condition and has been well looked after. ${laptop.condition === 'Mint' ? 'You would struggle to tell it apart from a brand-new unit.' : 'It works flawlessly and looks great.'}`,
    ``,
    `🖥️ Full Specifications:`,
    specs.map(s => `  • ${s.label}: ${s.value}`).join('\n'),
    ``,
    `🔋 Battery & Condition:`,
    `  Condition: ${laptop.condition}`,
    `  Battery: ${laptop.batteryHealth}`,
    batteryDesc(),
    laptop.repairs ? `\n  Repairs: ${laptop.repairs}` : '',
    ``,
    `💡 Why This Is a Great Deal:`,
    isBelowCost ? `  This laptop is priced BELOW what I paid for it. I need a quick sale, so you get a genuine bargain.` : `  At ${priceStr}, this ${laptop.condition}-condition ${name} offers outstanding value. You'd pay significantly more for the same specs brand new.`,
    signals.length > 0 ? `  ${signals[0]}` : '',
    ``,
    userFeatures.length > 0
      ? [`📦 What's Included:`, ...userFeatures.map(f => `  • ${f}`), ''].join('\n')
      : '',
    `📍 ${location || 'Collection available'}`,
    whatsapp ? `📲 WhatsApp: ${whatsapp}` : '',
    ``,
    `💰 Price: ${priceStr}`,
    ``,
    `Message me now for more photos or to arrange a viewing. Quick replies guaranteed!`,
  ].filter(Boolean).join('\n');
  return { platform, title, body, price: laptop.askingPrice };
}

function extractJson(text: string): { title: string; body: string } | null {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch { /* fall through */ }
    }
    const objectMatch = text.match(/\{[\s\S]*"title"[\s\S]*"body"[\s\S]*\}/);
    if (objectMatch) {
      try { return JSON.parse(objectMatch[0]); } catch { /* fall through */ }
    }
  }
  return null;
}

// ─── System prompt ─────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior marketplace ad copywriter specialising in second-hand electronics in South Africa. You write FULL, DETAILED, PERSUASIVE ads — not brief summaries. Your ads are long enough to properly sell the laptop.

YOUR #1 RULE: USE ONLY PROVIDED DATA
- ONLY include specifications that are explicitly listed in the laptop details.
- If a spec says "Not specified", DO NOT include it and DO NOT guess what it might be.
- DO NOT guess, infer, or add ANY ports, features, or specifications that are not listed.
- If no Features/Ports are provided by the user, skip that section or say "Contact for full specifications".

YOUR COPYWRITING STYLE:
- Write like a PASSIONATE but HONEST seller — warm, detailed, and convincing
- Every section must be SUBSTANTIAL (2-4 lines minimum)
- Use emotional language: help the buyer IMAGINE owning this laptop
- Build trust through transparency: mention condition honestly, highlight any repairs as professional
- Create urgency without desperation
- Frame the price as a SMART DEAL — compare to retail where relevant
- Use South African context: Rands, SA spelling (colour, programme), "DM me", "WhatsApp preferred"

YOUR COPYWRITING STRUCTURE:
1. HOOK — First line must stop the scroll (question, bold claim, or lifestyle angle)
2. INTRODUCTION — 3-4 lines describing the laptop and its condition
3. SPECS — Full list with brief benefit notes after each spec
4. CONDITION — Honest description with battery health details
5. WHY BUY — Value proposition, price justification, comparison to retail
6. TRUST SIGNALS — Transparency, repairs honesty, warranty, fresh install, charger, etc.
7. PRICE & CONTACT — Clear price, location, WhatsApp
8. CTA — Urgent but not desperate call to action

MINIMUM LENGTHS:
- Facebook/Gumtree/OLX body: 800+ characters
- WhatsApp body: 400+ characters
- If your ad is shorter than these minimums, it is NOT detailed enough. Add more content.

OUTPUT FORMAT: ALWAYS respond with valid JSON only: { "title": "...", "body": "..." }`;

// POST /api/generate-ad
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

    const validPlatforms = ['whatsapp', 'facebook', 'gumtree', 'olx'];
    const invalidPlatforms = platforms.filter((p: string) => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(', ')}` },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const laptop = await db.laptop.findUnique({ where: { id: laptopId } });

    if (!laptop) {
      return NextResponse.json(
        { error: 'Laptop not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const zai = await ZAI.create();
    const results: Array<{ platform: string; title: string; body: string; price: number }> = [];

    for (const platform of platforms) {
      const prompt = buildPrompt(platform, laptop);

      const chatBody: CreateChatCompletionBody = {
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      };

      try {
        const response = await zai.chat.completions.create(chatBody);
        const content = response?.choices?.[0]?.message?.content || '';

        const parsed = extractJson(content);
        if (!parsed) {
          results.push(buildFallbackAd(platform, laptop));
          continue;
        }

        let bodyText = parsed.body;
        // Enforce WhatsApp character limit (increased to 1000)
        if (platform === 'whatsapp' && bodyText.length > 1000) {
          bodyText = bodyText.substring(0, 997) + '...';
        }

        results.push({
          platform,
          title: parsed.title,
          body: bodyText,
          price: laptop.askingPrice,
        });
      } catch (llmError) {
        console.error(`Error generating ad for ${platform}:`, llmError);
        results.push(buildFallbackAd(platform, laptop));
      }
    }

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
