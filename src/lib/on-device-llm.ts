/**
 * On-Device LLM for offline ad generation.
 * Uses @huggingface/transformers to run Qwen2.5-0.5B-Instruct (quantized)
 * directly in the browser/WebView via WebAssembly.
 *
 * Flow:
 * 1. First call: downloads model (~300MB) to IndexedDB (cached for future)
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

const MODEL_ID = "Xenova/Qwen2.5-0.5B-Instruct";
const MODEL_CONFIG = {
  model: MODEL_ID,
  dtype: "q4" as const,
  device: "wasm",
};

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

    pipeline = await textGeneration("text-generation", MODEL_CONFIG, {
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

// ─── Ad generation ──────────────────────────────────────

const PLATFORM_INSTRUCTIONS: Record<Platform, string> = {
  whatsapp: `WhatsApp format rules: Max 500 chars. Use *bold* and _italic_. Hook opener. Top 3 specs only. Bold price. Urgent CTA. 2-3 emojis.`,
  facebook: `Facebook Marketplace format: Full listing. Emoji headers. Sections: Specs, Condition, Why Buy, Perfect For. Trust signals. Price prominently. Friendly CTA.`,
  gumtree: `Gumtree SA format: "FOR SALE:" opener. Professional tone. Clean spec list. Honest condition. Price stated. "Serious buyers only" CTA.`,
  olx: `OLX SA format: Price in title. Emoji headers. Structured sections. Justify price. "Message on OLX" CTA. Short paragraphs.`,
};

function buildLLMPrompt(platform: Platform, laptop: Laptop): string {
  const platformRules = PLATFORM_INSTRUCTIONS[platform];
  const priceStr = formatPrice(laptop.askingPrice);

  const specs = [
    laptop.cpu && `CPU: ${laptop.cpu}`,
    laptop.ram && `RAM: ${laptop.ram}`,
    laptop.storage && `Storage: ${laptop.storage}`,
    laptop.gpu && `GPU: ${laptop.gpu}`,
    laptop.screenSize && `Screen: ${laptop.screenSize}"`,
  ].filter(Boolean).join(", ");

  return `You are an expert ad writer for South African marketplaces. Write a ${platform.toUpperCase()} ad for this laptop. Be honest, persuasive, mobile-friendly. Use Rands. South African English.

Laptop: ${laptop.brand} ${laptop.model}
Condition: ${laptop.condition}
Battery: ${laptop.batteryHealth}
Specs: ${specs || "Contact for specs"}
Price: ${priceStr}
${laptop.year ? `Year: ${laptop.year}` : ""}
${laptop.color ? `Colour: ${laptop.color}` : ""}
${laptop.notes ? `Notes: ${laptop.notes}` : ""}

${platformRules}

Respond ONLY with valid JSON: {"title": "ad title here", "body": "ad body here"}`;
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

    const result = await pipeline(prompt, {
      max_new_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
    });

    const generated = result[0]?.generated_text || "";
    // Extract only the assistant response (after the last occurrence of the JSON)
    const responsePart = generated.includes("{")
      ? generated.substring(generated.lastIndexOf("{"))
      : generated;

    const parsed = extractJsonFromLLM(responsePart);

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
    console.error("On-device LLM generation failed:", err);
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
