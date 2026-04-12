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

export function isLocalMode(): boolean {
  return _localMode === true;
}

/** Detect whether the server is reachable (quick probe) */
async function detectServer(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("/api/laptops", {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/** Ensure we know which mode to use */
async function ensureMode(): Promise<boolean> {
  if (_localMode !== null) return !_localMode; // true = server available
  const serverUp = await detectServer();
  _localMode = !serverUp;
  return serverUp;
}

// ─── Exported wrapper functions ─────────────────────────

/**
 * Fetch all laptops. Returns `Laptop[]`.
 */
export async function apiFetchLaptops(): Promise<Laptop[]> {
  const serverUp = await ensureMode();
  if (serverUp) {
    try {
      const res = await fetch("/api/laptops");
      if (res.ok) {
        const data = await res.json();
        return data as Laptop[];
      }
    } catch {
      // fall through to local
    }
    // Server was up but this call failed — switch to local
    _localMode = true;
  }
  return localFetchLaptops();
}

/**
 * Fetch a single laptop by ID. Returns `Laptop` or `null`.
 */
export async function apiFetchLaptop(id: string): Promise<Laptop | null> {
  const serverUp = await ensureMode();
  if (serverUp) {
    try {
      const res = await fetch(`/api/laptops/${id}`);
      if (res.ok) {
        const data = await res.json();
        return data as Laptop;
      }
      if (res.status === 404) return null;
    } catch {
      // fall through to local
    }
    _localMode = true;
  }
  return localFetchLaptop(id);
}

/**
 * Create a new laptop. Returns the created `Laptop`.
 */
export async function apiCreateLaptop(
  data: Record<string, unknown>
): Promise<Laptop> {
  const serverUp = await ensureMode();
  if (serverUp) {
    try {
      const res = await fetch("/api/laptops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        return result as Laptop;
      }
    } catch {
      // fall through to local
    }
    _localMode = true;
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
  const serverUp = await ensureMode();
  if (serverUp) {
    try {
      const res = await fetch(`/api/laptops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        return result as Laptop;
      }
      if (res.status === 404) return null;
    } catch {
      // fall through to local
    }
    _localMode = true;
  }
  return localUpdateLaptop(id, data);
}

/**
 * Delete a laptop. Returns `true` on success.
 */
export async function apiDeleteLaptop(id: string): Promise<boolean> {
  const serverUp = await ensureMode();
  if (serverUp) {
    try {
      const res = await fetch(`/api/laptops/${id}`, {
        method: "DELETE",
      });
      if (res.ok) return true;
      if (res.status === 404) return false;
    } catch {
      // fall through to local
    }
    _localMode = true;
  }
  return localDeleteLaptop(id);
}

/**
 * Generate ads for specified platforms.
 * Returns an array of `AdPreview` objects.
 */
export async function apiGenerateAd(
  laptopId: string,
  platforms: Platform[]
): Promise<AdPreview[]> {
  const serverUp = await ensureMode();
  if (serverUp) {
    try {
      const res = await fetch("/api/generate-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laptopId, platforms }),
      });
      if (res.ok) {
        const data = await res.json();
        // The real API returns an array directly (or { ads: [...] })
        if (Array.isArray(data)) return data as AdPreview[];
        if (data.ads && Array.isArray(data.ads)) return data.ads;
        return [];
      }
    } catch {
      // fall through to local
    }
    _localMode = true;
  }
  return localGenerateAd(laptopId, platforms);
}
