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

  const specs: string[] = [];
  if (laptop.cpu) specs.push(laptop.cpu);
  if (laptop.ram) specs.push(laptop.ram);
  if (laptop.storage) specs.push(laptop.storage);
  if (laptop.gpu) specs.push(laptop.gpu);
  if (laptop.screenSize) specs.push(`${laptop.screenSize}" display`);
  if (laptop.batteryHealth && laptop.batteryHealth !== "Good")
    specs.push(`Battery: ${laptop.batteryHealth}`);
  const features = laptop.features
    ? laptop.features.split(",").map((f) => f.trim()).filter(Boolean)
    : [];
  if (features.length > 0) specs.push(...features);

  const location = laptop.location || adSettings?.defaultLocation || "";

  switch (platform) {
    case "whatsapp": {
      const lines = [
        `💻 *${laptop.brand} ${laptop.model}* ${conditionEmoji}`,
        "",
        `💰 ${priceStr}`,
        `📐 Condition: ${laptop.condition}`,
        ...specs.map((s) => `🔹 ${s}`),
        "",
      ];
      if (laptop.notes) lines.push(`📝 ${laptop.notes}`);
      if (location) lines.push(`📍 ${location}`);
      lines.push("", "DM me if interested! 🚀");
      if (adSettings?.whatsappNumber) {
        lines.push(`📱 ${adSettings.whatsappNumber}`);
      }
      return {
        platform: "whatsapp",
        title: `${laptop.brand} ${laptop.model} — ${priceStr}`,
        body: lines.join("\n"),
        price,
      };
    }

    case "facebook": {
      const body = [
        `${conditionEmoji} *${laptop.brand} ${laptop.model}* for sale!`,
        "",
        `Price: ${priceStr}`,
        `Condition: ${laptop.condition}`,
        specs.length > 0 ? `Specs: ${specs.join(" | ")}` : "",
        laptop.notes ? `\n${laptop.notes}` : "",
        location ? `📍 ${location}` : "",
        "",
        "Message me to buy or for more info. First come, first served! 🔥",
        "#laptopsforsale #southafrica #tech",
      ].join("\n");

      return {
        platform: "facebook",
        title: `SELL: ${laptop.brand} ${laptop.model} — ${priceStr} (${laptop.condition})`,
        body: body.trim(),
        price,
      };
    }

    case "gumtree": {
      const body = [
        `${laptop.brand} ${laptop.model} — ${laptop.condition} Condition`,
        "",
        `Price: ${priceStr}`,
        "",
        "Specifications:",
        ...specs.map((s) => `• ${s}`),
        laptop.notes ? `\nNotes: ${laptop.notes}` : "",
        location ? `Location: ${location}` : "",
        "",
        "Contact me today — this won't last long!",
      ].join("\n");

      return {
        platform: "gumtree",
        title: `${laptop.brand} ${laptop.model} ${laptop.condition} — ${priceStr}`,
        body: body.trim(),
        price,
      };
    }

    case "olx": {
      const body = [
        `${laptop.brand} ${laptop.model} for sale in ${location || "South Africa"}.`,
        `${laptop.condition} condition at ${priceStr}.`,
        "",
        specs.length > 0 ? `Specs: ${specs.join(", ")}` : "",
        laptop.notes ? `\n${laptop.notes}` : "",
        "",
        "Contact seller for more details. Quick sale preferred.",
      ].join("\n").trim();

      return {
        platform: "olx",
        title: `${laptop.brand} ${laptop.model} - ${priceStr} [${laptop.condition}]`,
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
