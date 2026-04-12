/**
 * Smart fetch wrapper — tries the real API first, falls back to localStorage.
 * This enables LaptopFlip to work offline inside a Capacitor APK.
 */

import type { Laptop, AdPreview, Platform } from "./types";
import {
  localFetchLaptops,
  localFetchLaptop,
  localCreateLaptop,
  localUpdateLaptop,
  localDeleteLaptop,
  localGenerateAd,
} from "./local-api";

// Cache the detected mode so we don't keep hitting a dead server
let _localMode: boolean | null = null;
let _onlineListenerAdded = false;

/** Set local mode and register online listener once */
function switchToLocalMode() {
  _localMode = true;
  if (!_onlineListenerAdded && typeof window !== "undefined") {
    _onlineListenerAdded = true;
    window.addEventListener("online", () => {
      _localMode = false;
    });
  }
}

/**
 * Detect if running inside a Capacitor native shell (APK).
 * Uses multiple detection strategies for reliability.
 */
function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;

  // Strategy 1: Check for Capacitor global injected by @capacitor/core runtime
  const win = window as Record<string, unknown>;
  if (win.Capacitor) {
    const cap = win.Capacitor as Record<string, unknown>;
    if (cap.isNativePlatform && typeof cap.isNativePlatform === "function") {
      try {
        return cap.isNativePlatform() === true;
      } catch {
        // fall through
      }
    }
    // If Capacitor object exists at all, we're likely in a native shell
    return true;
  }

  // Strategy 2: Check protocol — Capacitor custom schemes
  const protocol = window.location.protocol;
  if (protocol === "capacitor:" || protocol === "ionic:") return true;

  // Strategy 3: Check if running on https://localhost (Capacitor androidScheme)
  // During Next.js dev, it's http://localhost:3000, so this won't false-positive
  if (
    protocol === "https:" &&
    window.location.hostname === "localhost" &&
    window.location.port === ""
  ) {
    return true;
  }

  return false;
}

export function isLocalMode(): boolean {
  return _localMode === true;
}

/** Ensure we know which mode to use — synchronous, no slow network probe */
function ensureMode(): boolean {
  if (_localMode !== null) return !_localMode; // true = server available

  // In a Capacitor APK, always use local mode immediately
  if (isCapacitorNative()) {
    switchToLocalMode();
    return false;
  }

  // Default to server mode for web dev
  _localMode = false;
  return true;
}

// ─── Exported wrapper functions ─────────────────────────

/**
 * Fetch all laptops. Returns `Laptop[]`.
 */
export async function apiFetchLaptops(): Promise<Laptop[]> {
  const serverUp = ensureMode();
  if (serverUp) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("/api/laptops", { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          return data as Laptop[];
        }
      }
    } catch {
      // fall through to local
    }
    // Server call failed — switch to local mode permanently
    switchToLocalMode();
  }
  return localFetchLaptops();
}

/**
 * Fetch a single laptop by ID. Returns `Laptop` or `null`.
 */
export async function apiFetchLaptop(id: string): Promise<Laptop | null> {
  const serverUp = ensureMode();
  if (serverUp) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`/api/laptops/${id}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        return data as Laptop;
      }
      if (res.status === 404) return null;
    } catch {
      // fall through to local
    }
    switchToLocalMode();
  }
  return localFetchLaptop(id);
}

/**
 * Create a new laptop. Returns the created `Laptop`.
 */
export async function apiCreateLaptop(
  data: Record<string, unknown>
): Promise<Laptop> {
  const serverUp = ensureMode();
  if (serverUp) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("/api/laptops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const result = await res.json();
        return result as Laptop;
      }
    } catch {
      // fall through to local
    }
    switchToLocalMode();
  }
  return localCreateLaptop(data);
}

/**
 * Update a laptop. Returns the updated `Laptop` or `null` if not found.
 */
export async function apiUpdateLaptop(
  id: string,
  data: Record<string, unknown>
): Promise<Laptop | null> {
  const serverUp = ensureMode();
  if (serverUp) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`/api/laptops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const result = await res.json();
        return result as Laptop;
      }
      if (res.status === 404) return null;
    } catch {
      // fall through to local
    }
    switchToLocalMode();
  }
  return localUpdateLaptop(id, data);
}

/**
 * Delete a laptop. Returns `true` on success.
 */
export async function apiDeleteLaptop(id: string): Promise<boolean> {
  const serverUp = ensureMode();
  if (serverUp) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`/api/laptops/${id}`, {
        method: "DELETE",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) return true;
      if (res.status === 404) return false;
    } catch {
      // fall through to local
    }
    switchToLocalMode();
  }
  return localDeleteLaptop(id);
}

/**
 * Generate ads for specified platforms.
 * Returns an array of `AdPreview` objects.
 *
 * @param laptopId   - Laptop ID to look up
 * @param platforms  - Target platforms
 * @param laptopObj  - Optional pre-fetched laptop object. Passed directly to local
 *                     generation to avoid localStorage lookup issues.
 */
export async function apiGenerateAd(
  laptopId: string,
  platforms: Platform[],
  laptopObj?: Laptop | null
): Promise<AdPreview[]> {
  const serverUp = ensureMode();
  if (serverUp) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("/api/generate-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laptopId, platforms }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data as AdPreview[];
        if (data.ads && Array.isArray(data.ads)) return data.ads;
        return [];
      }
    } catch {
      // fall through to local
    }
    switchToLocalMode();
  }
  return localGenerateAd(laptopId, platforms, laptopObj);
}
