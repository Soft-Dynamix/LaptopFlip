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
- Start with a STRONG hook line — a question, bold value claim, or lifestyle angle that stops the scroll. VARY your hook style each time!
- Write a 2-3 line introduction that creates DESIRE — make the buyer picture themselves using this laptop. Use vivid, sensory language.
- List specs with ▸ markers — include a SHORT benefit after each spec if space allows. Make benefits feel like a WIN for the buyer.
- Include a condition + battery description (1-2 lines) — be honest but frame every detail as buyer value.
- Include "Perfect for:" line listing target audience — be CREATIVE and SPECIFIC, not generic. Instead of "students", try "Matriculants who need a study machine that won't let them down during exams"
- Include a clear price line: *Price: R X,XXX*
- MANDATORY: Always include "📍 Location: [location]" line — NEVER skip this. Use the Location value provided.
- MANDATORY: Always include "📲 WhatsApp: [number]" line — NEVER skip this. Use the WhatsApp Number provided.
- Include 1-2 trust signals from notes (fresh install, warranty, charger, etc.) — make them feel like bonuses the buyer is getting
- Close with an urgent CTA that creates REAL FOMO: "DM me now — 2 people already asked about this one!" or "Last one at this price, I promise you'll kick yourself if you miss it."
- Use 3-5 emojis strategically at line starts
- Every line must earn its space — no fluff, but pack personality into every word
- Tone: like your mate found an insane deal and is texting you NOW because they know you'd want in
- MINIMUM body length: 500 characters — make it substantial, punchy, and impossible to scroll past`,

  facebook: `Facebook Marketplace ad rules — write a FULL, RICH, PERSUASIVE listing that makes people STOP, READ, and MESSAGE:

TITLE must include the Stock ID if available: "#LF-XXXX Brand Model - Condition - R X,XXX"

BODY MUST INCLUDE ALL OF THESE SECTIONS (write 2-4 lines per section):

1. HOOK LINE: Open with an attention-grabbing first line that creates INSTANT curiosity or FOMO. NOT "Selling my laptop" — that's a scroll-past. Use 💻🔥 emoji bookends. CHOOSE A DIFFERENT HOOK STYLE EACH TIME:
   - Provocative question: "Why would anyone pay R20k at Takealot when THIS exists?"
   - Bold claim: "I'm about to save someone a LOT of money right now."
   - Story hook: "Walked into Incredible Connection yesterday. Same specs? R15k. This one? Nowhere near."
   - Humour: "My wallet is crying but your wallet is about to be very happy."
   - FOMO: "Three people have asked about this today and it's STILL available. For now."

2. INTRODUCTION: Write 3-4 vivid, EMOTIONAL lines. Don't just describe the laptop — make the buyer FEEL what it's like to own it. "Imagine opening this laptop at your favourite coffee shop in Rosebank..." Use sensory language: how the keyboard feels, how fast apps open, how the screen looks on a sunny day. Make it feel like a rare find they're LUCKY to have spotted.

3. CONDITION & BATTERY: Write 2-3 detailed lines about the physical condition. Be VIVID — describe the keyboard feel ("crisp and responsive"), screen quality ("bright and crystal-clear"), chassis appearance ("clean, no dents"). For battery, explain what it MEANS: "Work through a full lecture at UCT without hunting for a plug point." Be honest but frame everything as buyer value.

4. ⚡ SPECS THAT IMPRESS:
List ONLY provided specs. EACH spec MUST have a SPECIFIC, EXCITING benefit note that tells the buyer WHY IT MATTERS TO THEM:
⚡ Specs That Impress:
• Processor: Intel Core i7-1270P — Powerhouse performance — breeze through heavy workloads, run VS Code, Chrome with 50 tabs, and Spotify simultaneously without breaking a sweat
• Memory: 16GB DDR5 — Multitask like a boss — Excel, Teams, Slack, and 30 browser tabs all running buttery smooth
• Storage: 256GB NVMe SSD — Lightning-fast boot times — from power on to working in under 15 seconds, plus snappy file transfers
(Add a SPECIFIC, RELATABLE benefit after EACH spec — this is mandatory. Think about what the buyer actually DOES with their laptop.)

5. 🧰 FEATURES & CONNECTIVITY: (ONLY if user provided features — skip section entirely if empty. Do NOT guess or add ports)

6. 💡 WHY THIS LAPTOP?:
Write 3-4 persuasive lines about what makes THIS laptop special. This is where you SELL THE DEAL, not just the laptop. Compare to retail prices at Takealot, Incredible Connection, Makro — "Walk into any of these shops and you'll pay R12k-R15k for these specs brand new." Frame the price as a SMART FINANCIAL MOVE. Add SA flavour: "Rather spend the difference on a weekend away at the coast, bru." Mention that this is the kind of deal that appears, gets shared, and vanishes.

7. 🎯 PERFECT FOR:
List 3-4 SPECIFIC target audiences. Be CREATIVE and make each feel personally addressed:
- "Matric students needing a reliable study machine that won't crash during exam prep"
- "Side-hustlers and freelancers building their empire after hours"
- "Working professionals who need a solid WFH machine without the brand-new price tag"
- "Varsity students who want something that lasts through a full day of lectures"
Don't use generic "students" or "professionals" — give each audience a story.

8. ✅ TRUST SIGNALS:
List 2-4 trust points from provided data. Make each one feel like an UNEXPECTED BONUS:
- "Fresh Windows 11 installed — no bloatware, no nonsense, just clean and fast from day one"
- "Original charger included — save yourself R800 at the shop"
- "No repairs needed — this machine is 100% original and fully functional"
Be SPECIFIC about what each signal means for the buyer.

9. 📍 Location & 💵 Price & 📲 WhatsApp — MANDATORY SECTION:
You MUST include these three lines at the bottom of EVERY ad body, using the exact values provided above:
📍 Location: [use the Location value provided — NEVER omit this]
💵 Price: R[X,XXX]  
📲 WhatsApp: [use the WhatsApp Number provided — NEVER omit this]

If Location is "Not specified", use "Collection available — contact for details".
If WhatsApp Number is "Not provided", use "Message me for details".

10. 🚨 [Urgent CTA — 2 lines, specific and action-oriented. Create REAL FOMO]
"Don't be the person who sees this tomorrow and finds it's already gone. Message me NOW — I respond fast."

STYLE RULES:
- Heavy emoji section headers — this style is emoji-rich
- Organised with clear section breaks and blank lines between sections
- Each section should be SUBSTANTIAL (2-4 lines minimum)
- Be honest about condition but absolutely ENTHUSIASTIC about the deal
- South African context (Rands, SA spelling: colour, programme)
- Sprinkle SA flavour: "bru", "ja", "lekker", "now now", "ag man" — but naturally, not forced
- MINIMUM body length: 1500 characters — this must be a COMPREHENSIVE listing
- Use Facebook *bold* for section headers and key details
- Write like a passionate but honest human seller, not a robot`,

  gumtree: `Gumtree South Africa classified ad rules — write a FULL, PROFESSIONAL, DETAILED listing that makes buyers pick up the phone:

TITLE must include Stock ID: "Brand Model - Ref: LF-XXXX - Condition - R X,XXX"

BODY MUST INCLUDE ALL OF THESE SECTIONS:

1. FOR SALE: opener with brand + model + condition + ONE attention-grabbing sentence that stops the reader. Try different styles:
   - "If you're reading this, you're in the right place — this is the deal everyone's been looking for."
   - "Stop scrolling. This [Brand] [Model] in [Condition] condition is priced to MOVE and it won't hang around."
   - "I know what you're thinking — another laptop ad. But trust me, this one's different."

2. ABOUT THIS LAPTOP: Write 4-6 vivid lines describing the laptop in DETAIL. Don't just list facts — paint a picture:
   - Physical feel: "The aluminium chassis still has that premium weight to it, the hinge is solid with no wobble, and the keyboard has that satisfying tactile click."
   - Screen quality: "The display is bright and sharp — whether you're working on spreadsheets in a Sandton office or watching Netflix in bed, it looks great."
   - Mention battery health and what it means for DAILY USE: "Easily gets through a full day of meetings without needing to hunt for a plug point."
   - Explain WHY someone should buy THIS specific laptop over the other 50 listings they're scrolling through.

3. FULL SPECIFICATIONS: List ALL provided specs in a clean numbered format. EACH spec MUST have a SPECIFIC benefit note that tells the buyer what it means for THEIR life:
1. Processor: Intel Core i5 — Fast and responsive — breeze through work tasks, video calls, and multitasking without any lag
2. Memory: 8GB RAM — Solid multitasking — run Chrome with 20+ tabs, email, and Slack all at once without stuttering
3. Storage: 256GB SSD — Lightning-fast boot times and app launches — no more waiting 2 minutes for your laptop to start up
(This is mandatory — every spec needs a benefit that the buyer can FEEL)

4. CONDITION & BATTERY: Write 3-4 honest, DESCRIPTIVE lines about the physical condition and battery:
   - If Mint/Excellent, paint a PICTURE: "Honestly, if I didn't tell you this was pre-owned, you'd never know. The screen is flawless, the keyboard feels factory-fresh, and the chassis doesn't have a single mark."
   - If repairs done, be FULLY TRANSPARENT and frame as trust-building: "I believe in being upfront — [repair details]. It's been professionally done and the laptop runs perfectly. I'd rather lose a sale than mislead a buyer."
   - Always end on a positive: "At this price, you're getting a machine that works flawlessly."

5. WHO IS THIS LAPTOP PERFECT FOR?: List 3-4 SPECIFIC target audiences. Give each a PERSONALITY:
   - "University students who need a reliable companion for lectures, assignments, and late-night study sessions"
   - "Remote workers who want a solid machine without spending their entire bonus on a brand-new one"
   - "Small business owners who need a dependable workhorse for emails, invoicing, and video calls"
   - "Anyone upgrading from an old laptop and wanting a noticeable performance boost without the brand-new price"
Make each audience feel SEEN and UNDERSTOOD.

6. FEATURES & CONNECTIVITY: (ONLY user-provided features — skip section entirely if empty. Do NOT guess ports)

7. WHY BUY FROM ME?: Write 3-4 lines building TRUST. This matters on Gumtree:
   - "I'm an honest seller — what you see is what you get. The condition is 100% accurately described."
   - "Happy to arrange a viewing at your convenience. Test everything — keyboard, screen, ports, battery. Take your time."
   - Mention specific trust signals: charger, fresh install, warranty, receipt.
   - "I've sold laptops before and my buyers always leave happy. Check my other listings if you want proof."

8. SELLER NOTES: Include provided notes naturally, woven into the narrative.

9. PRICE & CONTACT — MANDATORY:
You MUST include these in every ad:
Asking Price: R X,XXX
Location: [use the Location value — NEVER skip this]
WhatsApp: [use the WhatsApp Number — NEVER skip this]
If Location is "Not specified", use "Collection available — contact for details".
If WhatsApp Number is "Not provided", use "Message for details".

CTA: "WhatsApp me to arrange a viewing — I respond quickly and I'm flexible on meeting times. First come, first served. Serious buyers only please — no time wasters, no 'is this still available' messages. If you're reading this, it IS available."

STYLE: Professional but WARM and PERSONABLE. Use ━━━ dividers between major sections. Max 5-6 emojis total. Clean sections with blank lines. Write like a knowledgeable friend who's helping you find a great deal.
MINIMUM body length: 1500 characters — this must be a comprehensive, trust-building classified ad`,

  olx: `OLX South Africa listing rules - write a FULL, DETAILED, PERSUASIVE marketplace listing that stands out from the 100s of other laptop ads:

TITLE must include price and Stock ID: "Brand Model - Ref: LF-XXXX - R X,XXX"

BODY MUST INCLUDE ALL OF THESE SECTIONS:

1. QUICK SUMMARY: Write 3-4 PUNCHY lines that make the buyer STOP and WANT to read more. Open with your BIGGEST selling point. Use vivid language and frame as a rare find or smart buy:
   - "This is one of those ads you bookmark and come back to — except by then it'll be gone."
   - "Stop what you're doing and read this. I'm about to save you thousands."
   - "Forget browsing. THIS is the laptop you've been looking for at a price that doesn't make sense."
Make it IMPOSSIBLE to scroll past.

2. FULL SPECIFICATIONS: List ALL provided specs. EACH spec MUST have a benefit note about what it means for the buyer's DAILY LIFE:
   - "16GB RAM — Multitask without frustration: Zoom calls, emails, 30 browser tabs, and Spotify running simultaneously"
   - "512GB SSD — Boot up in seconds, not minutes. No more staring at a loading screen while your coffee gets cold"
   - "15.6" FHD Display — Crisp visuals for work presentations and weekend Netflix sessions"
(This is mandatory - every spec needs a SPECIFIC, RELATABLE benefit)

3. BATTERY & CONDITION: Write 3-4 DESCRIPTIVE lines about condition and battery health. PAINT A PICTURE of what the buyer will experience:
   - "The screen is bright and clear — no dead pixels, no scratches."
   - "The keyboard feels solid under your fingers — perfect for typing up long documents or essays."
   - "Battery gets through a solid work session without needing a charge — perfect for coffee shop work days or campus life."
   Be HONEST but ENTHUSIASTIC. If there's wear, mention it but redirect to value: "A couple of light marks on the lid from normal use, but nothing that affects performance even slightly."

4. WHY THIS IS A GREAT DEAL: Write 3-4 persuasive lines justifying the price. This is your CLOSE:
   - Compare to retail EXPLICITLY: "The same specs brand new at Takealot? R18k-R22k. At this price, you're saving enough for a weekend away."
   - Frame as a SMART FINANCIAL DECISION: "Why pay full price when this machine does exactly the same thing for a fraction of the cost?"
   - Add urgency: "I've priced this to sell fast. Deals at this price point don't hang around — especially in this condition."
   - SA flavour: "That's a lekker saving that you can put towards something fun, bru."

5. IDEAL FOR: List 3-4 SPECIFIC target audiences with EMOTIONAL hooks:
   - "Matric students heading to varsity next year — get sorted NOW before the rush"
   - "Working from home? This is the reliable partner your home office deserves"
   - "Anyone tired of their slow, ancient laptop and ready for an upgrade that doesn't break the bank"
   - "Parents looking for a solid laptop for their teenager without spending a fortune"
Speak DIRECTLY to each audience like you know them.

6. WHAT'S INCLUDED: Only list accessories/features the user mentioned. If nothing listed, skip this section. If charger is included, frame it: "Original charger included — that's R600-R900 you don't need to spend at the shop."

7. 📍 Location & 📲 WhatsApp & 💵 Price — MANDATORY:
You MUST include these three lines in every OLX ad:
📍 Location: [use the Location value — NEVER skip this]
📲 WhatsApp: [use the WhatsApp Number — NEVER skip this]
💰 Price: R[X,XXX]
If Location is empty/not specified, use "Collection available — contact for details".
If WhatsApp Number is empty/not provided, use "Message me for details".

8. CTA: "Message me NOW for more photos, a video walkthrough, or to arrange a viewing. I reply fast — usually within minutes. No chancers please, serious buyers only. If this ad is up, it's available — don't ask, just come see it."

MINIMUM body length: 1500 characters - full listing, not brief. Use Facebook *bold* for section headers. Make this the AD THEY REMEMBER.`,

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
    tips.push('Condition is Mint — this is the holy grail of pre-owned laptops. Frame it as virtually indistinguishable from new — "if I put this next to a brand-new one at Takealot, you genuinely could not tell the difference." Emphasise the MASSIVE saving vs retail. Use words like "showroom fresh", "flawless", "immaculate".');
  } else if (laptop.condition === 'Excellent') {
    tips.push('Condition is Excellent — frame as barely broken in, an incredible deal vs buying new. "This laptop has had such an easy life it barely knows what work is." Mention it looks and performs like new. Use "lekker" condition energy.');
  } else if (laptop.condition === 'Good') {
    tips.push('Condition is Good — frame as a reliable workhorse that has been well cared for. "Every feature works perfectly — this is the kind of laptop that makes you wonder why anyone pays full retail." Great value for a machine that delivers.');
  } else if (laptop.condition === 'Fair') {
    tips.push('Condition is Fair — be honest about normal wear signs but immediately redirect to value: "Yes, it has some cosmetic wear from being used — but here is the thing: it works FLAWLESSLY. Every port, every key, every feature." Priced fairly, it is a steal for someone who cares about function over flash.');
  } else if (laptop.condition === 'Poor') {
    tips.push('Condition is Poor — be fully transparent but frame as opportunity: "Ideal for budget buyers, students on a tight budget, or anyone who needs a functional machine without spending big. At this price, even a Fair condition unit would cost more." Honest, no surprises.');
  }

  if (laptop.purchasePrice && laptop.askingPrice && laptop.purchasePrice > 0) {
    const margin = laptop.askingPrice - laptop.purchasePrice;
    if (margin > 0) {
      tips.push(`Asking price includes a resale margin — frame the price as fair market value: "Priced to sell at a fair price — not the cheapest on the platform, but the best VALUE you will find at this spec level."`);
    } else {
      tips.push(`Asking price is BELOW the seller's purchase price — this is RED-HOT urgency fuel. Frame as "I'm taking a loss on this one, bru — my pain is your gain. Priced below what I paid. This is a now-now situation."`);
    }
  }

  if (laptop.repairs) {
    tips.push(`Repairs have been done — be TRANSPARENT about them but frame as TRUST-BUILDING: "Full disclosure — [repair details]. I would rather lose a buyer by being honest than keep one by hiding things. Professionally repaired, fully functional, and honestly? Better than most 'no repairs' laptops because you know exactly what you are getting."`);
  }

  if (laptop.notes) {
    const notes = laptop.notes.toLowerCase();
    if (notes.includes('fresh') || notes.includes('clean install') || notes.includes('factory reset')) {
      tips.push('Fresh OS install mentioned — frame as a MASSIVE trust signal: "Fresh Windows/macOS installed — no bloatware, no previous owner\'s files, no weird toolbars. This laptop is as clean as the day it left the factory. Switch on and start working, now now."');
    }
    if (notes.includes('warranty')) {
      tips.push('Warranty mentioned — this is GOLD. Frame as: "Still under warranty — buy with COMPLETE peace of mind. If anything goes wrong, you are covered. How many second-hand laptops come with that?"');
    }
    if (notes.includes('receipt') || notes.includes('proof of purchase')) {
      tips.push('Receipt/proof of purchase available — frame as: "Proof of purchase available — no funny business, you can verify everything. This is a legit sale from a legit seller."');
    }
    if (notes.includes('charger') || notes.includes('adapter')) {
      tips.push('Charger/adapter included — frame as money saved: "Original charger included — that is R600-R900 you do NOT have to spend extra. Just plug in and go."');
    }
    if (notes.includes('bag') || notes.includes('case')) {
      tips.push('Laptop bag/case included — frame as unexpected bonus: "Free laptop bag/case thrown in — bonus value you were not expecting. Your new laptop arrives ready to travel."');
    }
    if (notes.includes('delivery') || notes.includes('courier') || notes.includes('ship')) {
      tips.push('Delivery/courier available — frame as convenience: "Can arrange delivery/courier — no need to drive across town. I can get this to you, wherever you are."');
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
6. Write naturally — make it read like a PASSIONATE human seller wrote it, not a robot. Vary sentence length. Use short punchy lines mixed with descriptive ones.
7. Make the buyer FEEL something — excitement about the deal, urgency to act, trust in the seller. Boring ads do not sell laptops.

━━━ PLATFORM RULES ━━━
${platformGuide}

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON: { "title": "...", "body": "..." }
- title: The ad headline/title
- body: The FULL ad description text — must be LONG and DETAILED, following ALL platform rules above. Minimum 800 characters for Facebook/Gumtree/OLX, 400 characters for WhatsApp.
Do NOT include explanations, markdown code fences, or any text outside the JSON.`;
}

// ─── Fallback ad builder (uses ONLY provided data) ──────

/** Pick a random item from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a benefit note for a spec */
function fallbackSpecBenefit(label: string, value: string): string {
  const v = value.toLowerCase();
  if (label === 'Processor' || label === 'CPU') {
    if (v.includes('i9') || v.includes('ryzen 9')) return pick([
      'Absolute beast of a processor — handles 4K video editing, heavy rendering, and gaming without breaking a sweat',
      'Top-tier performance — the kind of power that makes everything else feel slow by comparison',
    ]);
    if (v.includes('i7') || v.includes('ryzen 7')) return pick([
      'Powerhouse performance — breeze through heavy workloads, code compilation, and multitasking',
      'Serious processing muscle — runs demanding apps and dozens of browser tabs without a stutter',
    ]);
    if (v.includes('i5') || v.includes('ryzen 5')) return pick([
      'Fast and responsive — handles everyday tasks, Zoom calls, and multitasking with ease',
      'The sweet spot of performance and value — fast enough for anything you throw at it',
    ]);
    if (v.includes('i3') || v.includes('ryzen 3')) return pick([
      'Reliable everyday performance — perfect for web, emails, office work, and Netflix',
      'Gets the job done without drama — solid performance for the essentials',
    ]);
    if (v.includes('celeron') || v.includes('pentium') || v.includes('n100')) return pick([
      'Budget-friendly processing — handles basic tasks, web browsing, and streaming just fine',
      'Great for the basics — emails, browsing, YouTube, and school work without any issues',
    ]);
    if (v.includes('m1') || v.includes('m2') || v.includes('m3')) return pick([
      'Apple Silicon power — incredible speed, all-day battery, and buttery smooth performance',
      'The magic of Apple Silicon — fast, efficient, and the battery lasts forever',
    ]);
    if (v.includes('m1 pro') || v.includes('m2 pro') || v.includes('m3 pro')) return pick([
      'Pro-level Apple Silicon — creative work, coding, and heavy tasks handled with ease',
      'Desktop-class performance in a laptop body — this chip is an absolute monster',
    ]);
    return 'Reliable processing power for smooth everyday performance';
  }
  if (label === 'Memory' || label === 'RAM') {
    if (v.includes('64')) return pick([
      'Massive memory — run virtual machines, heavy databases, and dozens of apps without even thinking about it',
      'Overkill for most, heaven for power users — nothing will slow this machine down',
    ]);
    if (v.includes('32')) return pick([
      'Plenty of headroom — run demanding apps, multiple VMs, and dozens of browser tabs without slowdown',
      'Future-proof memory — this much RAM means this laptop will stay fast for years',
    ]);
    if (v.includes('16')) return pick([
      'Multitask like an absolute boss — Chrome with 30 tabs, Spotify, Slack, and Excel all running smoothly',
      'The sweet spot — enough RAM to multitask freely without paying for more than you need',
    ]);
    if (v.includes('8')) return pick([
      'Solid multitasking — comfortably run multiple apps and browser tabs simultaneously',
      'Handles the essentials well — emails, browsing, streaming, and office apps all at once',
    ]);
    if (v.includes('4')) return pick([
      'Gets the basics done — web browsing, emails, and light apps without any fuss',
      'Enough for everyday tasks — fine for students and casual users on a budget',
    ]);
    return 'Smooth multitasking capability';
  }
  if (label === 'Storage') {
    if (v.includes('1tb') || v.includes('1024') || v.includes('1000')) return pick([
      'Tons of space — store all your files, photos, videos, and apps without worrying about running out',
      'A full terabyte — download movies, save projects, and never think about storage again',
    ]);
    if (v.includes('512') || v.includes('500')) return pick([
      'Generous fast storage — plenty of room for your files with lightning-fast access speeds',
      'The perfect balance — enough space for most people with NVMe speed to match',
    ]);
    if (v.includes('256')) return pick([
      'Fast SSD storage — boots in seconds and launches apps instantly, with enough space for daily use',
      'Snappy and responsive — the SSD makes everything feel fast, even with 256GB',
    ]);
    if (v.includes('128')) return pick([
      'Compact but fast — great for cloud-savvy users who store most files on Google Drive or OneDrive',
      'Enough for the essentials — apps, documents, and a good collection of photos',
    ]);
    if (v.includes('nvme') || v.includes('ssd')) return pick([
      'Lightning-fast storage — boots in seconds, apps launch instantly, file transfers are snappy',
      'SSD speed means no more waiting — everything happens NOW',
    ]);
    if (v.includes('hdd') || v.includes('hard')) return pick([
      'Spacious traditional storage — plenty of room for all your files, photos, and downloads',
      'Lots of space for the price — store everything without worrying about capacity',
    ]);
    return 'Fast and reliable storage';
  }
  if (label === 'Graphics' || label === 'GPU') {
    if (v.includes('rtx 40') || v.includes('rtx 30')) return pick([
      'Latest-gen dedicated graphics — crushes gaming at high settings and accelerates creative work',
      'Serious GPU power — game, render, and create without compromise',
    ]);
    if (v.includes('rtx')) return pick([
      'Dedicated RTX graphics — smooth gaming, fast rendering, and AI-accelerated workflows',
      'RTX power on the go — handles modern games and creative apps with ease',
    ]);
    if (v.includes('gtx')) return pick([
      'Dedicated GTX graphics — solid gaming performance and creative work acceleration',
      'GTX muscle — plays most games well and speeds up video editing',
    ]);
    if (v.includes('radeon')) return pick([
      'AMD Radeon graphics — great for gaming, creative work, and everyday tasks',
      'Solid AMD graphics performance — handles games and creative apps nicely',
    ]);
    if (v.includes('iris') || v.includes('uhd graphics') || v.includes('intel')) return pick([
      'Integrated Intel graphics — great for everyday tasks, streaming, and light creative work',
      'Handles everyday visuals perfectly — YouTube, presentations, and light photo editing',
    ]);
    return 'Integrated graphics — great for everyday tasks and streaming';
  }
  if (label === 'Display') {
    const size = parseFloat(v);
    if (v.includes('4k') || v.includes('uhd') || v.includes('3840')) return pick([
      'Stunning 4K display — razor-sharp detail, perfect for creative work and media consumption',
      'Ultra HD clarity — everything looks pin-sharp, from spreadsheets to movies',
    ]);
    if (v.includes('oled')) return pick([
      'OLED display — perfect blacks, vivid colours, and incredible contrast. Pure eye candy.',
      'OLED beauty — the screen literally glows. Movies, photos, and work all look incredible.',
    ]);
    if (v.includes('touch')) return pick([
      'Touchscreen display — tap, swipe, and interact naturally. Great for presentations and creative work',
      'Interactive touchscreen adds another dimension — sketch, scroll, and navigate with your fingers',
    ]);
    if (size >= 17) return pick([
      'Massive screen — a desktop replacement. Perfect for designers, coders, and anyone who needs maximum screen real estate',
      '17" of pure productivity — no external monitor needed, this IS your workstation',
    ]);
    if (size >= 15.6) return pick([
      'Large, comfortable screen — excellent for productivity, multitasking, and movie nights',
      'The classic 15.6" sweet spot — big enough to work comfortably, portable enough to carry',
    ]);
    if (size >= 14) return pick([
      'Great balance of portability and screen real estate — perfect for working on the go',
      '14" that punches above its weight — compact enough for your bag, big enough for real work',
    ]);
    if (size >= 13) return pick([
      'Compact and portable — slips into your bag easily, perfect for coffee shops and campus',
      '13" ultraportable — lightweight but still perfectly usable for work and study',
    ]);
    return pick([
      'Sharp, clear display — easy on the eyes during long work sessions',
      'Quality screen for work and entertainment',
    ]);
  }
  return '';
}

/** Generate target audiences */
function fallbackAudiences(cpu: string, ram: string, condition: string, price: number): string[] {
  const a: string[] = [];
  const c = cpu.toLowerCase();
  const r = ram.toLowerCase();

  // High-performance audiences
  if (c.includes('i7') || c.includes('i9') || c.includes('ryzen 7') || c.includes('ryzen 9') || r.includes('16') || r.includes('32')) {
    a.push(pick([
      'Developers and coders who need serious power for IDEs, Docker, and running multiple services',
      'Content creators — video editing on DaVinci Resolve, graphic design on Photoshop, music production',
      'Power users who refuse to compromise — this machine handles anything you throw at it',
    ]));
  }
  // Mid-range audiences
  if (c.includes('i5') || c.includes('ryzen 5') || r.includes('8')) {
    a.push(pick([
      'Working professionals running Teams, Excel, and a dozen browser tabs all day without lag',
      'University students who need a reliable workhorse for lectures, assignments, and late-night study sessions',
      'Side-hustlers and freelancers building their business after hours',
    ]));
  }
  // Budget audiences
  if (c.includes('i3') || c.includes('celeron') || c.includes('n100') || r.includes('4')) {
    a.push(pick([
      'School learners who need a solid laptop for homework, projects, and online research',
      'Anyone who needs a reliable machine for web browsing, streaming, and staying connected',
      'First-time laptop buyers or parents looking for an affordable option for their teenager',
    ]));
  }
  // Condition-based audiences
  if (condition === 'Mint' || condition === 'Excellent') {
    a.push(pick([
      'Smart buyers who want near-new quality without the brand-new price tag — why pay retail?',
      'Anyone who has walked into Takealot or Incredible Connection and walked out again because of the prices',
    ]));
  }
  // Price-based audiences
  if (price > 0 && price <= 3000) {
    a.push(pick([
      'Budget hunters who know a bargain when they see one — at this price, it will not last',
      'Students on a tight budget who still need something reliable for varsity',
    ]));
  }
  if (price > 0 && price <= 6000) {
    a.push(pick([
      'Anyone upgrading from an old, slow laptop — this will feel like a rocket ship by comparison',
    ]));
  }
  // Always add one creative audience
  a.push(pick([
    'Remote workers who want a dependable WFH setup without breaking the bank',
    'Parents looking for a dependable laptop for their kids without spending a fortune',
    'Anyone starting a new job or course who needs to get sorted quickly and affordably',
  ]));

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

  // Condition description builder with variety
  function conditionDesc(): string {
    switch (laptop.condition) {
      case 'Mint': return pick([
        'This laptop is in Mint condition — and I do not use that word lightly. Virtually indistinguishable from brand new. The keyboard feels crisp and responsive, the screen is absolutely flawless, and the chassis looks like it just came out the box. No scuffs, no dents, no wear marks. You are genuinely getting a new laptop at a fraction of the retail price. If I put this next to a sealed unit at Takealot, you would not be able to tell the difference.',
        'Mint condition — showroom fresh, bru. This laptop has had such an easy life it barely knows what work is. Not a scratch, not a mark, not a single sign of use. The screen is pristine, the keyboard feels factory-fresh, and the chassis gleams. Honestly, if you told someone this was brand new, they would believe you. At this price compared to retail? It is an absolute steal.',
      ]);
      case 'Excellent': return pick([
        'In Excellent condition — barely broken in and lovingly looked after. The screen is bright and crystal-clear, the keyboard and trackpad feel fresh, and the body has only the tiniest signs of use. This laptop looks and performs like new in every meaningful way. The kind of machine that makes you wonder why anyone would pay full retail when deals like this exist.',
        'Excellent condition — this ${name} has been treated like a treasure. Opens and closes perfectly, the screen pops with colour, and the battery still has plenty of life. You would struggle to tell this apart from a brand-new unit at a shop. Save yourself thousands and get a laptop that feels exactly the same.',
      ]);
      case 'Good': return pick([
        'In Good condition — well cared for with only the normal, minor signs of everyday use that you would expect from a laptop that has actually been used (not a display unit). Everything works exactly as it should: all ports respond, the screen is clear, the keyboard types perfectly, and the battery charges properly. A reliable machine that will serve you well for years to come.',
        'Good condition — this laptop has been used and loved, and it shows in all the right ways. The chassis might have a light mark or two, but functionally it is absolutely spot on. Every key works, every port responds, and the screen is clean. Priced honestly for its condition — this is real value, not marketing fluff.',
      ]);
      case 'Fair': return pick([
        'In Fair condition — you will notice some cosmetic wear from regular use, but make no mistake: this laptop is fully functional and mechanically sound. Every feature works correctly, every key types, every port connects. It is priced fairly to reflect the cosmetic wear, which means you are getting a working machine at an absolute bargain. Perfect for someone who cares about performance, not a shiny lid.',
        'Fair condition — honest wear on the outside, but still going strong where it counts. All ports work, the screen is clear, and it runs without any issues. If you do not mind a few cosmetic marks — and at this price, why would you? — this is a lekker deal that will not let you down.',
      ]);
      case 'Poor': return pick([
        'In Poor condition — shows significant wear but still works. Ideal for budget buyers, students who need a machine for basics, or anyone who needs a functional laptop without spending big. Priced for a quick sale — at this price point, it is about function, not fashion.',
        'Fair warning — this laptop has been through the wars cosmetically, but it still powers up and gets the job done. Great for parts, a learner machine, or anyone who just needs something cheap and cheerful. Priced to reflect the condition honestly.',
      ]);
      default: return `Condition: ${laptop.condition}`;
    }
  }

  // Battery description with SA flavour
  function batteryDesc(): string {
    const bh = laptop.batteryHealth.toLowerCase();
    if (bh.includes('excellent')) return pick([
      'Battery health is Excellent — you can expect all-day battery life for normal use. Work through back-to-back meetings, study at the library, or browse at your favourite coffee shop for hours without hunting for a plug point. No loadshedding anxiety here, bru.',
      'Battery is in excellent shape — genuinely impressive for a pre-owned machine. Easily lasts a full work day away from the charger. That is the kind of thing that matters when you are working from a cafe or sitting through a long lecture.',
    ]);
    if (bh.includes('good')) return pick([
      'Battery health is Good — still holds a solid charge for several hours of continuous use. Perfectly fine for working away from your desk, sitting in a lecture hall, or catching up on emails at the airport. Not all-day, but definitely all-morning.',
      'Good battery — charges up properly and lasts a solid few hours. Fine for normal daily use. Plug it in at your desk, unplug when you need to move around, and you are sorted.',
    ]);
    if (bh.includes('fair')) return pick([
      'Battery health is Fair — holds enough charge for a couple of hours of portable use. Great for desk work with the occasional move to the couch. If you work plugged in most of the time anyway, this will not be an issue at all.',
      'Fair battery life — enough for light portable use. Keep the charger handy and you will be fine. At this price point, it is still an absolute win.',
    ]);
    return `Battery: ${laptop.batteryHealth}`;
  }

  // Trust signals from notes — more engaging
  function trustSignals(): string[] {
    const signals: string[] = [];
    if (laptop.notes) {
      const n = laptop.notes.toLowerCase();
      if (n.includes('fresh') || n.includes('clean install') || n.includes('factory reset'))
        signals.push(pick([
          'Fresh OS installed — no bloatware, no nonsense, just clean and fast from day one',
          'Fresh Windows/macOS install — this laptop is as clean as the day it left the factory',
        ]));
      if (n.includes('warranty'))
        signals.push(pick([
          'Still under warranty — buy with complete peace of mind',
          'Warranty active — if anything goes wrong, you are covered. How many second-hand laptops offer that?',
        ]));
      if (n.includes('receipt') || n.includes('proof'))
        signals.push(pick([
          'Proof of purchase / receipt available — no funny business, fully legit sale',
          'Receipt on hand — verify everything, ask questions, I have nothing to hide',
        ]));
      if (n.includes('charger') || n.includes('adapter'))
        signals.push(pick([
          'Original charger included — save yourself R600-R900 at the shop. Just plug in and go',
          'Comes with the original charger — one less thing to buy, ready to use from minute one',
        ]));
      if (n.includes('bag') || n.includes('case'))
        signals.push(pick([
          'Free laptop bag / case included — bonus value you were not expecting',
          'Laptop bag thrown in for free — your new machine arrives ready to travel',
        ]));
      if (n.includes('delivery') || n.includes('courier'))
        signals.push(pick([
          'Can arrange delivery / courier — no need to drive across town, I can get it to you',
          'Nationwide delivery available — if you are not in the area, we can still make this work',
        ]));
    }
    if (laptop.condition === 'Mint' || laptop.condition === 'Excellent')
      signals.push(pick([
        `${laptop.condition} condition — walk into any shop and try to find this quality at this price. You will not.`,
        `${laptop.condition} condition — a genuine saving compared to buying brand new. This is smart shopping, bru.`,
      ]));
    if (!laptop.repairs)
      signals.push(pick([
        'No repairs needed — 100% original and fully functional',
        'Never been repaired — everything is original and works exactly as the manufacturer intended',
      ]));
    return signals;
  }

  const stockRef = laptop.stockId ? `#${laptop.stockId} ` : '';
  const stockRefBody = laptop.stockId ? `#${laptop.stockId}` : '';
  const signals = trustSignals();

  // ─── WHATSAPP ───
  if (platform === "whatsapp") {
    const title = `${stockRef}${name} - ${priceStr}`;
    const hookOptions = [
      `Looking for a ${name} that doesn't cost an arm and a leg? This is it, bru.`,
      `Stop scrolling. This ${name} in ${laptop.condition} condition is priced to MOVE.`,
      `I'm about to save someone a LOT of money right now. ${name}, ${laptop.condition} condition.`,
      `Why pay R15k+ at Takealot when THIS ${name} exists at a fraction of the price?`,
      `Need a solid laptop without breaking the bank? This ${name} is the answer.`,
    ];
    if (laptop.condition === 'Mint') hookOptions.push(`Found a unicorn — a ${name} that looks brand new but costs nowhere near it. Mint condition.`);
    if (isBelowCost) hookOptions.push(`Priced BELOW cost — this ${name} is an absolute steal and needs to go NOW! My loss, your gain.`);
    const hook = pick(hookOptions);

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
      `*Message me NOW — this will not last long!* 🚀`,
    ].filter(Boolean).join('\n');
    return { platform, title, body: body.substring(0, 1000), price: laptop.askingPrice };
  }

  // ─── FACEBOOK ───
  if (platform === "facebook") {
    const title = `${stockRef}${name} - ${laptop.condition} - ${priceStr}`;

    const hookOptions = [
      `Why pay full retail when this ${name} looks and feels absolutely brand new?`,
      `This ${name} is priced BELOW what I paid — my loss is your gain, bru!`,
      `Barely used, fully loaded, and priced to sell — this ${name} will not hang around.`,
      `I checked Takealot yesterday. Same specs? R${Math.round(laptop.askingPrice * 1.8).toLocaleString()}. This one? A fraction of that.`,
      `Stop scrolling. If you need a reliable laptop, THIS is the deal you have been waiting for.`,
      `My wallet is crying but your wallet is about to be very happy. ${name}, ${laptop.condition} condition.`,
    ];
    if (laptop.condition === 'Mint') hookOptions.push(`Just look at this ${name}. Mint condition. Still has that new-laptop smell (basically). At THIS price? It is almost unfair.`);
    if (laptop.condition === 'Good') hookOptions.push(`A solid, reliable ${name} at a fair price — exactly the kind of laptop that gets shared in family WhatsApp groups with "guys look at this deal".`);
    const hook = pick(hookOptions);

    const introOptions = [
      `This is one of those rare finds — a laptop in absolutely stunning condition that has been meticulously looked after. Whether you are a student heading to varsity, a professional working from home, or just someone who needs a reliable machine without spending thousands more at a shop, this ${name} ticks every box.`,
      `This ${name} has been barely used and it shows. Everything feels fresh — from the crisp keyboard to the bright, clear screen. It is the kind of laptop that makes you wonder why anyone would pay full retail when deals like this exist right here on Marketplace.`,
      `If you have been browsing laptop ads for the past week (we all do it), save yourself the time. This ${name} is the one. Well looked after, fully functional, and priced to sell. The kind of listing you bookmark and then panic-check to see if it is still available.`,
    ];
    if (laptop.condition === 'Mint') introOptions.push(`Honestly, I feel weird selling this for this price. It is in MINT condition — the screen has zero dead pixels, the keyboard has that satisfying click, and the chassis does not have a single mark. Someone is going to get an incredible deal here.`);
    const intro = pick(introOptions);

    const body = [
      `${stockRefBody} 💻🔥 ${hook} 🔥💻`,
      ``,
      intro,
      ``,
      conditionDesc(),
      ``,
      batteryDesc(),
      laptop.repairs ? `\n🔧 *Repairs:* ${laptop.repairs} — Full disclosure, because that is how I do things. Professionally repaired and fully functional. I would rather lose a sale than mislead a buyer.` : '',
      ``,
      `⚡ *Specs That Impress:*`,
      ...specsWithBenefits,
      ``,
      userFeatures.length > 0
        ? [`🧰 *Features & Connectivity:*`, ...userFeatures.map(f => `  • ${f}`), ''].join('\n')
        : '',
      `💡 *Why This Laptop?*`,
      isBelowCost
        ? pick([
            `  Priced BELOW cost — this is a genuine bargain. I need it gone, so you win. You will not find this spec at this price anywhere else. Rather grab this and spend the difference on something fun.`,
            `  I am literally selling this for less than what I paid. My loss, your gain. Deals like this come around once in a blue moon, bru.`,
          ])
        : pick([
            `  At ${priceStr}, this ${laptop.condition}-condition ${name} represents outstanding value for money. Walk into any shop and try to find similar specs — you will pay significantly more brand new. Keep the difference and treat yourself.`,
            `  Compare this to retail prices: same specs brand new? Easily R${Math.round(laptop.askingPrice * 1.5).toLocaleString()} to R${Math.round(laptop.askingPrice * 2).toLocaleString()}. At ${priceStr}, you are getting a machine that does exactly the same thing for a fraction of the cost. That is smart shopping.`,
          ]),
      specs.length >= 3
        ? `  With specs like ${specs[0].value} and ${specs[1].value}, this machine handles everyday tasks with ease and then some.`
        : '',
      `  The ${laptop.condition} condition means you are getting a laptop that works flawlessly without the brand-new price tag. Win-win.`,
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
      `🚨 *Do not be the person who sees this tomorrow and finds it is already gone. Message me NOW — I respond fast and I am flexible on meeting times!*`,
    ].filter(Boolean).join('\n');
    return { platform, title, body, price: laptop.askingPrice };
  }

  // ─── GUMTREE ───
  if (platform === "gumtree") {
    const stockRefTitle = laptop.stockId ? ` - Ref: ${laptop.stockId}` : '';
    const title = `${name}${stockRefTitle} - ${laptop.condition} - ${priceStr}`;

    const openerOptions = [
      `If you are reading this, you are in the right place — this ${name} is the deal everyone has been looking for.`,
      `Stop browsing. I know what you are thinking — "just another laptop ad." But trust me, this one is different.`,
      `FOR SALE: ${name} — and before you scroll past, check the price. Then check the condition. Now message me.`,
    ];
    const opener = pick(openerOptions);

    const body = [
      `${opener}`,
      ``,
      conditionDesc(),
      ``,
      batteryDesc(),
      laptop.repairs ? `\nRepairs: ${laptop.repairs} — I believe in full transparency. The laptop has been professionally repaired and is fully functional. I would rather lose a buyer by being honest than keep one by hiding things.` : '',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Full Specifications:',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      specs.map((s, i) => {
        const b = fallbackSpecBenefit(s.label, s.value);
        return `  ${i + 1}. ${s.label}: ${s.value}${b ? ` — ${b}` : ''}`;
      }).join('\n'),
      '',
      userFeatures.length > 0
        ? ['Features & Connectivity:', ...userFeatures.map(f => `  • ${f}`), ''].join('\n')
        : '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Who Is This Laptop Perfect For?',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ...audiences.map(a => `  • ${a}`),
      '',
      'Why Buy From Me?',
      `  I am an honest, straightforward seller — what you see is what you get. The condition is 100% accurately described and I am happy to answer any questions. I can arrange a viewing at your convenience and you are welcome to test everything before committing. Take your time, no rush.`,
      ...signals.map(s => `  ✔ ${s}`),
      ``,
      laptop.notes ? `Seller Notes: ${laptop.notes}` : '',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Price & Contact:',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `Asking Price: ${priceStr}${isBelowCost ? ' — PRICED BELOW COST, URGENT SALE!' : ''}`,
      location ? `Location: ${location}` : null,
      whatsapp ? `WhatsApp: ${whatsapp}` : null,
      ``,
      `WhatsApp me to arrange a viewing — I respond quickly and I am flexible on meeting times. First come, first served. Serious buyers only please — no time wasters, no "is this still available" messages. If this ad is up, it is available.`,
    ].filter(Boolean).join('\n');
    return { platform, title, body, price: laptop.askingPrice };
  }

  // ─── OLX ───
  const stockRefTitle = laptop.stockId ? ` - Ref: ${laptop.stockId}` : '';
  const title = `${name}${stockRefTitle} — ${priceStr}`;

  const olxHookOptions = [
    `This is one of those ads you bookmark and come back to — except by then it will be gone.`,
    `Stop what you are doing and read this. I am about to save you thousands.`,
    `Forget browsing. THIS is the laptop you have been looking for at a price that does not make sense.`,
    `Do not pay retail — this ${name} in ${laptop.condition} condition is a fraction of the new price. A rare find.`,
  ];
  if (isBelowCost) olxHookOptions.push(`Priced BELOW cost! This ${name} is an absolute steal — my loss is your gain. Someone is going to get very lucky today.`);
  const olxHook = pick(olxHookOptions);

  const body = [
    `📌 ${olxHook}`,
    ``,
    `This ${name} has been well looked after and is ready for its next owner. ${laptop.condition === 'Mint' || laptop.condition === 'Excellent' ? 'You would genuinely struggle to tell it apart from a brand-new unit at a shop. Walk into Incredible Connection, check the price, then come back here and buy this one instead.' : 'It works flawlessly, looks great, and has been fully tested to ensure everything is in working order. No nasty surprises.'}`,
    ``,
    `🖥️ *Full Specifications:*`,
    ...specsWithBenefits,
    ``,
    `🔋 *Battery & Condition:*`,
    `  Condition: ${laptop.condition}`,
    `  Battery: ${laptop.batteryHealth}`,
    `  ${batteryDesc().charAt(0).toLowerCase() + batteryDesc().slice(1)}`,
    laptop.repairs ? `\n  Repairs: ${laptop.repairs} — professionally repaired and fully functional. Full transparency, no surprises.` : '',
    ``,
    `💡 *Why This Is a Great Deal:*`,
    isBelowCost
      ? `  This laptop is priced BELOW what I paid for it. I need a quick sale, so you get a genuine bargain. At this price, it will not last long. Seriously, if you are reading this, message me now — someone else probably is too.`
      : `  At ${priceStr}, this ${laptop.condition}-condition ${name} offers outstanding value. Walk into any retailer and you will pay significantly more for the same specs brand new. Keep the difference and put it towards something that actually matters — like a weekend away, bru.`,
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
    `Message me NOW for more photos, a video walkthrough, or to arrange a viewing. I reply fast — usually within minutes. No chancers please, serious buyers only. If this ad is up, it is still available — do not ask, just come see it.`,
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

const SYSTEM_PROMPT = `You are "The Honest Hustler" — South Africa's most exciting and trusted marketplace ad writer. Your listings get shared in WhatsApp family groups, saved to bookmarks, and sell within HOURS. You write ads that make people STOP SCROLLING, FEEL SOMETHING, and START MESSAGING.

YOUR #1 RULE: USE ONLY PROVIDED DATA
- ONLY include specifications explicitly listed in the laptop details.
- If a spec says "Not specified", DO NOT include it and DO NOT guess what it might be.
- DO NOT guess, infer, or add ANY ports, features, or specifications not listed.
- If no Features/Ports are provided, skip that section entirely. Do NOT invent features.

YOUR COPYWRITING PERSONA — "The Honest Hustler":
You are the friend everyone sends to "go look at the laptop before I buy" because you tell it straight AND make it sound like an absolute steal. You're the mate who texts the group chat: "guys I found a DEAL."

PERSONALITY RULES:
- ENTHUSIASTIC but NEVER dishonest. If it's Mint, say "showroom fresh, bru — not a single mark." If it's Fair, say "honest wear, but at this price it's a gem" — you don't hide it, you FRAME it.
- Every section must be SUBSTANTIAL (2-4 lines minimum, most 3-4 lines)
- Vary your sentence length constantly: short punchy zingers. Then a longer, flowing descriptive line. Then another zinger. This rhythm keeps people READING.
- POWER WORDS that trigger emotion: "steal", "gem", "rare find", "won't last", "snag", "score", "absolute bargain", "unicorn", "lekker deal", "criminally underpriced"
- Create REAL URGENCY and FOMO — not fake, but GENUINE: "Two people have asked about this today", "I'm pricing this to sell fast because I need it gone", "If you're reading this and it's still available, grab it NOW before the next person does"
- Describe the PHYSICAL EXPERIENCE vividly: "keyboard has that satisfying tactile click", "screen pops with colour even in sunlight", "chassis has that premium aluminium weight", "lid opens smoothly with no wobble"
- Frame the price as a SMART FINANCIAL MOVE: "Why drop R20k at Takealot when this does the SAME job?", "Save enough for a weekend away at the coast", "Keep the difference and buy yourself something fun, bru"
- Add SA flavour naturally and SPARINGLY — not every sentence: "bru", "ja", "lekker", "now now", "just now", "ag man", "eish", "sis". Use them where they FEEL natural, not forced. One or two per ad is perfect.
- Use SA spelling: colour, programme, organise, centre, metre
- Reference SA culture when it fits: loadshedding ("No loadshedding anxiety with this battery life, bru"), braai culture ("Save enough for a few months of weekend braais"), Varsity life ("Perfect for surviving those long UCT lecture days"), Cape Town vs Joburg ("Whether you're coding in a Sandton office or writing essays at a Kloof Street coffee shop")
- Reference SA retailers for price comparisons: Takealot, Incredible Connection, Makro, Matrix Warehouse, Evetech, Wootware
- Write like you're explaining to a mate why this deal is too good to pass up — passionate, a bit loud, 100% honest

YOUR COPYWRITING STRUCTURE (MANDATORY):
1. 🔥 HOOK — First line MUST stop the scroll. CHOOSE A DIFFERENT STYLE EACH TIME from these:
   - Provocative question: "Why would anyone pay R25k for this when this one exists at a fraction?"
   - Bold value claim: "Let me save you R10k right now. No, seriously."
   - Lifestyle angle: "Your productivity is about to level up — and your wallet won't even notice."
   - FOMO trigger: "One of the best deals I've listed this month — and I list a LOT."
   - Story opener: "Walked into Incredible Connection yesterday. Same specs for R18k. Walked out. Came home. Listed this."
   - Humour: "My bank account is crying but yours is about to be very happy."
   - Direct challenge: "I dare you to find this spec at this condition for this price anywhere else."
   - SA culture: "Stop scrolling and start saving — this deal is more lekker than a Saturday braai."

2. INTRODUCTION — 3-4 vivid lines. PAINT A PICTURE of the buyer using this laptop. Make them FEEL like they already own it. Use sensory language. "Imagine opening this at your favourite coffee shop..." or "Picture yourself in your home office, powering through your to-do list on this..."

3. CONDITION & BATTERY — 2-3 descriptive, HONEST lines. Be real about condition but frame it positively. Add physical details: "keyboard feels buttery smooth", "hinge is still tight with zero wobble", "no dead pixels on a screen that still pops with colour". For battery, describe real-life impact: "get through a full day of lectures without hunting for a plug point".

4. ⚡ SPECS THAT IMPRESS — Full list where EACH spec has a SPECIFIC, EXCITING, RELATABLE benefit. Not generic — SPECIFIC to what the buyer actually does:
   - "16GB DDR4" → "Run 30+ Chrome tabs, Spotify, Slack, AND Excel all at once without a stutter"
   - "512GB NVMe SSD" → "Boot up in under 15 seconds. Apps launch before you've finished your coffee"
   - "Intel Core i7" → "Power through code compilation, video editing, and heavy multitasking without breaking a sweat"

5. 💡 WHY THIS LAPTOP? — 3-4 persuasive lines. This is your CLOSE. Compare to RETAIL PRICES at Takealot, Incredible Connection, Makro. Frame as a SMART FINANCIAL MOVE. Add personality: "That saving? That's a weekend away. That's a few months of groceries. That's just smart shopping, bru."

6. 🎯 PERFECT FOR — 3-4 SPECIFIC audiences with EMOTIONAL HOOKS. Not generic "students" — give them a story:
   - "Matric students heading to varsity next year — get sorted NOW before the January rush"
   - "Side-hustlers and freelancers building something after hours — this is your office"
   - "Working parents who need a reliable machine for the home office"
   - "Anyone who is tired of their ancient laptop crashing during Zoom calls"

7. ✅ TRUST SIGNALS — 2-4 points. Be SPECIFIC about what each signal MEANS:
   - "Fresh Windows 11 installed — no bloatware, no previous owner's files, clean as a whistle"
   - "Original charger included — save yourself R800 at the shop"
   - "Still under warranty — that's peace of mind you don't get with most second-hand laptops"

8. 📍 Location & 💵 Price & 📲 WhatsApp — MANDATORY IN EVERY AD:
You MUST include these three lines at the bottom of EVERY ad body:
- 📍 Location: [use the provided location — NEVER skip]
- 💵 Price: R X,XXX
- 📲 WhatsApp: [use the provided WhatsApp number — NEVER skip]
If location is "Not specified", use "Collection available — contact for details".
If WhatsApp is "Not provided", use "Message me for details".

9. 🚨 CTA — Urgent, action-oriented, 2 lines. Create REAL FOMO:
   - "Don't be the person who sees this tomorrow and finds it's already gone."
   - "I respond fast. Don't sleep on this one — someone else is reading this right now."
   - "Message me NOW and let's get this sorted before someone else grabs it."

MINIMUM LENGTHS (STRICT):
- Facebook/Gumtree/OLX body: 1500+ characters MINIMUM
- WhatsApp body: 600+ characters MINIMUM

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
