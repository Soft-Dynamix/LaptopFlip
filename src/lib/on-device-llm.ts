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

// ─── Simple context builder — NO spec guessing ──────────────

function buildOnDeviceContext(laptop: Laptop): string {
  const angles: string[] = [];

  // Condition framing only — based on actual condition value
  if (laptop.condition === "Mint" || laptop.condition === "Excellent") {
    angles.push("Near-new condition. Significant saving vs retail.");
  } else if (laptop.condition === "Good") {
    angles.push("Well-maintained. Everything works perfectly.");
  } else if (laptop.condition === "Fair") {
    angles.push("Normal wear. Everything works. Great value at this price.");
  } else {
    angles.push("Honest condition. Ideal for budget buyers or parts.");
  }

  // Pricing context — only based on actual price data
  if (laptop.purchasePrice && laptop.askingPrice && laptop.purchasePrice > laptop.askingPrice) {
    angles.push("Priced below cost - urgent sale.");
  }

  // Battery — only if explicitly provided and good
  if (laptop.batteryHealth?.toLowerCase().includes("excellent")) {
    angles.push("Excellent battery health.");
  }

  // Notes intelligence — only if seller actually mentioned these
  if (laptop.notes) {
    const n = laptop.notes.toLowerCase();
    if (n.includes("fresh") || n.includes("clean install")) {
      angles.push("Fresh OS install — ready to use.");
    }
    if (n.includes("warranty")) {
      angles.push("Warranty available.");
    }
  }

  return angles.join(" ");
}

// ─── Platform-specific instructions for on-device LLM ──

const ON_DEVICE_PLATFORM_RULES: Record<Platform, string> = {
  whatsapp: `WHATSAPP FORMAT: Max 1000 chars. Use *bold* and _italic_. TITLE: "#LF-XXXX Brand Model - R X,XXX". Start with a hook question or bold claim. Write a 2-3 line description about the laptop and why it's great. List specs with ▸ markers, each with a short benefit note. Include "Perfect for:" line with target audience. Include condition + battery description, price, location, WhatsApp. Add trust signals from notes. End with urgent CTA. 3-5 emojis. MINIMUM 500 chars body.`,

  facebook: `FACEBOOK FORMAT: Full rich listing. TITLE: "#LF-XXXX Brand Model - Condition - R X,XXX". Body MUST include ALL sections: (1) Hook line with 💻🔥 emojis, (2) 3-4 line vivid introduction, (3) 2-3 line condition + battery description, (4) Specs list where EACH spec has a benefit note, (5) Features section ONLY if user provided features, (6) "Why This Laptop?" with 3-4 persuasive lines comparing to retail, (7) "Perfect For" section listing 3-4 target audiences, (8) Trust signals 2-4 points, (9) Price + location + WhatsApp, (10) Urgent 2-line CTA. Heavy emoji headers. MINIMUM 1200 chars body.`,

  gumtree: `GUMTREE FORMAT: Full professional classified. TITLE: "Brand Model - Ref: LF-XXXX - Condition - R X,XXX". Body MUST include: FOR SALE opener, 4-6 line vivid description with physical details, numbered specs list where EACH spec has a benefit note, condition + battery section 3-4 lines, "Who Is This Perfect For?" with 3-4 audiences, features ONLY if user provided, trust section 3-4 lines, seller notes, price + contact, CTA. Use ━━━ dividers. MINIMUM 1200 chars body.`,

  olx: `OLX FORMAT: Full marketplace listing. TITLE: "Brand Model - Ref: LF-XXXX — R X,XXX". Body MUST include: Quick summary 3-4 punchy lines, full specs where EACH has a benefit note, battery/condition section 3-4 lines, "Why This Is a Great Deal" 3-4 lines comparing to retail, "Ideal For" with 3-4 audiences, what's included ONLY if user provided, location, price, 2-line CTA. MINIMUM 1200 chars body.`,
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

function buildLLMPrompt(platform: Platform, laptop: Laptop): string {
  const platformRules = ON_DEVICE_PLATFORM_RULES[platform];
  const priceStr = formatPrice(laptop.askingPrice);

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
  ].filter(Boolean).join("\n");

  // System prompt with /no_think to disable Qwen3 reasoning mode
  const systemContent = `/no_think
You are a South African marketplace ad copywriter. Write FULL, DETAILED, PERSUASIVE ads using ONLY the laptop data provided. DO NOT guess or add specs. Use Rands, SA spelling. Your ads must be LONG and SUBSTANTIAL with multiple sections. EACH spec must have a benefit note. Include a "Perfect For" / "Ideal For" target audience section. Minimum 1200 chars body for Facebook/Gumtree/OLX, 500 for WhatsApp. Write like a passionate honest seller. Respond ONLY with valid JSON: {"title": "ad title", "body": "ad body"}. No explanation.`;

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
  platform: Platform
): Promise<AdPreview | null> {
  if (!pipeline || currentStatus !== "ready") {
    log("generateAd", "Not ready — skipping", { hasPipeline: !!pipeline, status: currentStatus });
    return null;
  }

  currentStatus = "generating";
  notifyListeners();

  try {
    const prompt = buildLLMPrompt(platform, laptop);
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
