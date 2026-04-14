/**
 * On-Device LLM for offline ad generation.
 * Uses @huggingface/transformers v4 to run Qwen3-0.6B (quantized)
 * directly in the browser/WebView via WebAssembly.
 *
 * Flow:
 * 1. First call: downloads model (~350MB) to IndexedDB (cached for future)
 * 2. Subsequent calls: loads from cache, generates ads locally
 * 3. Fallback: smart templates if model fails to load
 */

import type { Laptop, Platform, AdPreview } from "./types";
import { formatPrice } from "./types";

// ─── Types ──────────────────────────────────────────────

export type ModelStatus =
  | "idle"           // Not attempted yet
  | "downloading"    // Downloading model files
  | "loading"        // Loading into memory / WASM
  | "ready"          // Model loaded, ready to generate
  | "generating"     // Currently generating
  | "error";         // Failed

export interface ModelProgress {
  status: ModelStatus;
  progress: number;       // 0-100
  loadedBytes?: number;
  totalBytes?: number;
  errorMessage?: string;
}

// ─── Model config ───────────────────────────────────────

const MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";

// ─── State (module-level, not React state) ──────────────

let pipeline: Awaited<ReturnType<typeof importTextGenerationPipeline>> | null = null;
let currentStatus: ModelStatus = "idle";
let currentProgress = 0;
let loadedBytes = 0;
let totalBytes = 0;
let errorMessage = "";
const listeners: Set<(progress: ModelProgress) => void> = new Set();

// ─── Dynamic import helpers ─────────────────────────────

let cachedEnv: Awaited<ReturnType<typeof import("@huggingface/transformers").env>> | null = null;
let cachedPipeline: typeof importTextGenerationPipeline | null = null;

async function importEnv() {
  if (!cachedEnv) {
    const mod = await import("@huggingface/transformers");
    cachedEnv = mod.env;
  }
  return cachedEnv;
}

async function importTextGenerationPipeline() {
  if (!cachedPipeline) {
    const mod = await import("@huggingface/transformers");
    cachedPipeline = mod.pipeline;
  }
  return cachedPipeline;
}

// ─── Progress tracking ─────────────────────────────────

/** Debug logger — prefix all logs for easy filtering */
function log(tag: string, ...args: unknown[]) {
  console.log(`[on-device-llm] [${tag}]`, ...args);
}

function notifyListeners() {
  const progress: ModelProgress = {
    status: currentStatus,
    progress: currentProgress,
    loadedBytes,
    totalBytes,
    errorMessage,
  };
  log("notify", `status=${currentStatus} progress=${currentProgress}%`);
  listeners.forEach((fn) => {
    try {
      fn(progress);
    } catch (err) {
      console.error("[on-device-llm] Listener callback error:", err);
    }
  });
}

export function onModelProgress(callback: (progress: ModelProgress) => void): () => void {
  listeners.add(callback);
  // Immediately send current state
  callback({
    status: currentStatus,
    progress: currentProgress,
    loadedBytes,
    totalBytes,
    errorMessage,
  });
  return () => listeners.delete(callback);
}

export function getModelStatus(): ModelProgress {
  return {
    status: currentStatus,
    progress: currentProgress,
    loadedBytes,
    totalBytes,
    errorMessage,
  };
}

// ─── Model loading ──────────────────────────────────────

/**
 * V4 progress callback handler.
 * V4 statuses: "initiate" | "download" | "progress" | "progress_total" | "done" | "ready"
 */
function handleProgressEvent(event: {
  status: string;
  loaded?: number;
  total?: number;
  progress?: number;
  file?: string;
  name?: string;
  task?: string;
  model?: string;
}) {
  log("progress-event", JSON.stringify(event));

  switch (event.status) {
    case "download": {
      // V4: starting download of a specific file
      if (currentStatus === "idle") {
        currentStatus = "downloading";
      }
      break;
    }

    case "progress": {
      // Per-file download progress (has loaded, total)
      if (event.loaded != null && event.total != null) {
        loadedBytes = event.loaded;
        totalBytes = event.total;
        currentProgress = Math.round((event.loaded / event.total) * 100);
        if (currentStatus !== "loading") {
          currentStatus = "downloading";
        }
      }
      break;
    }

    case "progress_total": {
      // V4 aggregate progress across all files
      if (event.loaded != null && event.total != null) {
        loadedBytes = event.loaded;
        totalBytes = event.total;
        currentProgress = Math.round((event.loaded / event.total) * 100);
      } else if (event.progress != null) {
        currentProgress = Math.round(event.progress);
      }
      if (currentStatus !== "loading") {
        currentStatus = "downloading";
      }
      break;
    }

    case "done": {
      // Single file download complete
      currentProgress = 100;
      break;
    }

    case "initiate": {
      // Starting to load/parse a file (e.g., from cache into WASM)
      currentStatus = "loading";
      currentProgress = 100;
      log("progress", `Initiating load: ${event.file ?? "unknown"}`);
      break;
    }

    case "ready": {
      // V4: model fully loaded and ready!
      log("progress", `Model ready! task=${event.task} model=${event.model}`);
      // Don't set status here — let the await handler do it
      // so we can also verify the pipeline is valid
      break;
    }

    default: {
      log("progress", `Unknown status: ${event.status}`);
      break;
    }
  }

  notifyListeners();
}

export async function loadModel(): Promise<boolean> {
  // Already loaded
  if (pipeline) {
    log("loadModel", "Pipeline already loaded, returning true");
    return true;
  }
  // Prevent concurrent loads
  if (currentStatus === "downloading" || currentStatus === "loading") {
    log("loadModel", `Already ${currentStatus}, returning false`);
    return false;
  }

  try {
    // Setup environment
    log("loadModel", "Setting up environment...");
    const env = await importEnv();
    env.allowLocalModels = false;

    // Download & load
    currentStatus = "downloading";
    currentProgress = 0;
    loadedBytes = 0;
    totalBytes = 0;
    errorMessage = "";
    notifyListeners();

    const textGeneration = await importTextGenerationPipeline();
    log("loadModel", `Calling pipeline("text-generation", "${MODEL_ID}", {dtype:"q4", device:"wasm"})...`);

    pipeline = await textGeneration("text-generation", MODEL_ID, {
      dtype: "q4",
      device: "wasm",
      progress_callback: handleProgressEvent,
    });

    // Verify the pipeline is actually usable
    if (!pipeline) {
      throw new Error("Pipeline resolved but is null/undefined");
    }

    log("loadModel", "Pipeline loaded successfully!");

    currentStatus = "ready";
    currentProgress = 100;
    notifyListeners();
    log("loadModel", `Status set to "ready". Listeners notified.`);
    return true;
  } catch (err) {
    console.error("[on-device-llm] Failed to load on-device model:", err);
    currentStatus = "error";
    errorMessage = err instanceof Error ? err.message : "Failed to load model";
    pipeline = null;
    notifyListeners();
    log("loadModel", `FAILED: ${errorMessage}`);
    return false;
  }
}

// ─── Context builder — vivid framing angles, NO spec guessing ─

function buildOnDeviceContext(laptop: Laptop): string {
  const angles: string[] = [];

  // ── Condition framing — based on actual condition value ──
  if (laptop.condition === "Mint" || laptop.condition === "Excellent") {
    angles.push("Showroom-fresh condition, bru — this baby is basically brand new. Absolute steal compared to retail, and it won't hang around at this price.");
  } else if (laptop.condition === "Good") {
    angles.push("Well-loved and running lekker — every cent of this asking price is justified. Solid machine that still performs like a champ.");
  } else if (laptop.condition === "Fair") {
    angles.push("Honest wear but still going strong — a budget gem that punches way above its weight. Runs lekker for the price.");
  } else {
    angles.push("Priced to move, now now — ideal for budget buyers who know a bargain when they see one. Won't last long at this price, bru.");
  }

  // ── Pricing context — FOMO fuel ──
  if (laptop.purchasePrice && laptop.askingPrice && laptop.purchasePrice > laptop.askingPrice) {
    const loss = laptop.purchasePrice - laptop.askingPrice;
    angles.push(`Priced BELOW what the owner paid — that's a R${formatPrice(loss)} loss on their side and YOUR gain. Serious urgency here, bru. This is a now-now situation.`);
  } else if (laptop.askingPrice && laptop.askingPrice < 5000) {
    angles.push("Under 5k — these budget steals vanish fast. First one to WhatsApp gets the deal.");
  } else if (laptop.askingPrice && laptop.askingPrice > 15000) {
    angles.push("Premium machine at a killer price. Compare this to retail and you'll see why it's a gem.");
  }

  // ── Battery framing ──
  if (laptop.batteryHealth) {
    const b = laptop.batteryHealth.toLowerCase();
    if (b.includes("excellent") || b.includes("95%") || b.includes("100%")) {
      angles.push("Battery health is absolutely mint — hours away from the charger, no stress.");
    } else if (b.includes("good") || b.includes("80%") || b.includes("85%") || b.includes("90%")) {
      angles.push("Battery still going strong — easily gets through a solid work session.");
    }
  }

  // ── Notes intelligence — only if seller actually mentioned these ──
  if (laptop.notes) {
    const n = laptop.notes.toLowerCase();
    if (n.includes("fresh") || n.includes("clean install")) {
      angles.push("Fresh OS install, clean as a whistle — switch on and start working, now now.");
    }
    if (n.includes("warranty")) {
      angles.push("Still under warranty — that's peace of mind included, lekker deal.");
    }
    if (n.includes("upgraded") || n.includes("ssd") || n.includes("ram upgrade")) {
      angles.push("Upgraded internals — someone already spent the money so you don't have to, bru.");
    }
    if (n.includes("charger") || n.includes("adapter") || n.includes("cable")) {
      angles.push("Comes with charger — ready to go, nothing extra to buy.");
    }
    if (n.includes("bag") || n.includes("case") || n.includes("sleeve")) {
      angles.push("Includes carry bag/case — bonus value right there.");
    }
    if (n.includes("urgent") || n.includes("moving") || n.includes("leaving") || n.includes("relocat")) {
      angles.push("Seller needs this gone urgently — room for a quick deal, now now.");
    }
  }

  // ── Year bonus — recent models get extra hype ──
  if (laptop.year && laptop.year >= 2023) {
    angles.push(`Released ${laptop.year} — still a current-generation machine, barely broken in.`);
  }

  return angles.join(" ");
}

// ─── Platform-specific instructions for on-device LLM ──

const ON_DEVICE_PLATFORM_RULES: Record<Platform, string> = {
  whatsapp: `WHATSAPP FORMAT — Make every character count, bru!
Max 1000 chars. Use *bold* and _italic_ for punch.
TITLE: "#LF-XXXX Brand Model - R X,XXX"

Open with a HOOK — a bold question or statement that stops the scroll. Then 2-3 vivid lines about why this laptop is an absolute gem.
List specs with ▸ markers — EVERY spec gets a short benefit note (not just the spec name — tell them WHY it matters).
Add a "Perfect for:" line calling out who needs this machine.
Include condition + battery honesty (Honest Hustler style — real talk, not hype).
Include "📍 Location: [location]" and "📲 WhatsApp: [number]" BEFORE the CTA.
End with an URGENT CTA that creates FOMO — "first to WhatsApp locks it in", "won't last", etc.
Use 3-5 emojis total — spicy but not spammy.
MANDATORY: MINIMUM 500 chars body. Make it impossible to scroll past.`,

  facebook: `FACEBOOK FORMAT — Go all out, bru. This is where you WIN buyers.
TITLE: "#LF-XXXX Brand Model - Condition - R X,XXX"

Body MUST include ALL sections with HEAVY emoji headers:
(1) HOOK LINE — Open with 💻🔥 and a bold claim that creates instant FOMO. "This won't last" energy.
(2) VIVID INTRO — 3-4 lines painting a picture of who this machine is and why it's special. Use power words: "steal", "gem", "rare find", "lekker".
(3) CONDITION + BATTERY — 2-3 lines of honest hustler talk. Real condition, no fluff, but frame it as a WIN for the buyer.
(4) SPECS LIST — EVERY spec gets a ▸ marker AND a benefit note. "16GB RAM ▸ Multitask like a boss without the lag" — that energy.
(5) FEATURES SECTION — ONLY if user provided features. Make each one sound like a bonus they're getting for free.
(6) "Why This Laptop?" — 3-4 persuasive lines comparing to retail. Show them the saving. Create FOMO.
(7) "Perfect For" — List 3-4 target audiences. Make each feel like YOU'RE TALKING DIRECTLY TO THEM.
(8) TRUST SIGNALS — 2-4 bullet points. Battery health, warranty, fresh install, etc.
(9) CONTACT BLOCK — "📍 Location: [location]" + "📲 WhatsApp: [number]" + "💵 Price: R X,XXX"
(10) URGENT CTA — 2 lines. "Don't sleep on this" energy. Act NOW.

MANDATORY: Always include Location, WhatsApp, and Price. MINIMUM 1200 chars body. Write like you NEED to sell this today.`,

  gumtree: `GUMTREE FORMAT — Professional classified that still HITS HARD, bru.
TITLE: "Brand Model - Ref: LF-XXXX - Condition - R X,XXX"

Body MUST include:
FOR SALE opener — Bold, urgent, impossible to ignore.
VIVID DESCRIPTION — 4-6 lines with physical details. Paint the picture. "This machine walks the walk."
SPECS LIST — Numbered, where EACH spec has a benefit note explaining WHY it matters. "16GB RAM — run Chrome with 50 tabs, no sweat."
CONDITION + BATTERY — 3-4 lines. Honest Hustler style: real talk but frame every detail as buyer value.
"Who Is This Perfect For?" — 3-4 audiences. Make them feel seen. "Working from home? This is your new office."
FEATURES SECTION — ONLY if user provided features. Frame each as an unexpected bonus.
TRUST SECTION — 3-4 lines. Why buy from THIS seller. What makes this deal trustworthy.
SELLER NOTES — Any notes from the seller, woven in naturally.
"Price & Contact" — price + location + WhatsApp number. Clean and easy to find.
CTA — Urgent, specific. "WhatsApp me now — this gem won't hang around."

Use ━━━ dividers between sections. MANDATORY: Location and WhatsApp in Price & Contact. MINIMUM 1200 chars body.`,

  olx: `OLX FORMAT — Marketplace listing that stands out from the crowd, bru.
TITLE: "Brand Model - Ref: LF-XXXX — R X,XXX"

Body MUST include:
QUICK SUMMARY — 3-4 punchy lines that hook immediately. "Rare find at this price" energy.
FULL SPECS — Every spec gets a benefit note. Don't just list specs — SELL each one. "512GB SSD — boot up in seconds, not minutes."
BATTERY & CONDITION — 3-4 lines. Honest but exciting. Frame every flaw as character and every plus as a steal.
"Why This Is a Great Deal" — 3-4 lines comparing to retail. Show the gap. Make them feel SMART for buying this.
"Ideal For" — 3-4 audiences. Speak directly. "Student on a budget? Stop scrolling."
INCLUDED — ONLY if user provided accessories. Frame as bonus value: "charger included — save yourself R500."
CONTACT BLOCK — "📍 Location: [location]" + "📲 WhatsApp: [number]" + "💰 Price: R X,XXX"
CTA — 2 urgent lines. "Don't wait — someone else is reading this right now, bru."

MANDATORY: Location, WhatsApp, and Price near the end. MINIMUM 1200 chars body. Make this the listing they CAN'T ignore.`,
};

// ─── Ad generation ──────────────────────────────────────

/** Maximum time to wait for on-device generation (3 minutes) */
const GENERATION_TIMEOUT_MS = 180_000;

function createGenerationTimeout(): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("On-device generation timed out after 3 minutes")),
      GENERATION_TIMEOUT_MS
    )
  );
}

function buildLLMPrompt(platform: Platform, laptop: Laptop, adSettings?: { whatsappNumber?: string; defaultLocation?: string }): string {
  const platformRules = ON_DEVICE_PLATFORM_RULES[platform];
  const priceStr = formatPrice(laptop.askingPrice);
  const location = laptop.location || adSettings?.defaultLocation || '';
  const whatsapp = adSettings?.whatsappNumber || '';

  const specs = [
    laptop.cpu && `CPU: ${laptop.cpu}`,
    laptop.ram && `RAM: ${laptop.ram}`,
    laptop.storage && `Storage: ${laptop.storage}`,
    laptop.gpu && `GPU: ${laptop.gpu}`,
    laptop.screenSize && `Screen: ${laptop.screenSize}"`,
  ].filter(Boolean).join(", ");

  const laptopInfo = [
    `LAPTOP: ${laptop.brand} ${laptop.model}`,
    laptop.stockId ? `Stock ID: ${laptop.stockId} — include in TITLE: WhatsApp/Facebook as #${laptop.stockId} at start, Gumtree/OLX as "Ref: ${laptop.stockId}" in title` : null,
    `Condition: ${laptop.condition}`,
    `Battery: ${laptop.batteryHealth}`,
    `Specs: ${specs || "Contact for specs"}`,
    `Price: ${priceStr}`,
    laptop.year ? `Year: ${laptop.year}` : null,
    laptop.color ? `Colour: ${laptop.color}` : null,
    laptop.notes ? `Notes: ${laptop.notes}` : null,
    laptop.repairs ? `Repairs: ${laptop.repairs} (be transparent)` : null,
    location ? `Location: ${location}` : null,
    whatsapp ? `WhatsApp Number: ${whatsapp}` : null,
  ].filter(Boolean).join("\n");

  // System prompt with /no_think to disable Qwen3 reasoning mode
  // ── The Honest Hustler persona ──
  const systemContent = `/no_think
You are "The Honest Hustler" — South Africa's most exciting and trusted pre-owned laptop ad writer. You're the friend everyone sends to "go look at the laptop before I buy" because you tell it straight AND make it sound like an absolute steal.

YOUR PERSONALITY:
- Enthusiastic but NEVER dishonest. You hype what's REAL. If it's Mint, you say "showroom fresh, bru." If it's Fair, you say "honest wear, but at this price it's a gem" — you don't hide it, you FRAME it.
- Use power words naturally: "steal", "gem", "rare find", "killer deal", "lekker", "now now", "bru". Not every sentence — just where it hits right.
- Create FOMO without being fake. "First to WhatsApp locks it in." "This one won't hang around." "Priced to move." Real urgency, real energy.
- Write like you're selling YOUR OWN laptop to a mate — passionate, a bit loud, 100% honest.

YOUR RULES:
- Write FULL, DETAILED, PERSUASIVE ads using ONLY the laptop data provided. NEVER guess or invent specs, ports, or features.
- Use South African Rands (R X,XXX). Use SA spelling (colour, metre, etc.).
- EVERY spec you list MUST have a benefit note. "16GB RAM" alone is boring. "16GB RAM — multitask like a boss, no lag" sells.
- Include a "Perfect For" / "Ideal For" target audience section — make them feel seen.
- Minimum 1200 chars body for Facebook/Gumtree/OLX. Minimum 500 chars for WhatsApp.
- Make the ad LONG and SUBSTANTIAL with multiple sections. Short ads don't sell laptops, bru.
- Your writing must make someone feel like they'd be SILLY not to WhatsApp right now.

RESPOND ONLY with valid JSON: {"title": "ad title", "body": "ad body"}. No explanation. No markdown. Just the JSON.`;

  const userContent = `Write a ${platform.toUpperCase()} ad for this laptop. USE ONLY THE DATA BELOW — DO NOT GUESS OR ADD ANY SPECS, PORTS, OR FEATURES.\n\n${laptopInfo}\n\n${buildOnDeviceContext(laptop)}\n\n${platformRules}`;

  // Qwen3 ChatML format — manually applied to avoid pipeline chat template issues
  return `<|im_start|>system\n${systemContent}<|im_end|>\n<|im_start|>user\n${userContent}<|im_end|>\n<|im_start|>assistant\n`;
}

function extractJsonFromLLM(text: string): { title: string; body: string } | null {
  // Try direct parse
  try {
    return JSON.parse(text.trim());
  } catch { /* fall through */ }

  // Try extracting from markdown code block
  const codeMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1].trim()); } catch { /* fall through */ }
  }

  // Try finding JSON object
  const objMatch = text.match(/\{[\s\S]*?"title"[\s\S]*?"body"[\s\S]*?\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
  }

  return null;
}

export async function generateAdWithLLM(
  laptop: Laptop,
  platform: Platform,
  adSettings?: { whatsappNumber?: string; defaultLocation?: string }
): Promise<AdPreview | null> {
  if (!pipeline || currentStatus !== "ready") {
    log("generateAd", "Not ready — skipping", { hasPipeline: !!pipeline, status: currentStatus });
    return null;
  }

  currentStatus = "generating";
  notifyListeners();

  try {
    const prompt = buildLLMPrompt(platform, laptop, adSettings);
    log("generateAd", `Generating ad, prompt length: ${prompt.length}`);

    // Race the generation against a timeout to prevent infinite hangs
    const result = await Promise.race([
      pipeline(prompt, {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
      }),
      createGenerationTimeout(),
    ]);

    // Extract generated text from various possible output formats
    let generated = "";
    if (Array.isArray(result) && result.length > 0) {
      const item = result[0];
      if (typeof item === "string") {
        generated = item;
      } else if (item && typeof item === "object") {
        if ("generated_text" in item) {
          const gt = item.generated_text;
          if (typeof gt === "string") {
            generated = gt;
          } else if (Array.isArray(gt) && gt.length > 0) {
            const lastMsg = gt[gt.length - 1];
            if (lastMsg && typeof lastMsg === "object" && "content" in lastMsg) {
              generated = String(lastMsg.content);
            }
          }
        } else if ("text" in item) {
          generated = String(item.text);
        }
      }
    }

    log("generateAd", `Raw output length: ${generated.length}`);

    // Strip prompt echo — remove everything up to the last assistant marker
    const assistantMarker = "<|im_start|>assistant";
    if (generated.includes(assistantMarker)) {
      generated = generated.substring(generated.lastIndexOf(assistantMarker) + assistantMarker.length);
    }
    // Clean up any remaining chat markers
    generated = generated.replace(/<\|im_(start|end)\|>/g, "").trim();

    // Strip Qwen3 thinking tags (safety net in case /no_think didn't work)
    generated = generated.replace(/<think\b[^>]*>[\s\S]*?<\/think>\s*/gi, "").trim();

    log("generateAd", `Cleaned output (${generated.length} chars):`, generated.substring(0, 300));

    const parsed = extractJsonFromLLM(generated);

    if (parsed && parsed.title && parsed.body) {
      let body = parsed.body;
      // Enforce WhatsApp limit (increased to match template)
      if (platform === "whatsapp" && body.length > 1000) {
        body = body.substring(0, 997) + "...";
      }

      currentStatus = "ready";
      notifyListeners();
      log("generateAd", `Success! Title: "${parsed.title}"`);

      return {
        platform,
        title: parsed.title,
        body,
        price: laptop.askingPrice,
      };
    }

    log("generateAd", "Failed to parse JSON from output");
    currentStatus = "ready";
    notifyListeners();
    return null;
  } catch (err) {
    console.error("[on-device-llm] Generation failed:", err);
    if (err instanceof Error) {
      console.error("[on-device-llm] Error:", err.name, err.message);
    }
    currentStatus = "ready";
    notifyListeners();
    return null;
  }
}

// ─── Utility ────────────────────────────────────────────

export function isModelReady(): boolean {
  const ready = currentStatus === "ready" && pipeline !== null;
  if (!ready && pipeline) {
    log("isModelReady", `Pipeline exists but status=${currentStatus}, forcing status to ready`);
    // Safety net: if pipeline is loaded but status is wrong, fix it
    currentStatus = "ready";
    currentProgress = 100;
    notifyListeners();
    return true;
  }
  return ready;
}

export function resetModel() {
  pipeline = null;
  currentStatus = "idle";
  currentProgress = 0;
  loadedBytes = 0;
  totalBytes = 0;
  errorMessage = "";
  log("resetModel", "Model reset to idle");
  notifyListeners();
}
