import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import type { CreateChatCompletionBody } from 'z-ai-web-dev-sdk';

// ─── Detailed platform-specific instructions ─────────────

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  whatsapp: `WhatsApp Broadcast / Status ad rules:
- STRICT 500-character limit for the entire message (title + body combined)
- Use WhatsApp formatting: *bold* for emphasis, _italic_ for subtitles
- Open with an attention-grabbing hook — lead with the BIGGEST selling point (price, condition, or performance)
- Only list the TOP 3 specs that matter most for THIS specific laptop — skip irrelevant ones
- Include a clear price line: *Price: R X,XXX*
- Add one compelling REASON to buy NOW (scarcity, price vs retail, demand)
- Close with ONE urgent CTA: "DM now — won't last long!" or "First come, first served."
- Use 2-3 emojis maximum, placed strategically at line starts (not randomly scattered)
- NO long paragraphs — every line must earn its space
- NEVER use generic phrases like "great laptop" or "good condition" without backing them up
- Tone: energetic but honest, like a friend who found an amazing deal`,

  facebook: `Facebook Marketplace ad rules:
- Write a FULL, RICH marketplace listing (300-600 words)
- TITLE: Must be descriptive and searchable — include brand, model, key spec, AND price. This is the most important line for search visibility.
- OPENING HOOK: Start with the most compelling selling point. Frame it as a BENEFIT, not just a fact. "Save R8,000 vs buying new" is better than "i7 processor included."
- STRUCTURE with clear sections using emoji headers:
  📋 Full Specifications (detailed bullet list — include EVERY spec, buyers compare obsessively)
  ✅ Condition & Battery Health (be specific — "95% battery", not just "good battery")
  💡 Why This Is a Great Deal (2-3 compelling reasons tied directly to the specs and price)
  🎯 Perfect For (name 2-3 specific use cases with realistic scenarios: "running VS Code and 20 browser tabs", not just "programming")
  📦 What's Included (charger, bag, box, mouse, any extras)
- Mention ANY upgrades: RAM upgrade, SSD upgrade, fresh Windows install, new battery
- Add TRUST SIGNALS that South African buyers care about: "Well looked after", "Smoke-free home", "Receipt available", "Reason for selling: upgrading"
- Include COMPETITIVE CONTEXT: "Priced R3,000 below similar listings" or "Similar specs retail for R18,000+"
- CLOSE with: urgency + clear CTA + delivery/collection info + response time expectation
- Tone: friendly, trustworthy, enthusiastic — like a proud owner who took great care of their laptop
- Use line breaks generously for readability on mobile
- NEVER use clickbait or misleading claims — SA Facebook buyers are savvy and will call out fakes`,

  gumtree: `Gumtree South Africa classified ad rules:
- Write a TRADITIONAL classified ad with clear, professional structure
- TITLE: Brand + Model + Condition + Price (e.g., "Dell XPS 15 - Excellent - R12,500") — this is the search hook
- OPENING: "FOR SALE:" followed by laptop name and a ONE-SENTENCE summary of its strongest selling point
- SPECIFICATIONS: Use a clean numbered or bulleted list — every spec on its own line, include all available specs
- CONDITION section: Be thorough and HONEST — describe condition specifically, mention any wear, scratches, or issues UPFRONT. Gumtree buyers reject vague descriptions.
- INCLUDE: What's in the box, original charger, bag, mouse, any accessories. Missing items must be noted.
- SELLER NOTES: If notes are provided, weave them naturally into the description — they often contain key selling info
- VALUE JUSTIFICATION: Briefly explain why the price is fair — compare to retail or mention what similar models go for
- PRICE: State clearly on its own line. Mention if negotiable or firm.
- CTA: Professional closing — "Contact to arrange a viewing", "Call or WhatsApp on [number]", include preferred contact method
- Tone: Direct, honest, no-nonsense but polite — Gumtree SA buyers are practical and value straightforward communication
- Avoid excessive emojis — keep it professional (max 3-4 total)
- NEVER: overstate condition, hide defects, use all caps for the entire ad, or include unrelated keywords`,

  olx: `OLX South Africa listing rules:
- TITLE must ALWAYS include the price in this exact format: "Brand Model — R X,XXX"
- Example: "HP ProBook 450 G9 — R8,500" or "MacBook Air M2 — R18,999"
- Write a WELL-STRUCTURED listing with clear headings:
  📌 Quick Summary (2-3 lines that make the buyer WANT to read more — lead with the deal factor)
  🖥️ Full Specifications (all specs listed in a clean format)
  🔋 Battery & Condition (specific details, not vague descriptions)
  💰 Price & Value (justify the price — mention retail comparison, savings amount, or why it's worth it)
  📦 What's Included (list everything — charger, bag, peripherals, original box)
- Highlight 2-3 KEY SELLING POINTS that differentiate this laptop from other OLX listings
- MENTION if the laptop is: freshly serviced, updated to latest OS, has remaining warranty, comes with accessories, or was recently upgraded
- Include DELIVERY info: "Can courier nationwide at buyer's cost" or "Collection in [area]"
- END with: "Message me on OLX for fastest response" or similar OLX-specific CTA
- Tone: Professional marketplace seller — confident, informative, and responsive
- Keep paragraphs SHORT (2-3 sentences max) for mobile readability
- NEVER: use ALL CAPS, spam keywords, or include unrelated item descriptions`,
};

// ─── Context-aware value proposition builder ─────────────

function buildValueContext(laptop: {
  condition: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  screenSize: string;
  askingPrice: number;
  purchasePrice: number;
  batteryHealth: string;
  notes: string;
  year: number;
  repairs: string;
}): string {
  const tips: string[] = [];
  const specs = `${laptop.cpu} ${laptop.ram} ${laptop.gpu} ${laptop.storage} ${laptop.screenSize}`.toLowerCase();

  // ─── Condition-based selling angles ─────────────────
  if (laptop.condition === 'Mint') {
    tips.push('This laptop is in MINT condition — essentially indistinguishable from brand new. Emphasize this as the key differentiator: buyer gets a new laptop experience at a significant discount. Mention no scratches, no dents, original packaging if applicable.');
  } else if (laptop.condition === 'Excellent') {
    tips.push('Excellent condition with minimal signs of use. Frame as: Barely broken in — someone is going to get an incredible deal compared to buying this new. Highlight specific features that show careful ownership.');
  } else if (laptop.condition === 'Good') {
    tips.push('Good condition with normal signs of daily use — honesty builds trust. Frame as: Well-maintained by a careful owner. Every feature works perfectly. You are paying for the specs, not the looks.');
  } else if (laptop.condition === 'Fair') {
    tips.push('Fair condition with visible wear — honesty is your strongest selling tool here. Acknowledge wear openly, then redirect to value: Cosmetic wear aside, everything works exactly as it should. At this price, the specs speak for themselves.');
  } else if (laptop.condition === 'Poor') {
    tips.push('Poor condition — be fully transparent. Frame honestly as ideal for: parts harvesting, DIY repair project, budget buyers who need basic functionality. List EVERY working component.');
  }

  // ─── Pricing psychology ────────────────────────────────
  if (laptop.purchasePrice && laptop.askingPrice && laptop.purchasePrice > 0) {
    const margin = laptop.askingPrice - laptop.purchasePrice;
    if (margin > 0) {
      tips.push(`Seller purchased for R${laptop.purchasePrice.toLocaleString()} and is asking R${laptop.askingPrice.toLocaleString()} — this is a resale with a margin, NOT a desperate sale. Frame the price as fair and firm.`);
    } else {
      tips.push(`Seller is asking LESS than what they paid (R${laptop.purchasePrice.toLocaleString()}). This is NOT a sign of problems — could be a quick sale, upgrade, or relocation. Frame as: Priced to sell quickly — my loss is your gain.`);
    }
  }
  if (laptop.askingPrice < 5000) {
    tips.push('Under R5,000 — budget-friendly. Emphasize: Perfect entry-level laptop or More laptop than you would expect at this price.');
  } else if (laptop.askingPrice < 10000) {
    tips.push('R5,000-R10,000 range — the sweet spot for value seekers. Compare implicitly to what R10,000 gets brand new.');
  } else if (laptop.askingPrice < 20000) {
    tips.push('R10,000-R20,000 — buyers expect solid performance. Emphasize premium specs, professional capability, and savings vs retail pricing.');
  } else {
    tips.push('R20,000+ — premium pricing. Buyers compare against new laptops with warranties. JUSTIFY the value: better specs than new at this price, or near-new condition at a deep discount.');
  }

  // ─── CPU & performance angles ──────────────────────────
  if (specs.includes('i9') || specs.includes('ryzen 9')) {
    tips.push('FLAGSHIP CPU — top-tier performance. Ideal for: heavy video editing, 3D rendering, software development, data science, running multiple VMs.');
  } else if (specs.includes('i7') || specs.includes('ryzen 7')) {
    tips.push('High-performance CPU — ideal for professionals, developers, content creators, and power users. Handles demanding workloads without breaking a sweat.');
  } else if (specs.includes('i5') || specs.includes('ryzen 5')) {
    tips.push('Mid-range powerhouse — the sweet spot between performance and value. Fast enough for serious work, affordable enough to be a smart buy.');
  } else if (specs.includes('i3') || specs.includes('celeron') || specs.includes('pentium')) {
    tips.push('Budget-friendly CPU — perfect for students, school work, office productivity, web browsing, Netflix, and video calls. Not a gaming machine, but incredibly reliable for everyday tasks.');
  }

  // ─── Apple Silicon ─────────────────────────────────────
  if (specs.includes('m1') || specs.includes('m2') || specs.includes('m3') || specs.includes('m4')) {
    tips.push('Apple Silicon chip — MAJOR selling point. Emphasize: All-day battery life, instant wake, dead silent operation, and performance that rivals laptops costing twice as much. Apple Silicon MacBooks hold value extremely well and are in HIGH demand on SA marketplaces.');
  }

  // ─── GPU angles ────────────────────────────────────────
  if (specs.includes('rtx 40') || specs.includes('rtx 30')) {
    tips.push('Modern RTX GPU (30/40 series) — EXCELLENT for gaming and creative work. Plays modern games at high settings and enables GPU-accelerated video editing and AI work. In HIGH demand and significantly increases value.');
  } else if (specs.includes('rtx') || specs.includes('gtx')) {
    tips.push('Dedicated NVIDIA GPU — capable of gaming, video editing, and 3D work.');
  } else if (specs.includes('radeon') || specs.includes('rx')) {
    tips.push('Dedicated AMD Radeon GPU — good for gaming and creative applications. Excellent value.');
  }

  // ─── RAM angles ────────────────────────────────────────
  if (specs.includes('32gb') || specs.includes('64gb')) {
    tips.push('Professional-grade RAM (32GB+) — run multiple VMs, massive datasets, or dozens of browser tabs without slowdown. Most laptops in this price range only have 16GB.');
  } else if (specs.includes('16gb')) {
    tips.push('16GB RAM — the current standard for comfortable multitasking. No upgrade needed — future-proof for years of use.');
  } else if (specs.includes('8gb')) {
    tips.push('8GB RAM — adequate for everyday use. Handles daily tasks smoothly. Mention if upgradeable.');
  } else if (specs.includes('4gb')) {
    tips.push('4GB RAM — basic but functional. Suitable for: browsing, documents, email, streaming. NOT for multitasking or demanding software.');
  }

  // ─── Storage angles ────────────────────────────────────
  if (specs.includes('2tb') || specs.includes('1tb')) {
    tips.push('Large storage — no need to worry about storage for years. Room for all files, apps, games, photos, and videos.');
  } else if (specs.includes('512gb') || specs.includes('512 gb')) {
    tips.push('512GB SSD — good capacity for most users. Emphasize fast SSD speeds, not just capacity.');
  } else if (specs.includes('256gb') || specs.includes('128gb')) {
    tips.push('Smaller SSD — still infinitely faster than any HDD. Mention cloud storage or SD card slot as expansion options if available.');
  }

  // ─── Screen & display angles ───────────────────────────
  if (specs.includes('4k') || specs.includes('uhd')) {
    tips.push('4K/UHD display — premium screen for creative professionals and media lovers. Stunning visuals for photo editing, video editing, and media.');
  } else if (specs.includes('oled')) {
    tips.push('OLED display — PREMIUM feature. Perfect blacks, vibrant colours, incredible contrast. Better than any LCD screen. Significantly increases value.');
  } else if (specs.includes('touch') || specs.includes('touchscreen')) {
    tips.push('Touchscreen — adds versatility for presentations, drawing, note-taking, and tablet-style use.');
  } else if (specs.includes('15.6') || specs.includes('16') || specs.includes('17')) {
    tips.push('Large screen — great for productivity, multitasking, and media. Desktop-replacement capability.');
  } else if (specs.includes('13') || specs.includes('14')) {
    tips.push('Compact screen — ultra-portable. Perfect for on-the-go use, slides into any bag, lightweight for commuting.');
  }

  // ─── Battery health angles ─────────────────────────────
  if (laptop.batteryHealth?.toLowerCase().includes('excellent') || laptop.batteryHealth?.toLowerCase().includes('95') || laptop.batteryHealth?.toLowerCase().includes('100')) {
    tips.push('Excellent battery health — KEY selling point. Emphasize all-day battery life or battery barely degraded from new.');
  } else if (laptop.batteryHealth?.toLowerCase().includes('good') || laptop.batteryHealth?.toLowerCase().includes('80')) {
    tips.push('Good battery health — still provides solid hours of use.');
  }

  // ─── Repair context ────────────────────────────────────
  if (laptop.repairs) {
    tips.push(`This laptop has had repairs: ${laptop.repairs}. Be TRANSPARENT — repairs BUILD trust if framed correctly: Professionally repaired, repaired with genuine parts, issue fully resolved. Never hide repairs.`);
  }

  // ─── Year context ──────────────────────────────────────
  if (laptop.year && laptop.year >= 2023) {
    tips.push(`Recent model (${laptop.year}) — relatively new. Emphasize: Still current generation with latest specs.`);
  } else if (laptop.year && laptop.year <= 2018) {
    tips.push(`Older model (${laptop.year}) — be realistic about age. Frame as: Proven reliable workhorse or Classic model that still delivers. Focus on what it CAN do, not its age.`);
  }

  // ─── Seller notes intelligence ─────────────────────────
  if (laptop.notes) {
    const notes = laptop.notes.toLowerCase();
    if (notes.includes('upgrade') || notes.includes('upgraded')) {
      tips.push('Seller mentions upgrades — upgrades ADD significant value. Detail every upgrade: RAM, SSD, battery, etc. Each upgrade justifies a higher price.');
    }
    if (notes.includes('fresh') || notes.includes('clean install') || notes.includes('factory reset')) {
      tips.push('Fresh/clean OS install — trust signal: Ready to use from day one, no previous owner data.');
    }
    if (notes.includes('warranty')) {
      tips.push('Warranty mentioned — HUGE for used laptop sales. Be specific about remaining duration and what it covers.');
    }
    if (notes.includes('receipt') || notes.includes('proof of purchase')) {
      tips.push('Receipt/proof of purchase available — confirms legitimate purchase and builds trust.');
    }
  }

  return tips.join(' ');
}

// ─── Prompt builder with advanced copywriting ────────────

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
Asking Price: R${laptop.askingPrice.toLocaleString()}${laptop.purchasePrice ? `\nPurchase Price: R${laptop.purchasePrice.toLocaleString()} (for pricing context)` : ''}${laptop.color ? `\nColour: ${laptop.color}` : ''}${laptop.year ? `\nYear: ${laptop.year}` : ''}${laptop.repairs ? `\nRepairs: ${laptop.repairs}` : ''}
${laptop.notes ? `\nSeller Notes: ${laptop.notes}` : ''}

━━━ SELLING CONTEXT & ANGLES ━━━
${valueContext}

━━━ PLATFORM RULES ━━━
${platformGuide}

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON: { "title": "...", "body": "..." }
- title: The ad headline/title (optimised for the platform's search/visibility)
- body: The full ad description text (following ALL platform rules above)
Do NOT include explanations, markdown code fences, or any text outside the JSON.`;
}

// ─── Improved fallback ad builder ─────────────────────────

function buildFallbackAd(
  platform: string,
  laptop: { brand: string; model: string; cpu: string; ram: string; storage: string; gpu: string; screenSize: string; condition: string; batteryHealth: string; askingPrice: number; purchasePrice: number; notes: string; color?: string; year?: number; repairs?: string }
): { platform: string; title: string; body: string; price: number } {
  const priceStr = `R${laptop.askingPrice.toLocaleString()}`;
  const specs = [
    laptop.cpu && `CPU: ${laptop.cpu}`,
    laptop.ram && `RAM: ${laptop.ram}`,
    laptop.storage && `Storage: ${laptop.storage}`,
    laptop.gpu && `GPU: ${laptop.gpu}`,
    laptop.screenSize && `Screen: ${laptop.screenSize}"`,
  ].filter(Boolean);

  const specsLine = specs.join(" | ");

  const conditionLine = `Condition: ${laptop.condition} | Battery: ${laptop.batteryHealth}`;
  const extraLines = [
    laptop.year && `Year: ${laptop.year}`,
    laptop.color && `Colour: ${laptop.color}`,
    laptop.repairs && `Repairs: ${laptop.repairs}`,
  ].filter(Boolean).join(" | ");

  // Compute a value angle
  const specStr = `${laptop.cpu} ${laptop.ram} ${laptop.gpu}`.toLowerCase();
  let valueAngle = "Well-maintained and ready for a new owner. Great value for money.";
  let useCase = "Versatile laptop ready for work or play.";

  if (laptop.condition === 'Mint' || laptop.condition === 'Excellent') {
    valueAngle = "Looks and performs like new - save thousands vs retail price!";
  } else if (laptop.condition === 'Fair') {
    valueAngle = "Fully operational with normal wear - priced to sell fast.";
  } else if (laptop.condition === 'Poor') {
    valueAngle = "Ideal for parts, repairs, or budget buyers. Priced accordingly.";
  }

  if (specStr.includes('rtx') || specStr.includes('gtx')) {
    useCase = "Perfect for gaming, video editing, and 3D rendering";
  } else if (specStr.includes('i7') || specStr.includes('i9') || specStr.includes('ryzen 7') || specStr.includes('ryzen 9')) {
    useCase = "Ideal for professionals, developers, and power users";
  } else if (specStr.includes('m1') || specStr.includes('m2') || specStr.includes('m3')) {
    useCase = "Perfect for creatives, students, and everyday productivity";
  } else if (specStr.includes('i3') || specStr.includes('celeron') || specStr.includes('pentium')) {
    useCase = "Great for students, office work, and everyday browsing";
  } else if (specStr.includes('i5') || specStr.includes('ryzen 5')) {
    useCase = "Solid all-rounder - work, study, and entertainment";
  }

  // Profit/margin context
  const savingsNote = (laptop.purchasePrice && laptop.purchasePrice > laptop.askingPrice)
    ? `\nPriced BELOW cost - urgent sale!`
    : '';

  if (platform === "whatsapp") {
    const topSpecs = specs.slice(0, 3).map(s => s.split(": ")[1]).join(" | ");
    const title = `${laptop.brand} ${laptop.model} - ${priceStr}`;
    const body = [
      `*${laptop.brand} ${laptop.model}* ${laptop.condition === 'Mint' ? '✨' : laptop.condition === 'Excellent' ? '🌟' : '💻'}`,
      `_${laptop.condition} condition | Battery: ${laptop.batteryHealth}_`,
      "",
      topSpecs || "Great specs for the price",
      `*Price: ${priceStr}*`,
      savingsNote || "",
      "",
      "DM now - won't last long! 📲",
    ].filter(Boolean).join("\n");
    return { platform, title, body: body.substring(0, 500), price: laptop.askingPrice };
  }

  if (platform === "facebook") {
    const title = `${laptop.brand} ${laptop.model} (${laptop.condition}) - ${priceStr}`;
    const body = [
      `Looking for a reliable laptop that won't break the bank? Check this out 👇`,
      "",
      `✨ ${laptop.brand} ${laptop.model} — ${laptop.condition} Condition`,
      "",
      "📋 Specifications:",
      ...specs.map(s => `  • ${s}`),
      "",
      `✅ ${conditionLine}`,
      extraLines ? `📌 ${extraLines}` : null,
      "",
      `💡 Why This Is a Great Deal`,
      valueAngle,
      "",
      `🎯 Perfect For`,
      useCase,
      laptop.notes ? `\n📝 ${laptop.notes}` : null,
      "",
      `💰 Asking Price: ${priceStr}`,
      savingsNote || "Priced to sell - first come, first served!",
      "",
      "📲 DM me if interested or comment below.",
      "📦 Can arrange delivery or collection.",
    ].filter(Boolean).join("\n");
    return { platform, title, body, price: laptop.askingPrice };
  }

  if (platform === "gumtree") {
    const title = `${laptop.brand} ${laptop.model} - ${laptop.condition} - ${priceStr}`;
    const body = [
      `FOR SALE: ${laptop.brand} ${laptop.model}`,
      "",
      `Condition: ${laptop.condition}`,
      `Battery Health: ${laptop.batteryHealth}`,
      extraLines,
      "",
      "Specifications:",
      ...specs.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      `🛡️ ${valueAngle}`,
      `🎯 ${useCase}`,
      laptop.notes ? `\nSeller Notes: ${laptop.notes}` : null,
      "",
      `Asking Price: ${priceStr}`,
      savingsNote || "",
      "",
      "Contact to arrange a viewing. Serious buyers only please.",
    ].filter(Boolean).join("\n");
    return { platform, title, body, price: laptop.askingPrice };
  }

  // OLX fallback
  const title = `${laptop.brand} ${laptop.model} - ${priceStr}`;
  const body = [
    `📌 ${laptop.brand} ${laptop.model} - ${laptop.condition} Condition`,
    "",
    `💰 Price: ${priceStr}`,
    savingsNote || "",
    "",
    "🖥️ Full Specifications:",
    ...specs.map(s => `  • ${s}`),
    "",
    `🔋 Battery: ${laptop.batteryHealth}`,
    extraLines,
    "",
    `💡 ${valueAngle}`,
    `🎯 ${useCase}`,
    laptop.notes ? `\n📝 Notes: ${laptop.notes}` : null,
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

// ─── System prompt with advanced copywriting framework ────

const SYSTEM_PROMPT = `You are a senior marketplace ad copywriter specialising in second-hand electronics in South Africa. You write ads that SELL — they are persuasive, honest, and optimised for each platform's audience. You understand South African buyer psychology and marketplace dynamics.

YOUR COPYWRITING FRAMEWORK:

1. HONESTY FIRST (Non-negotiable)
   - Never exaggerate specs or condition. SA buyers value transparency and will walk away from misleading ads.
   - If condition is "Good", say "good" — do not upgrade it to "excellent" in the ad copy.
   - Mention any repairs, defects, or wear UPFRONT — this builds trust and prevents returns/wasted viewings.

2. THE HOOK (First 2 seconds)
   - The first line must stop the scroll. You have ONE sentence to grab attention.
   - Effective hooks: a question ("Looking for a laptop that won't break the bank?"), a bold value claim ("Save R8,000 vs retail"), or a lifestyle benefit ("Edit videos, run VS Code, and still have battery left").
   - AVOID weak hooks: "Selling my laptop", "Good laptop for sale", "Check this out" (too vague).

3. SPECIFICATIONS THAT SELL
   - Include EVERY available spec — SA marketplace buyers compare specs obsessively.
   - Don't just list specs — EXPLAIN what they mean for the buyer: "16GB RAM = run 20+ browser tabs + Slack + Excel without lag".
   - Highlight the TOP 3 specs that matter most for THIS laptop and THIS price point.

4. EMOTIONAL BENEFITS (Paint a picture)
   - Help the buyer IMAGINE owning this laptop. What will their day look like?
   - Instead of "good for students" → "Ace your assignments, join online classes seamlessly, and still have battery for Netflix at night."
   - Instead of "gaming laptop" → "Play Valorant, CS2, and GTA V at high settings. No lag, no overheating."

5. TRUST ARCHITECTURE
   - Include 2-3 subtle trust signals naturally woven into the copy.
   - Examples: "well maintained", "always kept in a case", "clean Windows install", "original charger included", "receipt available", "smoke-free home".
   - For repairs: "Professionally repaired with genuine parts" — never hide repairs.

6. URGENCY & SCARCITY (Without desperation)
   - Subtly suggest limited availability: "Priced to sell fast", "Won't stay listed long", "Only one available".
   - NEVER sound desperate — desperation makes buyers suspicious. "Urgent sale" can signal problems.
   - Instead frame as opportunity: "At this price, it won't last" or "Similar specs are going for R5,000 more."

7. VALUE ANCHORING (Pricing psychology)
   - Frame the price as a SMART DEAL, not a cheap option.
   - Implicitly compare to retail: "You'd pay R25,000+ for this spec brand new."
   - For laptops below purchase price: "Seller upgraded and wants a quick sale — your gain."
   - For budget laptops: "More laptop than you'd expect at this price point."

8. COMPETITIVE DIFFERENTIATION
   - What makes THIS listing better than the 50 others on the same platform?
   - Focus on: condition, included accessories, upgrades, battery health, pricing, availability.
   - Specific differentiators beat vague claims: "Recently upgraded to 16GB RAM" beats "fast laptop".

9. MOBILE-FIRST FORMATTING
   - 80%+ of SA marketplace browsing happens on phones.
   - Short paragraphs (2-3 sentences max).
   - Generous line breaks between sections.
   - Bullet points for specs (not dense paragraphs).
   - Emoji headers for section breaks (platform permitting).

10. SOUTH AFRICAN MARKETPLACE CONTEXT
    - Use Rands (R) for all prices — never USD or EUR.
    - South African English spelling: colour (not color), programme, centre.
    - SA marketplace norms: "DM me", "WhatsApp preferred", "Can courier", "Collection in [area]".
    - Avoid Americanisms: "shipping" → "delivery/courier", "bucks" → "Rands".

11. WHAT TO AVOID (Anti-patterns)
    - NEVER: use clickbait titles, ALL CAPS body text, excessive emojis, unrelated keywords for SEO, false urgency ("LAST ONE!!!"), or vague descriptions ("works well").
    - NEVER: copy-paste the same ad for every platform — each platform has different norms and audiences.
    - NEVER: include personal phone numbers, email addresses, or addresses in the ad body.
    - NEVER: use generic phrases without backing them up ("great laptop" — WHY is it great?).

12. OUTPUT FORMAT
    - ALWAYS respond with valid JSON only: { "title": "...", "body": "..." }
    - Do NOT include explanations, markdown code fences, or any text outside the JSON.
    - The title should be optimised for the platform's search/discovery mechanism.
    - The body should follow the specific platform rules provided in the prompt.`;

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
