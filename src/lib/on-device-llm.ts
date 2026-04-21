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

  // ── Condition framing — vivid and emotionally engaging ──
  if (laptop.condition === "Mint" || laptop.condition === "Excellent") {
    angles.push(pick([
      "Showroom-fresh condition, bru — this baby is basically brand new. If I put this next to a sealed unit at Takealot, you genuinely could not tell the difference. Absolute steal compared to retail, and it will not hang around at this price.",
      "This laptop has had such an easy life it barely knows what work is. The screen is flawless, the keyboard is crisp, and the chassis has zero marks. Someone is going to get an incredible deal here — that someone could be you.",
    ]));
  } else if (laptop.condition === "Good") {
    angles.push(pick([
      "Well-loved and running lekker — every cent of this asking price is justified. All ports work, the screen is clear, the battery charges properly. Solid machine that still performs like a champ. The kind of laptop that makes you wonder why anyone pays retail.",
      "Good condition — honest wear on the outside, but functionally spot on. Every key types, every port connects, everything works exactly as it should. This is real value, not marketing fluff.",
    ]));
  } else if (laptop.condition === "Fair") {
    angles.push(pick([
      "Honest wear but still going strong — a budget gem that punches way above its weight. Runs lekker for the price. If you care about function over a shiny lid, this is your machine.",
      "Fair condition — yes, it has some cosmetic marks, but here is the thing: it works FLAWLESSLY. Priced fairly, it is a steal for someone who needs a working machine without spending big.",
    ]));
  } else {
    angles.push(pick([
      "Priced to move, now now — ideal for budget buyers who know a bargain when they see one. Functional and ready to go. Will not last long at this price, bru.",
      "Budget-friendly option that still gets the job done. Perfect for learners, students on a tight budget, or anyone who needs a working machine without the premium price tag.",
    ]));
  }

  // ── Pricing context — FOMO fuel with personality ──
  if (laptop.purchasePrice && laptop.askingPrice && laptop.purchasePrice > laptop.askingPrice) {
    const loss = laptop.purchasePrice - laptop.askingPrice;
    angles.push(`Priced BELOW what the owner paid — that is a R${formatPrice(loss)} loss on their side and YOUR gain. Serious urgency here, bru. This is a now-now situation. My loss is literally your gain.`);
  } else if (laptop.askingPrice && laptop.askingPrice < 5000) {
    angles.push("Under 5k — these budget steals vanish faster than boerewors at a braai. First one to WhatsApp gets the deal. Do not wait for the weekend, message now.");
  } else if (laptop.askingPrice && laptop.askingPrice < 8000) {
    angles.push("Under 8k — sweet spot pricing that attracts serious buyers quickly. At this price, you are getting a machine that costs significantly more brand new at any shop.");
  } else if (laptop.askingPrice && laptop.askingPrice > 15000) {
    angles.push("Premium machine at a killer price. Compare this to retail at Takealot or Incredible Connection and you will see why it is a gem. Save enough for a weekend away.");
  }

  // ── Battery framing with real-life impact ──
  if (laptop.batteryHealth) {
    const b = laptop.batteryHealth.toLowerCase();
    if (b.includes("excellent") || b.includes("95%") || b.includes("100%")) {
      angles.push("Battery health is absolutely mint — hours away from the charger, no stress. Get through a full day of lectures or meetings without hunting for a plug point. No loadshedding anxiety here.");
    } else if (b.includes("good") || b.includes("80%") || b.includes("85%") || b.includes("90%")) {
      angles.push("Battery still going strong — easily gets through a solid work session or a few hours of lectures. Fine for desk use with plenty of portable time.");
    }
  }

  // ── Notes intelligence — only if seller actually mentioned these ──
  if (laptop.notes) {
    const n = laptop.notes.toLowerCase();
    if (n.includes("fresh") || n.includes("clean install")) {
      angles.push("Fresh OS install, clean as a whistle — switch on and start working, now now. No bloatware, no previous owner's files, no weird toolbars. Just clean and fast.");
    }
    if (n.includes("warranty")) {
      angles.push("Still under warranty — that is peace of mind you do not get with most second-hand laptops. Buy with complete confidence.");
    }
    if (n.includes("upgraded") || n.includes("ssd") || n.includes("ram upgrade")) {
      angles.push("Upgraded internals — someone already spent the money so you do not have to, bru. You get the benefits of the upgrade without paying for it.");
    }
    if (n.includes("charger") || n.includes("adapter") || n.includes("cable")) {
      angles.push("Comes with charger — save yourself R600-R900 at the shop. Ready to go, nothing extra to buy.");
    }
    if (n.includes("bag") || n.includes("case") || n.includes("sleeve")) {
      angles.push("Includes carry bag/case — bonus value right there. Your new laptop arrives ready to travel.");
    }
    if (n.includes("urgent") || n.includes("moving") || n.includes("leaving") || n.includes("relocat")) {
      angles.push("Seller needs this gone urgently — room for a quick deal, now now. These are the best deals because the motivation is real.");
    }
    if (n.includes("receipt") || n.includes("proof")) {
      angles.push("Proof of purchase available — no funny business. This is a legit sale from a legit seller.");
    }
  }

  // ── Year bonus — recent models get extra hype ──
  if (laptop.year && laptop.year >= 2023) {
    angles.push(`Released ${laptop.year} — still a current-generation machine, barely broken in. Modern specs that will stay relevant for years.`);
  }

  // ── Repairs — honest and trust-building ──
  if (laptop.repairs) {
    angles.push("Repairs have been done — full transparency because that is how I sell. Professionally repaired and fully functional. I would rather lose a sale than mislead a buyer. Trust matters more than a quick buck.");
  }

  return angles.join(" ");
}

/** Pick a random item from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Platform-specific instructions for on-device LLM ──

const ON_DEVICE_PLATFORM_RULES: Record<Platform, string> = {
  whatsapp: `WHATSAPP FORMAT — Make every character count, bru!
Max 1000 chars. Use *bold* and _italic_ for punch.
TITLE: "#LF-XXXX Brand Model - R X,XXX"

HOOK — Open with a BOLD statement that stops the scroll. Choose a different style each time:
- Provocative question: "Why pay R15k when THIS exists?"
- Bold claim: "I'm about to save someone a lot of money."
- FOMO: "Two people have asked about this today. Still available — for now."
- Story: "Checked Takealot yesterday. Same specs for R18k. This one? A fraction."

Then 2-3 vivid lines about why this laptop is an absolute gem. Use sensory language — describe how the keyboard feels, how fast it boots, what the screen looks like.
List specs with ▸ markers — EVERY spec gets a SHORT benefit note that tells the buyer WHY IT MATTERS TO THEM.
Add a "Perfect for:" line calling out who needs this machine — be SPECIFIC, not generic. Instead of "students", try "Matric students heading to varsity next year".
Include condition + battery honesty (Honest Hustler style — real talk, not hype. Be honest but frame everything as buyer value).
Include "📍 Location: [location]" and "📲 WhatsApp: [number]" BEFORE the CTA.
End with an URGENT CTA that creates REAL FOMO — "first to WhatsApp locks it in", "won't last", "bookmark this then panic-check tomorrow".
Use 3-5 emojis total — spicy but not spammy.
MANDATORY: MINIMUM 500 chars body. Make it impossible to scroll past.`,

  facebook: `FACEBOOK FORMAT — Go all out, bru. This is where you WIN buyers.
TITLE: "#LF-XXXX Brand Model - Condition - R X,XXX"

Body MUST include ALL sections with HEAVY emoji headers:

(1) HOOK LINE — Open with 💻🔥 and a BOLD claim that creates instant FOMO. Choose a different style each ad:
- Provocative question: "Why would anyone pay R20k for this when this one exists?"
- Bold value claim: "Let me save you R10k right now. No, seriously."
- Story hook: "Walked into Incredible Connection yesterday. Same specs for R18k. This one? A fraction."
- Humour: "My wallet is crying but yours is about to be very happy."
- FOMO: "One of the best deals I've listed — and I list a LOT."
- Direct challenge: "I dare you to find this spec at this condition for this price anywhere else."

(2) VIVID INTRO — 3-4 lines painting a PICTURE. Make the buyer FEEL like they already own it. "Imagine opening this at your favourite coffee shop..." Use sensory language.
(3) CONDITION + BATTERY — 2-3 lines of honest hustler talk. Add physical details: "keyboard has that satisfying click", "hinge is tight with zero wobble". Real condition, no fluff, but frame every detail as buyer value.
(4) SPECS LIST — EVERY spec gets a ▸ marker AND a SPECIFIC benefit note. "16GB RAM ▸ Run 30+ Chrome tabs, Spotify, and Excel without a stutter" — that energy. Not generic — RELATABLE.
(5) WHY THIS PRICE IS A STEAL — 2-3 lines comparing to retail at Takealot, Incredible Connection. "That saving could cover a weekend away at the coast, bru."
(6) FEATURES SECTION — ONLY if user provided features. Make each one sound like a bonus they're getting for free.
(7) "Perfect For" — 3-4 SPECIFIC audiences. Make each feel personally addressed: "Matric students who need a reliable study partner", "Side-hustlers building something after hours".
(8) TRUST SIGNALS — 2-4 bullet points. Make each SPECIFIC: "Fresh Windows 11 — no bloatware, clean as a whistle from day one".
(9) CONTACT BLOCK — "📍 Location: [location]" + "📲 WhatsApp: [number]" + "💵 Price: R X,XXX"
(10) URGENT CTA — 2 lines. "Don't sleep on this" energy. "Don't be the person who sees this tomorrow and finds it's gone."

Add SA hashtags at the end: #laptopsforsale #southafrica #capetown #johannesburg #durban #techdeals
MANDATORY: Always include Location, WhatsApp, and Price. MINIMUM 1200 chars body. Write like you NEED to sell this today.`,

  gumtree: `GUMTREE FORMAT — Professional classified that still HITS HARD, bru.
TITLE: "Brand Model - Ref: LF-XXXX - Condition - R X,XXX"

Body MUST include ALL sections:

FOR SALE opener — Bold, urgent, impossible to ignore. Choose a different style each time:
- "If you're reading this, you're in the right place — this is the deal everyone's looking for."
- "Stop browsing. I know what you're thinking — 'just another laptop ad.' But trust me, this one's different."
- "FOR SALE — and before you scroll past, check the price. Then check the condition."

VIVID DESCRIPTION — 4-6 lines with physical details. Paint the picture. "The keyboard has that satisfying tactile click", "the screen pops with colour", "the chassis still has that premium weight". Explain WHY someone should buy THIS specific laptop.

SPECS LIST — Numbered, where EACH spec has a SPECIFIC benefit note: "16GB RAM — run Chrome with 50 tabs, no sweat." Not generic — RELATABLE to what buyers actually do.

CONDITION + BATTERY — 3-4 lines. Honest Hustler style: real talk but frame every detail as buyer value. If Mint: "if I put this next to a sealed unit, you'd never know the difference." If Fair: "honest wear, but at this price it's an absolute gem."

"Who Is This Perfect For?" — 3-4 audiences with PERSONALITY:
- "University students who need a reliable companion for lectures, assignments, and late-night study sessions"
- "Remote workers who want a solid WFH machine without spending their entire bonus"
- "Anyone upgrading from an old laptop that crashes during Zoom calls"

FEATURES SECTION — ONLY if user provided features. Frame each as an unexpected bonus.

TRUST SECTION — 3-4 lines. Why buy from THIS seller. "Honest selling, fair prices, fast communication." What makes this deal trustworthy. Be warm but professional.

SELLER NOTES — Any notes from the seller, woven in naturally.

"Price & Contact" — price + location + WhatsApp number. Clean and easy to find.

CTA — Urgent, specific. "WhatsApp me now — I respond fast. No time wasters, no 'is this still available' messages. If the ad is up, it's available."

Use ━━━ dividers between sections. MANDATORY: Location and WhatsApp in Price & Contact. MINIMUM 1200 chars body.`,

  olx: `OLX FORMAT — Marketplace listing that stands out from the crowd, bru.
TITLE: "Brand Model - Ref: LF-XXXX — R X,XXX"

Body MUST include ALL sections:

QUICK SUMMARY — 3-4 PUNCHY lines that hook immediately. Choose a different style each time:
- "This is the ad you bookmark and then panic-check to see if it's still available."
- "Stop what you're doing and read this. I'm about to save you thousands."
- "Forget browsing. THIS is the laptop you've been looking for at a price that doesn't make sense."
"Rare find at this price" energy. Make it IMPOSSIBLE to scroll past.

FULL SPECS — Every spec gets a SPECIFIC, RELATABLE benefit note. Don't just list specs — SELL each one:
- "512GB SSD — boot up in seconds, not minutes. No more waiting for your laptop to start while your coffee gets cold."
- "16GB RAM — multitask like a boss without the lag"
- "15.6" FHD — crisp visuals for work and Netflix"

BATTERY & CONDITION — 3-4 lines. Honest but exciting. Paint a picture of what the buyer will experience. Add physical details. Frame every detail as buyer value.

"WHY THIS IS A GREAT DEAL" — 3-4 lines comparing to retail. Mention Takealot, Incredible Connection, Makro prices. "That saving could cover a few months of groceries." Make them feel SMART for buying this.

"Ideal For" — 3-4 audiences. Speak DIRECTLY to each:
- "Matric students heading to varsity — get sorted NOW before the rush"
- "Working parents who need a dependable home office machine"
- "Anyone tired of their ancient laptop crashing during Zoom calls"

INCLUDED — ONLY if user provided accessories. Frame as bonus value: "charger included — save yourself R800 at the shop."

CONTACT BLOCK — "📍 Location: [location]" + "📲 WhatsApp: [number]" + "💰 Price: R X,XXX"

CTA — 2 urgent lines. "Don't wait — someone else is reading this right now, bru." "Message me for more photos or a video walkthrough — I reply within minutes."

MANDATORY: Location, WhatsApp, and Price near the end. MINIMUM 1200 chars body. Make this the listing they CANNOT ignore.`,
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
  // ── The Honest Hustler persona — MORE DETAILED VERSION ──
  const systemContent = `/no_think
You are "The Honest Hustler" — South Africa's most exciting and trusted pre-owned laptop ad writer. You are the friend everyone sends to "go look at the laptop before I buy" because you tell it straight AND make it sound like an absolute steal. Your ads get shared in family WhatsApp groups and sell within HOURS.

YOUR PERSONALITY:
- ENTHUSIASTIC but NEVER dishonest. You hype what is REAL. If it is Mint, you say "showroom fresh, bru — not a single mark." If it is Fair, you say "honest wear, but at this price it is a gem" — you do not hide it, you FRAME it.
- Vary your sentence length: mix short punchy zingers with longer flowing descriptive lines. This rhythm keeps people READING.
- Use POWER WORDS naturally: "steal", "gem", "rare find", "killer deal", "lekker", "now now", "bru", "criminally underpriced", "unicorn". Not every sentence — just where it hits right.
- Create REAL FOMO without being fake: "First to WhatsApp locks it in." "This one will not hang around." "Priced to move." "Two people have already asked about this today."
- Describe the PHYSICAL EXPERIENCE vividly: "keyboard has that satisfying click", "screen pops with colour", "chassis has that premium weight", "hinge opens smoothly with no wobble"
- Frame the price as a SMART FINANCIAL MOVE: "Why drop R20k at Takealot when this does the SAME job?" "Save enough for a weekend away at the coast, bru."
- Add SA flavour naturally — one or two touches per ad, not forced: "bru", "ja", "lekker", "now now", "just now", "ag man", "eish"
- Reference SA culture when it fits: loadshedding, braai culture, Varsity life, Cape Town vs Joburg, Takealot vs Incredible Connection
- Use SA spelling: colour, metre, programme, organise, centre
- Write like you are selling YOUR OWN laptop to a mate — passionate, a bit loud, 100% honest

YOUR RULES:
- Write FULL, DETAILED, PERSUASIVE ads using ONLY the laptop data provided. NEVER guess or invent specs, ports, or features.
- If a spec is not provided, DO NOT include it and DO NOT guess what it might be.
- Use South African Rands (R X,XXX). Use SA spelling.
- EVERY spec you list MUST have a SPECIFIC, RELATABLE benefit note. "16GB RAM" alone is boring. "16GB RAM — multitask like a boss, no lag" sells.
- Include a "Perfect For" / "Ideal For" target audience section with SPECIFIC audiences that feel personally addressed. Not generic "students" — try "Matric students heading to varsity" or "Side-hustlers building a business after hours".
- Minimum 1200 chars body for Facebook/Gumtree/OLX. Minimum 500 chars for WhatsApp.
- Make the ad LONG and SUBSTANTIAL with multiple sections. Short ads do not sell laptops, bru.
- Your writing must make someone feel like they would be SILLY not to WhatsApp right now.
- Use emotion: excitement about the deal, urgency to act, trust in the seller, desire to own the laptop.
- Choose a DIFFERENT hook style each time — do not repeat the same opening.

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
