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

  // ─── Benefit-driven spec builder ──────────────────────────
  function specWithBenefit(raw: string): string {
    const lower = raw.toLowerCase();
    if (/i[3579]|ryzen [3579]|m[123]|m[1-4] pro|m[1-2] max/i.test(lower))
      return `${raw} — rips through workloads, no sweating`;
    if (/ram|memory|gb\s*ddr/i.test(lower))
      return `${raw} — multitask like an absolute boss`;
    if (/ssd|storage|gb\s*(nvme|solid)?/i.test(lower))
      return `${raw} — boots in seconds, space for days`;
    if (/rtx|gtx|radeon|iris|uhd\s*graphics/i.test(lower))
      return `${raw} — graphics on point, whether you're working or playing`;
    if (/display|screen|inch|"|fhd|4k|oled|ips/i.test(lower))
      return `${raw} — gorgeous screen, easy on the eyes`;
    if (/battery/i.test(lower))
      return `${raw} — won't leave you hanging`;
    if (/backlit/i.test(lower))
      return `${raw} — work anytime, anywhere`;
    if (/fingerprint|biometric/i.test(lower))
      return `${raw} — unlock in a flash`;
    if (/touchscreen/i.test(lower))
      return `${raw} — tap, swipe, get things done faster`;
    if (/webcam|camera/i.test(lower))
      return `${raw} — video calls sorted, crystal clear`;
    if (/wifi\s*6|wi-fi\s*6|bluetooth/i.test(lower))
      return `${raw} — lightning-fast wireless, no drama`;
    if (/thunderbolt|usb-c/i.test(lower))
      return `${raw} — one cable to rule them all`;
    if (/numeric|numpad/i.test(lower))
      return `${raw} — crunch numbers like a pro`;
    if (/hinge|360|convertible|2-in-1/i.test(lower))
      return `${raw} — flex it however you work`;
    if (/windows\s*11|windows\s*10/i.test(lower))
      return `${raw} — fresh install, no bloatware, ready to go`;
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
      ? "Battery health is stellar — all-day juice"
      : `Battery health: ${laptop.batteryHealth} — still going strong`;
    specLines.push(batteryNote);
  }

  const features = laptop.features
    ? laptop.features.split(",").map((f) => f.trim()).filter(Boolean)
    : [];
  if (features.length > 0) {
    specLines.push(...features.map((f) => specWithBenefit(f)));
  }

  // ─── Condition trust signal ───────────────────────────────
  function conditionBlurb(): string {
    switch (laptop.condition) {
      case "Mint":
        return "Mint condition — honestly looks like it came out the box yesterday. Not a scratch.";
      case "Excellent":
        return "Excellent condition — barely any signs of use. You'd struggle to tell it's not brand new.";
      case "Good":
        return "Good condition — well looked after with normal light wear. Nothing that affects performance at all.";
      case "Fair":
        return "Fair condition — got some cosmetic wear, but make no mistake, it works like a charm.";
      default:
        return `Condition: ${laptop.condition} — fully functional and ready to go.`;
    }
  }

  // ─── Urgency / FOMO lines (varied per call) ──────────────
  function fomoLine(): string {
    const lines = [
      "Deals like this don't come around often — don't sleep on this one!",
      "At this price, it's NOT going to hang around. Move fast!",
      "Serious buyers only — this is priced to go and it WILL go quickly.",
      "I've priced this to sell fast. First person with the cash takes it.",
      "Won't last long at this price, believe me. Get in before someone else does.",
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // ─── Trust bundle line ────────────────────────────────────
  function trustLine(): string {
    return "✅ Comes with charger  |  ✅ Fresh Windows install, no nonsense  |  ✅ Wiped clean, reset, and ready from the word go";
  }

  // ─── Colour helper (SA spelling) ─────────────────────────
  function colourNote(): string {
    if (!laptop.color) return "";
    return `Finishes in ${laptop.color} — sharp and clean.`;
  }

  // ─── Platform templates ──────────────────────────────────
  switch (platform) {
    case "whatsapp": {
      const lines = [
        `*🔥 JUST IN — ${laptop.brand.toUpperCase()} ${laptop.model.toUpperCase()}* ${conditionEmoji}`,
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
      const body = [
        `${conditionEmoji} *LOOKING FOR A SERIOUS UPGRADE? THIS IS IT.*`,
        "",
        `*${laptop.brand} ${laptop.model}* — ${priceStr}`,
        "",
        `*Why this machine is a win:*`,
        ...specLines.map((s) => `  🔹 ${s}`),
        "",
        `*Condition:* ${conditionBlurb()}`,
        laptop.color ? `*Colour:* ${colourNote()}` : "",
        trustLine(),
        "",
        laptop.notes ? `*My 2 cents:* ${laptop.notes}` : "",
        location ? `📍 ${location}` : "",
        "",
        fomoLine(),
        "",
        "*Drop me a message NOW or comment SOLD if you're keen. First come, first served — no holding!* 🔥",
        "",
        "#laptopsforsale #southafrica #capetown #johannesburg #durban #techdeals #laptopdeals #workfromhome #studentsa",
      ].filter(Boolean).join("\n");

      return {
        platform: "facebook",
        title: `${laptop.brand} ${laptop.model} — ${priceStr} | ${laptop.condition} Condition 🔥`,
        body: body.trim(),
        price,
      };
    }

    case "gumtree": {
      const body = [
        `⚡ ${laptop.brand} ${laptop.model} — ${laptop.condition} Condition — ${priceStr}`,
        "",
        `If you're reading this, you're in the right place. This ${laptop.brand} ${laptop.model} is an absolute gem and it's priced to move. Here's what you're getting:`,
        "",
        "SPECIFICATIONS & BENEFITS:",
        ...specLines.map((s) => `  • ${s}`),
        "",
        `CONDITION: ${conditionBlurb()}`,
        laptop.color ? `COLOUR: ${colourNote()}` : "",
        "",
        `WHAT'S INCLUDED:`,
        `  • Original charger`,
        `  • Fresh, clean install — no bloatware, no nonsense`,
        `  • Fully wiped and reset, ready for its new owner`,
        "",
        laptop.notes ? `SELLER'S NOTE: ${laptop.notes}` : "",
        location ? `LOCATION: ${location}` : "",
        "",
        fomoLine(),
        "",
        `Contact me today — I respond fast. Don't be the one who misses out on this!`,
      ].filter(Boolean).join("\n");

      return {
        platform: "gumtree",
        title: `${laptop.brand} ${laptop.model} ${laptop.condition} — ${priceStr} | Priced to Sell`,
        body: body.trim(),
        price,
      };
    }

    case "olx": {
      const body = [
        `Looking for a reliable, powerful laptop in ${location || "South Africa"}? This ${laptop.brand} ${laptop.model} ticks every box — and then some.`,
        "",
        `${conditionEmoji} Condition: ${laptop.condition}`,
        `💰 Price: ${priceStr} (negotiable within reason — but honestly, it's already a steal)`,
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
        "  ✓ Fast, friendly communication",
        "",
        laptop.notes ? `EXTRA DETAILS: ${laptop.notes}` : "",
        location ? `📍 ${location} — collection or delivery can be arranged` : "",
        "",
        fomoLine(),
        "",
        "Send me a message RIGHT NOW — let's get this sorted before someone else grabs it!",
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
