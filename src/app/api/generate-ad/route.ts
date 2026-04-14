import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import type { CreateChatCompletionBody } from 'z-ai-web-dev-sdk';

export const dynamic = "force-static";

// ─── Platform-specific formatting instructions ───────────

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  whatsapp: `WhatsApp Broadcast / Status ad rules:
- STRICT 1000-character limit for the entire message (title + body combined)
- Use WhatsApp formatting: *bold* for emphasis, _italic_ for subtitles
- TITLE must include the Stock ID if available: "#LF-XXXX Brand Model - R X,XXX"
- Start with a STRONG hook line — a question, bold value claim, or lifestyle angle that stops the scroll
- Write a 2-3 line introduction about the laptop, its condition, and what makes it worth buying
- List specs with ▸ markers — include a SHORT benefit after each spec if space allows
- Include a condition + battery description (1-2 lines)
- Include "Perfect for:" line listing target audience (e.g., students, professionals, budget buyers)
- Include a clear price line: *Price: R X,XXX*
- MANDATORY: Always include "📍 Location: [location]" line — NEVER skip this. Use the Location value provided.
- MANDATORY: Always include "📲 WhatsApp: [number]" line — NEVER skip this. Use the WhatsApp Number provided.
- Include 1-2 trust signals from notes (fresh install, warranty, charger, etc.)
- Close with an urgent CTA: "DM me now — this will not last long!" or similar
- Use 3-5 emojis strategically at line starts
- Every line must earn its space — no fluff
- Tone: energetic but honest, like a friend who found a great deal
- MINIMUM body length: 500 characters — make it substantial and persuasive`,

  facebook: `Facebook Marketplace ad rules — write a FULL, RICH, PERSUASIVE listing:

TITLE must include the Stock ID if available: "#LF-XXXX Brand Model - Condition - R X,XXX"

BODY MUST INCLUDE ALL OF THESE SECTIONS (write 2-4 lines per section):

1. HOOK LINE: Open with an attention-grabbing first line. NOT "Selling my laptop" — be creative. Use 💻🔥 emoji bookends.

2. INTRODUCTION: Write 3-4 vivid lines describing the laptop and its condition. Help the buyer picture owning it. Use emotional, descriptive language. Make it feel like a rare find.

3. CONDITION & BATTERY: Write 2-3 detailed lines about the physical condition (be vivid — describe the keyboard feel, screen quality, chassis appearance) and battery health (what it means for daily use).

4. ⚡ SPECS THAT IMPRESS:
List ONLY provided specs. EACH spec MUST have a benefit note explaining what it MEANS for the buyer:
⚡ Specs That Impress:
• Processor: Intel Core i7-1270P — Powerhouse performance — breeze through heavy workloads and multitasking
• Memory: 16GB DDR5 — Multitask effortlessly with multiple apps and dozens of browser tabs open
• Storage: 256GB NVMe SSD — Lightning-fast boot times, instant app launches, and snappy file transfers
(Add a SPECIFIC benefit after EACH spec — this is mandatory)

5. 🧰 FEATURES & CONNECTIVITY: (ONLY if user provided features — skip section entirely if empty. Do NOT guess or add ports)

6. 💡 WHY THIS LAPTOP?:
Write 3-4 persuasive lines about what makes THIS laptop special. Compare condition value vs new retail price. Frame the price as a SMART financial decision. Mention that walking into any shop would cost significantly more.

7. 🎯 PERFECT FOR:
List 3-4 target audiences based on specs (e.g., "University students needing a reliable study machine", "Professionals working from home", "Budget-conscious buyers looking for value"). Be specific.

8. ✅ TRUST SIGNALS:
List 2-4 trust points from provided data (fresh OS install, charger included, condition honesty, transparent about repairs, no repairs needed, etc.)

9. 📍 Location & 💵 Price & 📲 WhatsApp — MANDATORY SECTION:
You MUST include these three lines at the bottom of EVERY ad body, using the exact values provided above:
📍 Location: [use the Location value provided — NEVER omit this]
💵 Price: R[X,XXX]  
📲 WhatsApp: [use the WhatsApp Number provided — NEVER omit this]

If Location is "Not specified", use "Collection available — contact for details".
If WhatsApp Number is "Not provided", use "Message me for details".

10. 🚨 [Urgent CTA — 2 lines, specific and action-oriented]

STYLE RULES:
- Heavy emoji section headers — this style is emoji-rich
- Organised with clear section breaks and blank lines between sections
- Each section should be SUBSTANTIAL (2-4 lines minimum)
- Be honest about condition but very enthusiastic about the deal
- South African context (Rands, SA spelling: colour, programme)
- MINIMUM body length: 1200 characters — this must be a comprehensive listing, not a brief summary
- Use Facebook *bold* for section headers and key details
- Write like a passionate but honest human seller, not a robot`,

  gumtree: `Gumtree South Africa classified ad rules — write a FULL, PROFESSIONAL, DETAILED listing:

TITLE must include Stock ID: "Brand Model - Ref: LF-XXXX - Condition - R X,XXX"

BODY MUST INCLUDE ALL OF THESE SECTIONS:

1. FOR SALE: opener with brand + model + condition + ONE attention-grabbing sentence

2. ABOUT THIS LAPTOP: Write 4-6 vivid lines describing the laptop in detail. Cover condition honestly with descriptive language (keyboard feel, screen quality, chassis appearance). Mention battery health and what it means for daily use. Explain why someone should buy this specific laptop.

3. FULL SPECIFICATIONS: List ALL provided specs in a clean numbered format. EACH spec MUST have a brief benefit note:
1. Processor: Intel Core i5 — Fast and responsive, handles everyday tasks with ease
2. Memory: 8GB RAM — Solid multitasking, run multiple apps simultaneously
(This is mandatory — every spec needs a benefit)

4. CONDITION & BATTERY: Write 3-4 honest, descriptive lines about the physical condition and battery. If Mint/Excellent, paint a picture of what the buyer will see and feel. If repairs done, be fully transparent and frame as building trust.

5. WHO IS THIS LAPTOP PERFECT FOR?: List 3-4 specific target audiences based on the specs and condition (e.g., students, professionals, budget buyers, power users).

6. FEATURES & CONNECTIVITY: (ONLY user-provided features — skip section entirely if empty. Do NOT guess ports)

7. WHY BUY FROM ME?: Write 3-4 lines building trust. Emphasise honest selling, accurate condition description, willingness to arrange viewing. Mention any notes about charger, fresh install, warranty, receipt.

8. SELLER NOTES: Include provided notes naturally.

9. PRICE & CONTACT — MANDATORY:
You MUST include these in every ad:
Asking Price: R X,XXX
Location: [use the Location value — NEVER skip this]
WhatsApp: [use the WhatsApp Number — NEVER skip this]
If Location is "Not specified", use "Collection available — contact for details".
If WhatsApp Number is "Not provided", use "Message for details".

CTA: "Contact me to arrange a viewing. First come, first served. Serious buyers only please — no time wasters."

STYLE: Professional but warm. Use ━━━ dividers between major sections. Max 5-6 emojis total. Clean sections with blank lines.
MINIMUM body length: 1200 characters — this must be a comprehensive classified ad`,

  olx: "OLX South Africa listing rules - write a FULL, DETAILED, PERSUASIVE marketplace listing:\n\nTITLE must include price and Stock ID: \"Brand Model - Ref: LF-XXXX - R X,XXX\"\n\nBODY MUST INCLUDE ALL OF THESE SECTIONS:\n\n1. QUICK SUMMARY: Write 3-4 punchy lines that make the buyer WANT to read more. Lead with the biggest selling point. Use vivid language and frame as a rare find or smart buy.\n\n2. FULL SPECIFICATIONS: List ALL provided specs. EACH spec MUST have a benefit note about what it means for the buyer. (This is mandatory - every spec needs a specific benefit)\n\n3. BATTERY & CONDITION: Write 3-4 descriptive lines about condition and battery health. Paint a picture of what the buyer will experience. Be honest but enthusiastic.\n\n4. WHY THIS IS A GREAT DEAL: Write 3-4 persuasive lines justifying the price. Compare to new retail explicitly. Frame as a SMART FINANCIAL DECISION. Mention that buying brand new would cost significantly more.\n\n5. IDEAL FOR: List 3-4 specific target audiences (students, professionals, budget buyers, etc.) based on the specs and condition.\n\n6. WHAT'S INCLUDED: Only list accessories/features the user mentioned. If nothing listed, skip this section.\n\n7. 📍 Location & 📲 WhatsApp & 💵 Price — MANDATORY:\nYou MUST include these three lines in every OLX ad:\n📍 Location: [use the Location value — NEVER skip this]\n📲 WhatsApp: [use the WhatsApp Number — NEVER skip this]\n💰 Price: R[X,XXX]\nIf Location is empty/not specified, use \"Collection available — contact for details\".\nIf WhatsApp Number is empty/not provided, use \"Message me for details\".\n\n8. CTA: \"Message me now for more photos, a video walkthrough, or to arrange a viewing. I reply quickly - no chancers please, serious buyers only.\"\n\nMINIMUM body length: 1200 characters - full listing, not brief. Use Facebook *bold* for section headers.",

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

/** Generate a benefit note for a spec */
function fallbackSpecBenefit(label: string, value: string): string {
  const v = value.toLowerCase();
  if (label === 'Processor' || label === 'CPU') {
    if (v.includes('i7') || v.includes('ryzen 7') || v.includes('ryzen 9')) return 'Powerhouse performance — breeze through heavy workloads and multitasking';
    if (v.includes('i5') || v.includes('ryzen 5')) return 'Fast and responsive — handles everyday tasks and browsing with ease';
    if (v.includes('i3') || v.includes('ryzen 3')) return 'Reliable everyday performance — perfect for web, emails, and office work';
    if (v.includes('m1') || v.includes('m2') || v.includes('m3')) return 'Apple Silicon power — incredible speed and battery efficiency';
    return 'Reliable processing power for smooth everyday performance';
  }
  if (label === 'Memory' || label === 'RAM') {
    if (v.includes('32') || v.includes('64')) return 'Massive memory — run demanding apps and dozens of tabs without slowdown';
    if (v.includes('16')) return 'Plenty of memory — multitask effortlessly with multiple apps open';
    if (v.includes('8')) return 'Solid multitasking — comfortably run multiple apps simultaneously';
    return 'Smooth multitasking capability';
  }
  if (label === 'Storage') {
    if (v.includes('nvme') || v.includes('ssd')) return 'Lightning-fast boot times, instant app launches, and snappy file transfers';
    if (v.includes('hdd') || v.includes('hard')) return 'Spacious traditional storage — plenty of room for all your files';
    return 'Fast and reliable storage';
  }
  if (label === 'Graphics' || label === 'GPU') {
    if (v.includes('rtx') || v.includes('gtx')) return 'Dedicated graphics — smooth gaming and creative work';
    return 'Integrated graphics — great for everyday tasks and streaming';
  }
  if (label === 'Display') {
    const size = parseFloat(v);
    if (size >= 15.6) return 'Large, comfortable screen — excellent for productivity and entertainment';
    if (size >= 14) return 'Great balance of portability and screen real estate';
    return 'Compact and portable — perfect for working on the go';
  }
  return '';
}

/** Generate target audiences */
function fallbackAudiences(cpu: string, ram: string, condition: string, price: number): string[] {
  const a: string[] = [];
  const c = cpu.toLowerCase();
  const r = ram.toLowerCase();
  if (c.includes('i7') || c.includes('ryzen 7') || r.includes('16') || r.includes('32')) {
    a.push('Power users and developers needing serious performance');
    a.push('Content creators — video editing, design, and music production');
  }
  if (c.includes('i5') || c.includes('ryzen 5') || r.includes('8')) {
    a.push('Professionals working from home or the office');
    a.push('University and college students needing a reliable study machine');
  }
  if (c.includes('i3') || c.includes('celeron') || r.includes('4')) {
    a.push('School learners needing a laptop for homework and projects');
    a.push('Anyone needing a reliable machine for web browsing and streaming');
  }
  if (condition === 'Mint' || condition === 'Excellent')
    a.push('Buyers who want near-new quality without the brand-new price tag');
  if (price > 0 && price <= 3000)
    a.push('First-time laptop buyers or anyone on a tight budget');
  return [...new Set(a)].slice(0, 4);
}

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

  const specsWithBenefits = specs.map(s => {
    const b = fallbackSpecBenefit(s.label, s.value);
    return b ? `  • ${s.label}: ${s.value} — ${b}` : `  • ${s.label}: ${s.value}`;
  });

  const userFeatures = laptop.features && laptop.features.trim()
    ? laptop.features.split(/[,.\n]+/).map(f => f.trim()).filter(Boolean)
    : [];

  const location = laptop.location || laptop.defaultLocation || '';
  const whatsapp = laptop.whatsappNumber || '';
  const isBelowCost = laptop.purchasePrice && laptop.purchasePrice > laptop.askingPrice;
  const audiences = fallbackAudiences(laptop.cpu, laptop.ram, laptop.condition, laptop.askingPrice);

  // Condition description builder
  function conditionDesc(): string {
    switch (laptop.condition) {
      case 'Mint': return 'This laptop is in Mint condition — virtually indistinguishable from brand new. The keyboard feels crisp and responsive, the screen is absolutely flawless, and the chassis looks like it just came out the box. No scuffs, no dents, no wear marks. You are genuinely getting a new laptop at a fraction of the retail price.';
      case 'Excellent': return 'In Excellent condition — barely broken in and lovingly looked after. The screen is bright and crystal-clear, the keyboard and trackpad feel fresh, and the body has only the tiniest signs of use. This laptop looks and performs like new in every meaningful way.';
      case 'Good': return 'In Good condition — well cared for with only the normal, minor signs of everyday use that you would expect. Everything works exactly as it should: all ports respond, the screen is clear, the battery charges properly. A reliable machine that will serve you well for years.';
      case 'Fair': return 'In Fair condition — you will notice some cosmetic wear from regular use, but make no mistake: this laptop is fully functional and mechanically sound. Every feature works correctly and it is priced fairly to reflect the cosmetic wear.';
      case 'Poor': return 'In Poor condition — shows significant wear but still works. Ideal for budget buyers, students, or anyone needing a functional laptop without spending big. Priced accordingly for a quick sale.';
      default: return `Condition: ${laptop.condition}`;
    }
  }

  // Battery description
  function batteryDesc(): string {
    const bh = laptop.batteryHealth.toLowerCase();
    if (bh.includes('excellent')) return `Battery health is Excellent — you can expect all-day battery life for normal use. Work, study, or browse for hours without hunting for a plug point.`;
    if (bh.includes('good')) return `Battery health is Good — still holds a solid charge for several hours of continuous use. Perfectly fine for working away from your desk.`;
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
        signals.push('Still under warranty — buy with complete peace of mind');
      if (n.includes('receipt') || n.includes('proof'))
        signals.push('Proof of purchase / receipt available');
      if (n.includes('charger') || n.includes('adapter'))
        signals.push('Original charger / adapter included — just plug in and go');
      if (n.includes('bag') || n.includes('case'))
        signals.push('Free laptop bag / case included as a bonus');
      if (n.includes('delivery') || n.includes('courier'))
        signals.push('Can arrange delivery / courier — ask for details');
    }
    if (laptop.condition === 'Mint' || laptop.condition === 'Excellent')
      signals.push(`${laptop.condition} condition — a genuine saving compared to buying brand new`);
    if (!laptop.repairs)
      signals.push('No repairs needed — original and fully functional');
    return signals;
  }

  const stockRef = laptop.stockId ? `#${laptop.stockId} ` : '';
  const stockRefBody = laptop.stockId ? `#${laptop.stockId}` : '';
  const signals = trustSignals();

  // ─── WHATSAPP ───
  if (platform === "whatsapp") {
    const title = `${stockRef}${name} - ${priceStr}`;
    const hook = laptop.condition === 'Mint'
      ? `Looking for a ${name} that looks brand new but does not cost brand new? This is it.`
      : isBelowCost
        ? `Priced BELOW cost — this ${name} is an absolute steal and needs to go NOW!`
        : `Need a reliable, well-priced laptop? Look no further than this ${name}.`;

    const body = [
      `*${hook}*`,
      ``,
      `*${name}*`,
      `_${laptop.condition} condition | Battery: ${laptop.batteryHealth}_`,
      ``,
      specs.map(s => `▸ ${s.value}`).join('\n'),
      ``,
      conditionDesc().split('. ').slice(0, 3).join('. ') + '.',
      ``,
      `*Perfect for:* ${audiences.slice(0, 3).map(a => a.split(' — ')[0]).join(' | ')}`,
      ``,
      `💰 *Price: ${priceStr}*`,
      isBelowCost ? `🔥 *Below cost — urgent sale!*` : '',
      location ? `📍 ${location}` : null,
      whatsapp ? `📲 WhatsApp: ${whatsapp}` : null,
      signals.length > 0 ? `✅ ${signals.slice(0, 2).join(' | ')}` : null,
      ``,
      `*DM me now — this will not last long!* 🚀`,
    ].filter(Boolean).join('\n');
    return { platform, title, body: body.substring(0, 1000), price: laptop.askingPrice };
  }

  // ─── FACEBOOK ───
  if (platform === "facebook") {
    const title = `${stockRef}${name} - ${laptop.condition} - ${priceStr}`;

    let hook: string;
    if (laptop.condition === 'Mint') hook = `Why pay full retail when this ${name} looks and feels absolutely brand new?`;
    else if (isBelowCost) hook = `This ${name} is priced BELOW what I paid — my loss is your gain!`;
    else if (laptop.condition === 'Excellent') hook = `Barely used, fully loaded, and priced to sell — this ${name} will not hang around.`;
    else if (laptop.condition === 'Good') hook = `A solid, reliable ${name} at a fair price — exactly the kind of laptop that sells fast.`;
    else hook = `Looking for a functional laptop at a great price? This ${name} delivers.`;

    const body = [
      `${stockRefBody} 💻🔥 ${name} — ${hook} 🔥💻`,
      ``,
      laptop.condition === 'Mint'
        ? `This is one of those rare finds — a laptop in absolutely stunning condition that has been meticulously looked after. Whether you are a student, a professional, or just someone who needs a reliable machine without spending thousands more at a shop, this ${name} ticks every box.`
        : laptop.condition === 'Excellent'
          ? `This ${name} has been barely used and it shows. Everything feels fresh — from the crisp keyboard to the bright, clear screen. It is the kind of laptop that makes you wonder why anyone would pay full retail when deals like this exist.`
          : `This ${name} is a workhorse that has been well looked after and is ready for its next owner. It handles everyday tasks reliably and is priced fairly for what you get. Sometimes the best value is the laptop that simply works, day in and day out.`,
      ``,
      conditionDesc(),
      ``,
      batteryDesc(),
      laptop.repairs ? `\n🔧 *Repairs:* ${laptop.repairs} — I believe in full transparency. The laptop has been professionally repaired and is fully functional and reliable.` : '',
      ``,
      `⚡ *Specs That Impress:*`,
      ...specsWithBenefits,
      ``,
      userFeatures.length > 0
        ? [`🧰 *Features & Connectivity:*`, ...userFeatures.map(f => `  • ${f}`), ''].join('\n')
        : '',
      `💡 *Why This Laptop?*`,
      isBelowCost
        ? `  Priced BELOW cost — this is a genuine bargain. I need it gone, so you win. You will not find this spec at this price anywhere else.`
        : `  At ${priceStr}, this ${laptop.condition}-condition ${name} represents outstanding value for money. Walk into any shop and try to find similar specs — you will pay significantly more brand new.`,
      specs.length >= 3
        ? `  With specs like ${specs[0].value} and ${specs[1].value}, this machine handles everyday tasks with ease.`
        : '',
      `  The ${laptop.condition} condition means you are getting a laptop that works flawlessly without the brand-new price tag.`,
      ``,
      audiences.length > 0
        ? [`🎯 *Perfect For:*`, ...audiences.map(a => `  • ${a}`), ''].join('\n')
        : '',
      signals.length > 0
        ? [`✅ *Trust Signals:*`, ...signals.map(s => `  ✔ ${s}`), ''].join('\n')
        : '',
      laptop.notes ? `📝 *Seller Notes:* ${laptop.notes}` : '',
      ``,
      location ? `📍 Location: ${location}` : null,
      `💵 Price: ${priceStr}`,
      whatsapp ? `📲 WhatsApp: ${whatsapp}` : null,
      ``,
      `🚨 *Do not wait on this one — message me now to arrange a viewing or ask for more photos. Deals like this do not last!*`,
    ].filter(Boolean).join('\n');
    return { platform, title, body, price: laptop.askingPrice };
  }

  // ─── GUMTREE ───
  if (platform === "gumtree") {
    const stockRefTitle = laptop.stockId ? ` - Ref: ${laptop.stockId}` : '';
    const title = `${name}${stockRefTitle} - ${laptop.condition} - ${priceStr}`;

    const body = [
      `FOR SALE: ${name} — ${laptop.condition} Condition`,
      ``,
      conditionDesc(),
      ``,
      batteryDesc(),
      laptop.repairs ? `\nRepairs: ${laptop.repairs} — I believe in full transparency. The laptop has been professionally repaired and is fully functional and reliable.` : '',
      '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Full Specifications:`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      specs.map((s, i) => {
        const b = fallbackSpecBenefit(s.label, s.value);
        return `  ${i + 1}. ${s.label}: ${s.value}${b ? ` — ${b}` : ''}`;
      }).join('\n'),
      '',
      userFeatures.length > 0
        ? [`Features & Connectivity:`, ...userFeatures.map(f => `  • ${f}`), ''].join('\n')
        : '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `Who Is This Laptop Perfect For?`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ...audiences.map(a => `  • ${a}`),
      '',
      `Why Buy From Me?`,
      `  I am an honest, straightforward seller — what you see is what you get. The condition is accurately described and I am happy to answer any questions. I can arrange a viewing at your convenience and you are welcome to test everything before committing.`,
      ...signals.map(s => `  ✔ ${s}`),
      ``,
      laptop.notes ? `Seller Notes: ${laptop.notes}` : '',
      '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Price & Contact:`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `Asking Price: ${priceStr}${isBelowCost ? ' — PRICED BELOW COST, URGENT SALE!' : ''}`,
      location ? `Location: ${location}` : null,
      whatsapp ? `WhatsApp: ${whatsapp}` : null,
      ``,
      `Contact me to arrange a viewing. First come, first served. Serious buyers only please — no time wasters.`,
    ].filter(Boolean).join('\n');
    return { platform, title, body, price: laptop.askingPrice };
  }

  // ─── OLX ───
  const stockRefTitle = laptop.stockId ? ` - Ref: ${laptop.stockId}` : '';
  const title = `${name}${stockRefTitle} — ${priceStr}`;

  let olxHook: string;
  if (laptop.condition === 'Mint') olxHook = `Do not pay retail — this ${name} is in Mint condition for a fraction of the new price. A rare find.`;
  else if (isBelowCost) olxHook = `Priced BELOW cost! This ${name} is an absolute steal — my loss is your gain.`;
  else if (laptop.condition === 'Excellent') olxHook = `Near-new quality at a second-hand price — this ${name} in Excellent condition will sell fast.`;
  else olxHook = `Quality ${name} in ${laptop.condition} condition — well priced, fully functional, and ready to go.`;

  const body = [
    `📌 ${olxHook}`,
    ``,
    `This ${name} has been well looked after and is ready for its next owner. ${laptop.condition === 'Mint' || laptop.condition === 'Excellent' ? 'You would genuinely struggle to tell it apart from a brand-new unit.' : 'It works flawlessly, looks great, and has been fully tested to ensure everything is in working order.'}`,
    ``,
    `🖥️ *Full Specifications:*`,
    ...specsWithBenefits,
    ``,
    `🔋 *Battery & Condition:*`,
    `  Condition: ${laptop.condition}`,
    `  Battery: ${laptop.batteryHealth}`,
    `  ${batteryDesc().charAt(0).toLowerCase() + batteryDesc().slice(1)}`,
    laptop.repairs ? `\n  Repairs: ${laptop.repairs} — professionally repaired and fully functional` : '',
    ``,
    `💡 *Why This Is a Great Deal:*`,
    isBelowCost
      ? `  This laptop is priced BELOW what I paid for it. I need a quick sale, so you get a genuine bargain. At this price, it will not last long.`
      : `  At ${priceStr}, this ${laptop.condition}-condition ${name} offers outstanding value. Walk into any retailer and you will pay significantly more for the same specs brand new.`,
    signals.length > 0 ? `  ${signals[0]}` : '',
    ``,
    audiences.length > 0
      ? [`🎯 *Ideal For:*`, ...audiences.map(a => `  • ${a}`), ''].join('\n')
      : '',
    userFeatures.length > 0
      ? [`📦 *What Is Included:*`, ...userFeatures.map(f => `  • ${f}`), ''].join('\n')
      : '',
    `📍 ${location || 'Collection available'}`,
    whatsapp ? `📲 WhatsApp: ${whatsapp}` : '',
    ``,
    `💰 Price: ${priceStr}`,
    ``,
    `Message me now for more photos, a video walkthrough, or to arrange a viewing. I reply quickly — no chancers please, serious buyers only.`,
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

const SYSTEM_PROMPT = `You are a senior marketplace ad copywriter specialising in second-hand electronics in South Africa. You write FULL, DETAILED, PERSUASIVE, COMPREHENSIVE ads — not brief summaries. Your ads are long, rich, and detailed enough to properly sell the laptop and make the buyer feel confident about their purchase.

YOUR #1 RULE: USE ONLY PROVIDED DATA
- ONLY include specifications that are explicitly listed in the laptop details.
- If a spec says "Not specified", DO NOT include it and DO NOT guess what it might be.
- DO NOT guess, infer, or add ANY ports, features, or specifications that are not listed.
- If no Features/Ports are provided by the user, skip that section entirely. Do NOT invent features.
- Do NOT mix content from "Seller Notes" into the specs section — notes are separate.

YOUR COPYWRITING STYLE:
- Write like a PASSIONATE but HONEST seller — warm, vivid, detailed, and convincing
- Every section must be SUBSTANTIAL (2-4 lines minimum, most should be 3-4 lines)
- Use emotional, descriptive language: help the buyer IMAGINE owning this laptop
- Describe the PHYSICAL EXPERIENCE: keyboard feel, screen brightness, chassis quality
- Build trust through transparency: mention condition honestly, highlight any repairs as professional
- Create urgency without desperation — frame as "deals like this don't come around often"
- Frame the price as a SMART FINANCIAL DECISION — compare to retail explicitly
- Use South African context: Rands, SA spelling (colour, programme), "DM me", "WhatsApp preferred"
- Write naturally — make it read like a human seller wrote it, not a robot

YOUR COPYWRITING STRUCTURE (MANDATORY):
1. HOOK — First line must stop the scroll (question, bold claim, or lifestyle angle)
2. INTRODUCTION — 3-4 vivid lines describing the laptop, its condition, and why it is a rare find
3. CONDITION & BATTERY — 2-3 descriptive lines with physical details and battery implications
4. SPECS — Full list where EACH spec has a SPECIFIC benefit note (mandatory)
5. WHY BUY — 3-4 persuasive lines about value, price justification, comparison to retail
6. TARGET AUDIENCE — 3-4 specific audiences who would benefit from this laptop
7. TRUST SIGNALS — 2-4 points about transparency, repairs, warranty, fresh install, charger
8. PRICE & CONTACT — MANDATORY IN EVERY AD:
You MUST include these three lines at the bottom of EVERY ad body regardless of platform:
- 📍 Location: [use the provided location]
- 💵 Price: R X,XXX
- 📲 WhatsApp: [use the provided WhatsApp number]
NEVER omit these lines. If the value is "Not specified" or "Not provided", use a fallback: "Collection available — contact for details" for location, "Message me for details" for WhatsApp.

9. CTA — Urgent, specific, action-oriented call to action (2 lines)

MINIMUM LENGTHS (STRICT — your ad WILL be rejected if too short):
- Facebook/Gumtree/OLX body: 1200+ characters MINIMUM
- WhatsApp body: 500+ characters MINIMUM
- If your ad body is shorter than these minimums, it is NOT detailed enough. Go back and add more content to each section.

OUTPUT FORMAT: ALWAYS respond with valid JSON only: { "title": "...", "body": "..." }`;


// POST /api/generate-ad
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { laptopId, platforms, whatsappNumber, defaultLocation } = body;

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
      const prompt = buildPrompt(platform, { ...laptop, whatsappNumber: whatsappNumber || laptop.whatsappNumber, defaultLocation: defaultLocation || laptop.location || '' });

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
          results.push(buildFallbackAd(platform, { ...laptop, whatsappNumber: whatsappNumber || laptop.whatsappNumber, defaultLocation: defaultLocation || laptop.location || '' }));
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
        results.push(buildFallbackAd(platform, { ...laptop, whatsappNumber: whatsappNumber || laptop.whatsappNumber, defaultLocation: defaultLocation || laptop.location || '' }));
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
