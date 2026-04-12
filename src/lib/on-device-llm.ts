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
  | "loading"        // Loading into memory
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

function notifyListeners() {
  const progress: ModelProgress = {
    status: currentStatus,
    progress: currentProgress,
    loadedBytes,
    totalBytes,
    errorMessage,
  };
  listeners.forEach((fn) => fn(progress));
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

export async function loadModel(): Promise<boolean> {
  if (pipeline) return true;
  if (currentStatus === "downloading" || currentStatus === "loading") return false;

  try {
    // Setup environment
    const env = await importEnv();
    env.allowLocalModels = false;

    // Configure cache (IndexedDB on browser)
    // Default cache dir works for both browser and Capacitor WebView

    // Download & load
    currentStatus = "downloading";
    currentProgress = 0;
    notifyListeners();

    const textGeneration = await importTextGenerationPipeline();

    pipeline = await textGeneration("text-generation", MODEL_ID, {
      dtype: "q4",
      device: "wasm",
      progress_callback: (progress: { status: string; loaded?: number; total?: number; progress?: number }) => {
        if (progress.status === "progress" && progress.loaded && progress.total) {
          loadedBytes = progress.loaded;
          totalBytes = progress.total;
          currentProgress = Math.round((progress.loaded / progress.total) * 100);
          if (currentStatus !== "loading") {
            currentStatus = "downloading";
          }
        } else if (progress.status === "done") {
          currentProgress = 100;
        } else if (progress.status === "initiate") {
          currentStatus = "loading";
          currentProgress = 100;
        }
        notifyListeners();
      },
    });

    currentStatus = "ready";
    currentProgress = 100;
    notifyListeners();
    return true;
  } catch (err) {
    console.error("Failed to load on-device model:", err);
    currentStatus = "error";
    errorMessage = err instanceof Error ? err.message : "Failed to load model";
    pipeline = null;
    notifyListeners();
    return false;
  }
}

// ─── Value context builder (shared logic) ──────────────

function buildOnDeviceValueContext(laptop: Laptop): string {
  const angles: string[] = [];
  const specs = `${laptop.cpu} ${laptop.ram} ${laptop.gpu} ${laptop.storage} ${laptop.screenSize}`.toLowerCase();

  // Condition angle
  if (laptop.condition === "Mint" || laptop.condition === "Excellent") {
    angles.push("Near-new condition. Buyer saves thousands vs retail.");
  } else if (laptop.condition === "Good") {
    angles.push("Well-maintained. Every feature works perfectly.");
  } else if (laptop.condition === "Fair") {
    angles.push("Normal wear. Everything works. Great value at this price.");
  } else {
    angles.push("Honest condition. Ideal for budget buyers or parts.");
  }

  // Key spec highlights
  if (specs.includes("m1") || specs.includes("m2") || specs.includes("m3") || specs.includes("m4")) {
    angles.push("Apple Silicon = all-day battery + fast performance.");
  }
  if (specs.includes("rtx 40") || specs.includes("rtx 30")) {
    angles.push("Modern RTX GPU = plays modern games at high settings.");
  } else if (specs.includes("rtx") || specs.includes("gtx")) {
    angles.push("Dedicated GPU = gaming and creative work capable.");
  }
  if (specs.includes("i7") || specs.includes("i9") || specs.includes("ryzen 7") || specs.includes("ryzen 9")) {
    angles.push("High-performance CPU for demanding workloads.");
  } else if (specs.includes("i5") || specs.includes("ryzen 5")) {
    angles.push("Solid mid-range performance. Great value.");
  }
  if (specs.includes("16gb") || specs.includes("32gb")) {
    angles.push("Plenty of RAM for smooth multitasking.");
  }
  if (specs.includes("1tb") || specs.includes("2tb")) {
    angles.push("Large storage capacity.");
  }
  if (specs.includes("oled")) {
    angles.push("Premium OLED display with perfect blacks.");
  }

  // Battery
  if (laptop.batteryHealth?.toLowerCase().includes("excellent") || laptop.batteryHealth?.toLowerCase().includes("95")) {
    angles.push("Excellent battery health - all-day battery life.");
  }

  // Purchase price context
  if (laptop.purchasePrice && laptop.askingPrice && laptop.purchasePrice > laptop.askingPrice) {
    angles.push("Priced below cost - urgent sale.");
  }

  return angles.join(" ");
}

// ─── Platform-specific instructions for on-device LLM ──

const ON_DEVICE_PLATFORM_RULES: Record<Platform, string> = {
  whatsapp: `WHATSAPP FORMAT: Max 500 chars total. Use *bold* and _italic_. Lead with the biggest selling point. Top 3 specs only. Bold price line. One urgent CTA ("DM now"). 2-3 emojis max. Every line must earn its space. No generic phrases.`,

  facebook: `FACEBOOK FORMAT: Full listing 300-600 words. Title with brand+model+spec+price. Open with strongest benefit (not fact). Use emoji headers: Specs, Condition, Why Buy, Perfect For, What's Included. Add trust signals: well maintained, original charger, smoke-free. Include competitive price context. Close with CTA + delivery info.`,

  gumtree: `GUMTREE FORMAT: Professional classified. Title: Brand+Model+Condition+Price. "FOR SALE:" opener. Clean spec list. HONEST condition section - mention wear upfront. Value justification. Price on own line. "Contact to arrange viewing" CTA. Max 3-4 emojis. Direct, honest, no-nonsense tone.`,

  olx: `OLX FORMAT: Price MUST be in title ("Brand Model - R X,XXX"). Sections with emoji headers: Summary, Specs, Condition, Price & Value, What's Included. Short paragraphs. Justify the price. OLX-specific CTA. Professional tone. No ALL CAPS.`,
};

// ─── Ad generation ──────────────────────────────────────

function buildLLMPrompt(platform: Platform, laptop: Laptop): string {
  const platformRules = ON_DEVICE_PLATFORM_RULES[platform];
  const priceStr = formatPrice(laptop.askingPrice);
  const valueContext = buildOnDeviceValueContext(laptop);

  const specs = [
    laptop.cpu && `CPU: ${laptop.cpu}`,
    laptop.ram && `RAM: ${laptop.ram}`,
    laptop.storage && `Storage: ${laptop.storage}`,
    laptop.gpu && `GPU: ${laptop.gpu}`,
    laptop.screenSize && `Screen: ${laptop.screenSize}"`,
  ].filter(Boolean).join(", ");

  const laptopInfo = [
    `LAPTOP: ${laptop.brand} ${laptop.model}`,
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
You are a South African marketplace ad writer. Write honest, persuasive, mobile-friendly ads. Use Rands. SA English spelling. You MUST respond ONLY with valid JSON: {"title": "ad title", "body": "ad body"}. No other text. No explanation. Just the JSON object.`;

  const userContent = `Write a ${platform.toUpperCase()} ad for this laptop.\n\n${laptopInfo}\n\n${valueContext}\n\n${platformRules}`;

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
  if (!pipeline || currentStatus !== "ready") return null;

  currentStatus = "generating";
  notifyListeners();

  try {
    const prompt = buildLLMPrompt(platform, laptop);

    console.log("[on-device-llm] Generating ad, prompt length:", prompt.length);

    const result = await pipeline(prompt, {
      max_new_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
    });

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

    console.log("[on-device-llm] Raw output length:", generated.length);

    // Strip prompt echo — remove everything up to the last assistant marker
    const assistantMarker = "<|im_start|>assistant";
    if (generated.includes(assistantMarker)) {
      generated = generated.substring(generated.lastIndexOf(assistantMarker) + assistantMarker.length);
    }
    // Clean up any remaining chat markers
    generated = generated.replace(/<\|im_(start|end)\|>/g, "").trim();

    // Strip Qwen3 thinking tags (safety net in case /no_think didn't work)
    generated = generated.replace(/<think\b[^>]*>[\s\S]*?<\/think>\s*/gi, "").trim();

    console.log("[on-device-llm] Cleaned output:", generated.substring(0, 300));

    const parsed = extractJsonFromLLM(generated);

    if (parsed && parsed.title && parsed.body) {
      let body = parsed.body;
      // Enforce WhatsApp limit
      if (platform === "whatsapp" && body.length > 500) {
        body = body.substring(0, 497) + "...";
      }

      currentStatus = "ready";
      notifyListeners();

      return {
        platform,
        title: parsed.title,
        body,
        price: laptop.askingPrice,
      };
    }

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
  return currentStatus === "ready" && pipeline !== null;
}

export function resetModel() {
  pipeline = null;
  currentStatus = "idle";
  currentProgress = 0;
  loadedBytes = 0;
  totalBytes = 0;
  errorMessage = "";
  notifyListeners();
}
