/**
 * Local API — offline/offline-first fallback using localStorage.
 * Used by api.ts when the server is unreachable or running inside a Capacitor APK.
 */

import type { Laptop, AdPreview, Platform, Listing } from "./types";

const STORAGE_KEY = "laptopflip_laptops";

// ─── Helpers ──────────────────────────────────────────────

function loadLaptops(): Laptop[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLaptops(laptops: Laptop[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(laptops));
  } catch {
    // Storage full — silently fail
  }
}

function generateId(): string {
  // Simple ID generation for offline use (similar to cuid format)
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `local_${timestamp}${random}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

/** Pick a random item from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Exported CRUD functions ──────────────────────────────

/**
 * Fetch all laptops from localStorage.
 */
export function localFetchLaptops(): Laptop[] {
  return loadLaptops();
}

/**
 * Fetch a single laptop by ID from localStorage.
 */
export function localFetchLaptop(id: string): Laptop | null {
  const laptops = loadLaptops();
  return laptops.find((l) => l.id === id) ?? null;
}

/**
 * Create a new laptop in localStorage.
 */
export function localCreateLaptop(data: Record<string, unknown>): Laptop {
  const laptops = loadLaptops();

  // Generate a sequential stock ID
  const maxNum = laptops.reduce((max, l) => {
    const match = l.stockId?.match(/LF-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  const now = nowISO();
  const laptop: Laptop = {
    id: generateId(),
    brand: (data.brand as string) || "",
    model: (data.model as string) || "",
    cpu: (data.cpu as string) || "",
    ram: (data.ram as string) || "",
    storage: (data.storage as string) || "",
    gpu: (data.gpu as string) || "",
    screenSize: (data.screenSize as string) || "",
    condition: (data.condition as string) || "Good",
    batteryHealth: (data.batteryHealth as string) || "Good",
    purchasePrice: typeof data.purchasePrice === "string" ? parseFloat(data.purchasePrice) || 0 : (data.purchasePrice as number) || 0,
    askingPrice: typeof data.askingPrice === "string" ? parseFloat(data.askingPrice) || 0 : (data.askingPrice as number) || 0,
    notes: (data.notes as string) || "",
    photos: (data.photos as string) || "[]",
    status: (data.status as string) || "draft",
    color: (data.color as string) || "",
    year: typeof data.year === "string" ? parseInt(data.year, 10) || 0 : (data.year as number) || 0,
    serialNumber: (data.serialNumber as string) || "",
    repairs: (data.repairs as string) || "",
    features: (data.features as string) || "",
    stockId: `LF-${String(maxNum + 1).padStart(4, "0")}`,
    location: (data.location as string) || "",
    createdAt: now,
    updatedAt: now,
    listings: [],
  };

  laptops.push(laptop);
  saveLaptops(laptops);
  return laptop;
}

/**
 * Update an existing laptop in localStorage.
 */
export function localUpdateLaptop(
  id: string,
  data: Record<string, unknown>
): Laptop | null {
  const laptops = loadLaptops();
  const index = laptops.findIndex((l) => l.id === id);
  if (index === -1) return null;

  const existing = laptops[index];
  const updated: Laptop = {
    ...existing,
    ...data,
    id: existing.id, // prevent ID overwrites
    stockId: existing.stockId, // prevent stockId overwrites
    createdAt: existing.createdAt, // prevent createdAt overwrites
    updatedAt: nowISO(),
    // Handle numeric fields properly
    purchasePrice: data.purchasePrice !== undefined
      ? typeof data.purchasePrice === "string"
        ? parseFloat(data.purchasePrice) || 0
        : (data.purchasePrice as number)
      : existing.purchasePrice,
    askingPrice: data.askingPrice !== undefined
      ? typeof data.askingPrice === "string"
        ? parseFloat(data.askingPrice) || 0
        : (data.askingPrice as number)
      : existing.askingPrice,
    year: data.year !== undefined
      ? typeof data.year === "string"
        ? parseInt(data.year, 10) || 0
        : (data.year as number)
      : existing.year,
  };

  laptops[index] = updated;
  saveLaptops(laptops);
  return updated;
}

/**
 * Delete a laptop from localStorage.
 */
export function localDeleteLaptop(id: string): boolean {
  const laptops = loadLaptops();
  const index = laptops.findIndex((l) => l.id === id);
  if (index === -1) return false;

  laptops.splice(index, 1);
  saveLaptops(laptops);
  return true;
}

/**
 * Update a listing within a laptop's listings array in localStorage.
 * The listing is identified by its own ID within the laptop's listings.
 */
export function localUpdateListing(
  id: string,
  data: Record<string, unknown>
): Record<string, unknown> | null {
  const laptops = loadLaptops();

  for (const laptop of laptops) {
    const listings = laptop.listings || [];
    const listingIndex = listings.findIndex((l) => l.id === id);
    if (listingIndex !== -1) {
      const existing = listings[listingIndex];
      const updated: Listing = {
        ...existing,
        ...data,
        id: existing.id,
        laptopId: existing.laptopId,
        createdAt: existing.createdAt,
        updatedAt: nowISO(),
      };
      listings[listingIndex] = updated;
      laptop.updatedAt = nowISO();
      saveLaptops(laptops);
      return updated;
    }
  }

  return null;
}

// ─── Ad Generation (offline template-based) ───────────────

/**
 * Generate ad previews using offline templates.
 * Produces platform-specific ad copy based on the laptop's data.
 */
export function localGenerateAd(
  laptopId: string,
  platforms: Platform[],
  laptopObj?: Laptop | null,
  _adSettings?: { whatsappNumber?: string; defaultLocation?: string }
): AdPreview[] {
  const laptop = laptopObj ?? localFetchLaptop(laptopId);
  if (!laptop) return [];

  const results: AdPreview[] = [];

  for (const platform of platforms) {
    const ad = generateOfflineAd(laptop, platform, _adSettings);
    results.push(ad);
  }

  return results;
}

function generateOfflineAd(
  laptop: Laptop,
  platform: Platform,
  adSettings?: { whatsappNumber?: string; defaultLocation?: string }
): AdPreview {
  const price = laptop.askingPrice > 0 ? laptop.askingPrice : laptop.purchasePrice;
  const priceStr = price > 0 ? `R${price.toLocaleString("en-ZA")}` : "Price on request";

  const conditionEmoji =
    laptop.condition === "Mint" ? "✨"
    : laptop.condition === "Excellent" ? "🌟"
    : laptop.condition === "Good" ? "👍"
    : laptop.condition === "Fair" ? "👌"
    : "📦";

  const location = laptop.location || adSettings?.defaultLocation || "";

  // ─── Benefit-driven spec builder with VARIETY ─────────────
  function specWithBenefit(raw: string): string {
    const lower = raw.toLowerCase();

    // Processor benefits
    if (/i[3579]|ryzen [3579]/i.test(lower)) return pick([
      `${raw} — rips through workloads, no sweating`,
      `${raw} — powerful enough for anything you throw at it`,
      `${raw} — the engine that makes everything feel instant`,
    ]);
    if (/m[123]|m[1-4] pro|m[1-2] max/i.test(lower)) return pick([
      `${raw} — Apple Silicon magic — speed and battery efficiency that Intel can only dream of`,
      `${raw} — buttery smooth performance with battery life that lasts all day`,
    ]);
    if (/celeron|pentium|n100/i.test(lower)) return pick([
      `${raw} — handles the basics without drama — web, email, Netflix, done`,
      `${raw} — budget-friendly processing that still gets the job done`,
    ]);

    // RAM benefits
    if (/ram|memory/i.test(lower)) {
      if (/32|64/.test(lower)) return pick([
        `${raw} — overkill for most, heaven for power users — nothing will slow you down`,
        `${raw} — massive memory — run VMs, docker, and 50 tabs without thinking`,
      ]);
      if (/16/.test(lower)) return pick([
        `${raw} — multitask like an absolute boss — 30 Chrome tabs, Slack, Excel, no stutter`,
        `${raw} — the sweet spot of memory — enough for real work without paying for excess`,
      ]);
      if (/8/.test(lower)) return pick([
        `${raw} — solid multitasking — emails, browsing, and apps all running smoothly`,
        `${raw} — handles the essentials like a champ`,
      ]);
      if (/4/.test(lower)) return pick([
        `${raw} — enough for the basics — web, email, and light apps`,
      ]);
      return `${raw} — smooth multitasking`;
    }

    // Storage benefits
    if (/ssd|storage|gb\s*(nvme|solid)?/i.test(lower)) {
      if (/1tb|1024/.test(lower)) return pick([
        `${raw} — a full terabyte of lightning-fast storage — download everything, never worry`,
        `${raw} — tons of space AND blistering speed — best of both worlds`,
      ]);
      if (/512|500/.test(lower)) return pick([
        `${raw} — boots in seconds, plenty of room for all your files`,
        `${raw} — fast AND spacious — the perfect balance`,
      ]);
      if (/256/.test(lower)) return pick([
        `${raw} — boots in under 15 seconds, apps launch instantly`,
        `${raw} — snappy NVMe speed that makes everything feel fast`,
      ]);
      return `${raw} — boots in seconds, space for days`;
    }

    // GPU benefits
    if (/rtx|gtx/i.test(lower)) return pick([
      `${raw} — dedicated graphics muscle — game, render, create without compromise`,
      `${raw} — serious GPU power for gaming and creative work`,
    ]);
    if (/radeon/i.test(lower)) return `${raw} — AMD graphics power — handles games and creative apps nicely`;
    if (/iris|uhd\s*graphics/i.test(lower)) return `${raw} — great for everyday visuals, streaming, and light creative work`;

    // Display benefits
    if (/display|screen|inch|"|fhd|4k|oled|ips/i.test(lower)) {
      if (/oled/i.test(lower)) return `${raw} — OLED beauty — perfect blacks and colours that pop. Pure eye candy.`;
      if (/4k|uhd/i.test(lower)) return `${raw} — stunning 4K clarity — razor-sharp detail for work and entertainment`;
      if (/touch/i.test(lower)) return `${raw} — tap, swipe, interact — touchscreen adds a whole new dimension`;
      if (/fhd|full\s*hd/i.test(lower)) return `${raw} — crisp Full HD — sharp visuals for work and Netflix`;
      return pick([
        `${raw} — gorgeous screen that is easy on the eyes during long sessions`,
        `${raw} — bright, clear display that looks great in any lighting`,
      ]);
    }

    // Battery
    if (/battery/i.test(lower)) return pick([
      `${raw} — all-day juice, no loadshedding anxiety`,
      `${raw} — lasts through lectures, meetings, and coffee shop sessions`,
      `${raw} — solid battery life that keeps up with your day`,
    ]);

    // Modern features
    if (/backlit/i.test(lower)) return pick([
      `${raw} — work anytime, anywhere — even during loadshedding in the dark`,
      `${raw} — because late-night essay writing deserves proper lighting`,
    ]);
    if (/fingerprint|biometric/i.test(lower)) return pick([
      `${raw} — unlock in a flash — one touch and you are in`,
      `${raw} — secure and instant — your finger is the password`,
    ]);
    if (/touchscreen/i.test(lower)) return pick([
      `${raw} — tap, swipe, get things done faster`,
      `${raw} — adds a whole new way to interact with your laptop`,
    ]);
    if (/webcam|camera/i.test(lower)) return pick([
      `${raw} — Zoom calls sorted — crystal clear video for meetings and lectures`,
      `${raw} — video call quality that does not embarrass you on Teams`,
    ]);
    if (/wifi\s*6|wi-fi\s*6|bluetooth/i.test(lower)) return pick([
      `${raw} — lightning-fast wireless, no drama — connects in seconds`,
      `${raw} — next-gen connectivity that just works`,
    ]);
    if (/thunderbolt|usb-c/i.test(lower)) return pick([
      `${raw} — one cable to rule them all — charging, display, data, the works`,
      `${raw} — universal port that handles everything — future-proof connectivity`,
    ]);
    if (/numeric|numpad/i.test(lower)) return `${raw} — crunch numbers like an accountant on deadline`;
    if (/hinge|360|convertible|2-in-1/i.test(lower)) return pick([
      `${raw} — flex it however you work — laptop, tablet, stand, tent mode`,
      `${raw} — the versatility to match your workflow, whatever it looks like`,
    ]);
    if (/windows\s*11|windows\s*10/i.test(lower)) return pick([
      `${raw} — fresh install, no bloatware, ready to go from day one`,
      `${raw} — clean Windows, no nonsense — just you and your apps`,
    ]);
    if (/ai|copilot|neural/i.test(lower)) return `${raw} — AI features built in — the future is already here, bru`;

    return `${raw}`;
  }

  // Build the benefit-driven spec lines
  const specLines: string[] = [];
  if (laptop.cpu) specLines.push(specWithBenefit(laptop.cpu));
  if (laptop.ram) specLines.push(specWithBenefit(laptop.ram));
  if (laptop.storage) specLines.push(specWithBenefit(laptop.storage));
  if (laptop.gpu) specLines.push(specWithBenefit(laptop.gpu));
  if (laptop.screenSize) specLines.push(specWithBenefit(`${laptop.screenSize}" display`));
  if (laptop.batteryHealth) {
    const batteryNote = laptop.batteryHealth.toLowerCase().includes("excellent") || laptop.batteryHealth.toLowerCase().includes("mint")
      ? pick([
          "Battery health is stellar — all-day juice, no loadshedding stress",
          "Battery is an absolute champion — lasts through a full day away from the charger",
        ])
      : `Battery health: ${laptop.batteryHealth} — still going strong`;
    specLines.push(batteryNote);
  }

  const features = laptop.features
    ? laptop.features.split(",").map((f) => f.trim()).filter(Boolean)
    : [];
  if (features.length > 0) {
    specLines.push(...features.map((f) => specWithBenefit(f)));
  }

  // ─── Condition trust signal with VARIETY ──────────────────
  function conditionBlurb(): string {
    switch (laptop.condition) {
      case "Mint": return pick([
        "Mint condition — honestly looks like it came out the box yesterday. Not a scratch, not a mark. You're getting a new laptop at a pre-owned price.",
        "Showroom fresh, bru — the screen is flawless, the keyboard is crisp, and the chassis looks brand new. Someone is going to get an incredible deal.",
      ]);
      case "Excellent": return pick([
        "Excellent condition — barely any signs of use. You'd struggle to tell it's not brand new. The kind of laptop that makes you wonder why anyone pays retail.",
        "Barely broken in — everything feels fresh, from the trackpad to the screen. This laptop has had an easy life and it shows.",
      ]);
      case "Good": return pick([
        "Good condition — well looked after with normal light wear. Nothing that affects performance at all. The kind of honest, reliable machine that just works.",
        "Solid condition — has been used and loved, but functionally it's spot on. Every key works, every port responds. Priced honestly for what it is.",
      ]);
      case "Fair": return pick([
        "Fair condition — got some cosmetic wear from regular use, but make no mistake, it works like a charm. Perfect if you care about function over a shiny lid.",
        "Honest wear on the outside, solid performance on the inside. At this price, it's about getting a working machine without spending big.",
      ]);
      default: return `Condition: ${laptop.condition} — fully functional and ready to go.`;
    }
  }

  // ─── Urgency / FOMO lines (heavily expanded) ──────────────
  function fomoLine(): string {
    return pick([
      "Deals like this don't come around often — don't sleep on this one, bru!",
      "At this price, it's NOT going to hang around. Move fast!",
      "Serious buyers only — this is priced to go and it WILL go quickly.",
      "I've priced this to sell fast. First person with the cash takes it.",
      "Won't last long at this price, believe me. Get in before someone else does.",
      "Two people have already asked about this. Still available — for now.",
      "If you're reading this and it's still up, grab it NOW. Tomorrow it won't be.",
      "This is the kind of deal that gets shared in WhatsApp groups. Don't be the one who missed it.",
      "My loss is your gain — I need this gone and I'm not negotiating much.",
      "Selling fast because it's priced right. Don't wait for the weekend — message me NOW.",
      "I dare you to find this spec at this condition for this price anywhere else.",
      "Bookmark this. No wait, just message me. Bookmarks don't buy laptops, bru.",
    ]);
  }

  // ─── Trust bundle line with VARIETY ───────────────────────
  function trustLine(): string {
    return pick([
      "✅ Charger included | ✅ Fresh OS install, no nonsense | ✅ Wiped clean and ready from the word go",
      "✅ Original charger | ✅ Clean install — zero bloatware | ✅ Ready to use from day one, now now",
      "✅ Comes with charger  |  ✅ Fresh install, no junk  |  ✅ Reset, wiped, and ready for its new owner",
    ]);
  }

  // ─── Colour helper (SA spelling) ─────────────────────────
  function colourNote(): string {
    if (!laptop.color) return "";
    return pick([
      `Finishes in ${laptop.color} — sharp and clean.`,
      `Comes in ${laptop.color} — looks professional and sleek.`,
    ]);
  }

  // ─── Platform templates ──────────────────────────────────
  switch (platform) {
    case "whatsapp": {
      const hookOptions = [
        `*🔥 JUST IN — ${laptop.brand.toUpperCase()} ${laptop.model.toUpperCase()}*`,
        `*🔥 STOP SCROLLING — ${laptop.brand} ${laptop.model} at a steal!*`,
        `*💰 DEAL ALERT — ${laptop.brand} ${laptop.model} going FAST*`,
        `*⚡ Found a gem — ${laptop.brand} ${laptop.model}*`,
      ];
      if (laptop.condition === "Mint") hookOptions.push(`*✨ MINT CONDITION ${laptop.brand} ${laptop.model} — looks brand new!*`);
      if (price > 0 && price <= 5000) hookOptions.push(`*🔥 BUDGET STEAL — ${laptop.brand} ${laptop.model} under 5k!*`);

      const lines = [
        pick(hookOptions),
        "",
        `*💰 Asking: ${priceStr}*`,
        "",
        `📋 *The rundown:*`,
        ...specLines.map((s) => `  ▸ ${s}`),
        "",
        `🏷️ ${conditionBlurb()}`,
        laptop.color ? `🎨 ${colourNote()}` : "",
        trustLine(),
        "",
        laptop.notes ? `💬 *Quick note:* ${laptop.notes}` : "",
        "",
        `📍 ${location || "Collection arranged countrywide"}`,
        "",
        `⚡ ${fomoLine()}`,
        "",
        "*Message me RIGHT NOW if you're keen — let's make it happen!* 🚀",
        adSettings?.whatsappNumber ? `📱 WhatsApp direct: ${adSettings.whatsappNumber}` : "",
      ].filter(Boolean);
      return {
        platform: "whatsapp",
        title: `${laptop.brand} ${laptop.model} — ${priceStr} 🔥`,
        body: lines.join("\n"),
        price,
      };
    }

    case "facebook": {
      const hookOptions = [
        `${conditionEmoji} *LOOKING FOR A SERIOUS UPGRADE? THIS IS IT.*`,
        `${conditionEmoji} *I'M ABOUT TO SAVE SOMEONE A LOT OF MONEY.*`,
        `${conditionEmoji} *FOUND A GEM — AND IT'S PRICED TO MOVE.*`,
        `🔥 *STOP BROWSING. THIS IS THE LAPTOP DEAL YOU'VE BEEN WAITING FOR.*`,
      ];
      if (laptop.condition === "Mint") hookOptions.push(`✨ *MINT CONDITION UNICORN — THIS ${laptop.brand.toUpperCase()} ${laptop.model.toUpperCase()} LOOKS BRAND NEW.*`);
      if (price > 0 && price <= 5000) hookOptions.push(`💰 *BUDGET STEAL — UNDER R5,000 FOR A ${laptop.condition} ${laptop.brand.toUpperCase()}! ARE YOU KIDDING ME?*`);

      const body = [
        pick(hookOptions),
        "",
        `*${laptop.brand} ${laptop.model}* — ${priceStr}`,
        "",
        pick([
          "*Why this machine is a win:*",
          "*Why you'd be silly to pass this up:*",
          "*Here's why this deal doesn't make sense — in a good way:*",
        ]),
        ...specLines.map((s) => `  🔹 ${s}`),
        "",
        `*Condition:* ${conditionBlurb()}`,
        laptop.color ? `*Colour:* ${colourNote()}` : "",
        trustLine(),
        "",
        laptop.notes ? `*My 2 cents:* ${laptop.notes}` : "",
        "",
        pick([
          `*Why this price is a steal:* Walk into any shop — Takealot, Incredible Connection, Makro — and try to find these specs at this price. You'll walk out shaking your head. Same machine brand new? Easily R${Math.round(price * 1.8).toLocaleString()} to R${Math.round(price * 2.2).toLocaleString()}. Save the difference and put it towards something fun, bru.`,
          `*Let's talk value:* This ${laptop.condition} ${laptop.brand} ${laptop.model} at ${priceStr} is criminally good value. I checked retail prices and honestly? You'd be crazy to pay full price when this exists. That saving could cover a few months of groceries or a lekker weekend away.`,
        ]),
        "",
        location ? `📍 ${location}` : "",
        "",
        fomoLine(),
        "",
        pick([
          "*Drop me a message NOW or comment SOLD if you're keen. First come, first served — no holding!* 🔥",
          "*Don't be the person who sees this tomorrow and finds it's gone. Message me NOW!* 🚀",
          "*I respond fast. Don't sleep on this one — someone else is reading this right now.* ⚡",
        ]),
        "",
        "#laptopsforsale #southafrica #capetown #johannesburg #durban #techdeals #laptopdeals #workfromhome #studentsa #preownedlaptops",
      ].filter(Boolean).join("\n");

      return {
        platform: "facebook",
        title: `${laptop.brand} ${laptop.model} — ${priceStr} | ${laptop.condition} Condition 🔥`,
        body: body.trim(),
        price,
      };
    }

    case "gumtree": {
      const openerOptions = [
        `⚡ ${laptop.brand} ${laptop.model} — ${laptop.condition} Condition — ${priceStr}`,
        `💻 ${laptop.brand} ${laptop.model} — PRICED TO SELL — ${laptop.condition} Condition — ${priceStr}`,
        `🔍 ${laptop.brand} ${laptop.model} — If you're reading this, you're in the right place — ${priceStr}`,
      ];

      const body = [
        pick(openerOptions),
        "",
        pick([
          `If you're looking for a reliable, well-priced laptop, you just found it. This ${laptop.brand} ${laptop.model} is an absolute gem and it's priced to move. Here's what you're getting:`,
          `Stop browsing — this is the one. I've priced this ${laptop.brand} ${laptop.model} fairly based on its ${laptop.condition} condition, and at this price point, it represents genuine value. Here's the full picture:`,
          `I know what you're thinking — "just another laptop ad." But trust me, this ${laptop.brand} ${laptop.model} in ${laptop.condition} condition is worth your attention. Let me show you why:`,
        ]),
        "",
        "SPECIFICATIONS & BENEFITS:",
        ...specLines.map((s) => `  • ${s}`),
        "",
        `CONDITION: ${conditionBlurb()}`,
        laptop.color ? `COLOUR: ${colourNote()}` : "",
        "",
        "WHAT'S INCLUDED:",
        `  • Original charger — save yourself R600-R900 at the shop`,
        `  • Fresh, clean install — no bloatware, no nonsense`,
        `  • Fully wiped and reset, ready for its new owner`,
        "",
        pick([
          "WHO IS THIS PERFECT FOR?",
          "IDEAL BUYER:",
        ]),
        ...fallbackAudiencesLocal(laptop.cpu, laptop.ram, laptop.condition, price).map(a => `  • ${a}`),
        "",
        "WHY BUY FROM ME?",
        pick([
          `  I'm an honest seller — what you see is what you get. The condition is 100% accurately described and I'm happy to answer any questions. Come test everything before you commit.`,
          `  Honest selling, fair prices, and fast communication. I can arrange a viewing at your convenience — take your time, test it properly, no rush.`,
        ]),
        laptop.notes ? `SELLER'S NOTE: ${laptop.notes}` : "",
        location ? `LOCATION: ${location}` : "",
        "",
        fomoLine(),
        "",
        pick([
          `WhatsApp me to arrange a viewing — I respond quickly. First come, first served. Serious buyers only please — no time wasters, no "is this still available" messages.`,
          `Contact me today — I'm flexible on meeting times and I respond fast. Don't be the one who misses out on this deal.`,
        ]),
      ].filter(Boolean).join("\n");

      return {
        platform: "gumtree",
        title: `${laptop.brand} ${laptop.model} ${laptop.condition} — ${priceStr} | Priced to Sell`,
        body: body.trim(),
        price,
      };
    }

    case "olx": {
      const hookOptions = [
        `Looking for a reliable, powerful laptop in ${location || "South Africa"}? This ${laptop.brand} ${laptop.model} ticks every box — and then some.`,
        `This is the laptop ad you bookmark and then panic-check to see if it's still available. Spoiler: it might not be.`,
        `Forget browsing. THIS is the ${laptop.brand} ${laptop.model} you've been looking for, at a price that doesn't make sense.`,
      ];
      if (laptop.condition === "Mint") hookOptions.push(`Mint condition ${laptop.brand} ${laptop.model} — looks brand new, priced like a steal. Someone is about to get very lucky.`);
      if (price > 0 && price <= 5000) hookOptions.push(`Under R5,000 for a working, reliable ${laptop.brand} ${laptop.model}? Yes. You read that right.`);

      const body = [
        pick(hookOptions),
        "",
        `${conditionEmoji} Condition: ${laptop.condition}`,
        `💰 Price: ${priceStr} ${price > 0 && price <= 6000 ? "(at this price, it's basically a gift, bru)" : "(negotiable within reason — but honestly, it's already a steal)"}`,
        "",
        "HERE'S WHAT'S UNDER THE HOOD:",
        ...specLines.map((s) => `  ✦ ${s}`),
        "",
        conditionBlurb(),
        laptop.color ? colourNote() : "",
        "",
        "WHY BUY FROM ME?",
        "  ✓ Charger included — you're sorted from day one",
        "  ✓ Fresh OS install, zero bloatware, plug and play",
        "  ✓ Honest condition assessment — what you see is what you get",
        "  ✓ Fast, friendly communication — I respond within minutes",
        "  ✓ Happy to arrange viewing and let you test everything",
        "",
        "IDEAL FOR:",
        ...fallbackAudiencesLocal(laptop.cpu, laptop.ram, laptop.condition, price).map(a => `  ✦ ${a}`),
        "",
        laptop.notes ? `EXTRA DETAILS: ${laptop.notes}` : "",
        location ? `📍 ${location} — collection or delivery can be arranged` : "",
        "",
        fomoLine(),
        "",
        pick([
          "Send me a message RIGHT NOW — let's get this sorted before someone else grabs it! I reply fast — no chancers please, serious buyers only.",
          "Message me now for more photos, a video walkthrough, or to arrange a viewing. If this ad is up, it's still available — don't ask, just come see it.",
        ]),
      ].filter(Boolean).join("\n");

      return {
        platform: "olx",
        title: `${laptop.brand} ${laptop.model} — ${priceStr} [${laptop.condition}] | Must See!`,
        body,
        price,
      };
    }

    default:
      return {
        platform,
        title: `${laptop.brand} ${laptop.model}`,
        body: `${laptop.brand} ${laptop.model} — ${priceStr}`,
        price,
      };
  }
}

/** Generate varied target audiences for offline templates */
function fallbackAudiencesLocal(cpu: string, ram: string, condition: string, price: number): string[] {
  const a: string[] = [];
  const c = cpu.toLowerCase();
  const r = ram.toLowerCase();

  if (c.includes("i7") || c.includes("i9") || c.includes("ryzen 7") || c.includes("ryzen 9") || r.includes("16") || r.includes("32")) {
    a.push(pick([
      "Developers and power users who need serious performance for coding and heavy multitasking",
      "Content creators — video editing, graphic design, music production",
    ]));
  }
  if (c.includes("i5") || c.includes("ryzen 5") || r.includes("8")) {
    a.push(pick([
      "Working professionals who need a reliable WFH machine",
      "University students needing a dependable study companion",
      "Side-hustlers building their business after hours",
    ]));
  }
  if (c.includes("i3") || c.includes("celeron") || c.includes("n100") || r.includes("4")) {
    a.push(pick([
      "School learners needing a solid machine for homework and projects",
      "Anyone needing a reliable laptop for browsing, streaming, and staying connected",
    ]));
  }
  if (condition === "Mint" || condition === "Excellent") {
    a.push(pick([
      "Smart buyers who want near-new quality without the brand-new price tag",
      "Anyone who has walked into Takealot and walked out again because of the prices",
    ]));
  }
  if (price > 0 && price <= 3000) {
    a.push(pick([
      "First-time laptop buyers or anyone on a tight budget",
      "Students who need something reliable without spending their entire allowance",
    ]));
  }
  if (price > 0 && price <= 6000) {
    a.push(pick([
      "Anyone upgrading from a slow, ancient laptop — this will feel like a rocket",
    ]));
  }

  return [...new Set(a)].slice(0, 4);
}

// ─── Sync ─────────────────────────────────────────────────

/**
 * Sync server data to localStorage for offline fallback.
 * Called by api.ts after successful server fetch.
 */
export function syncLaptopsToLocalStorage(laptops: Laptop[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(laptops));
  } catch {
    // Storage full — silently fail
  }
}
