import { create } from "zustand";
import type { Laptop, LaptopFormData, AdPreview, Platform, ActivityLogEntry, AppNotification, BuyerContact } from "./types";
import { defaultLaptopForm, PLATFORMS } from "./types";
import type { ModelProgress } from "./on-device-llm";

export interface QuickNote {
  text: string;
  timestamp: string;
}

// ─── Sales Pipeline Types ─────────────────────────
export type SalesStage = 'draft' | 'listed' | 'contacted' | 'negotiating' | 'sold';

export const SALES_STAGES: { id: SalesStage; label: string; color: string; darkColor: string; bgColor: string; darkBgColor: string; textColor: string; darkTextColor: string }[] = [
  { id: 'draft',       label: 'Draft',       color: 'bg-gray-500',      darkColor: 'dark:bg-gray-400',      bgColor: 'bg-gray-100',      darkBgColor: 'dark:bg-gray-800/40', textColor: 'text-gray-700',   darkTextColor: 'dark:text-gray-300' },
  { id: 'listed',      label: 'Listed',      color: 'bg-emerald-500',   darkColor: 'dark:bg-emerald-400',   bgColor: 'bg-emerald-100',   darkBgColor: 'dark:bg-emerald-900/40', textColor: 'text-emerald-700', darkTextColor: 'dark:text-emerald-300' },
  { id: 'contacted',   label: 'Contacted',   color: 'bg-sky-500',       darkColor: 'dark:bg-sky-400',       bgColor: 'bg-sky-100',       darkBgColor: 'dark:bg-sky-900/40', textColor: 'text-sky-700',   darkTextColor: 'dark:text-sky-300' },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-amber-500',     darkColor: 'dark:bg-amber-400',     bgColor: 'bg-amber-100',     darkBgColor: 'dark:bg-amber-900/40', textColor: 'text-amber-700', darkTextColor: 'dark:text-amber-300' },
  { id: 'sold',        label: 'Sold',        color: 'bg-rose-500',      darkColor: 'dark:bg-rose-400',      bgColor: 'bg-rose-100',      darkBgColor: 'dark:bg-rose-900/40', textColor: 'text-rose-700',   darkTextColor: 'dark:text-rose-300' },
];

interface AppSettings {
  currency: string;
  region: string;
  whatsappNumber: string;
  defaultLocation: string;
}

interface AppState {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Laptop management
  laptops: Laptop[];
  setLaptops: (laptops: Laptop[]) => void;
  selectedLaptop: Laptop | null;
  setSelectedLaptop: (laptop: Laptop | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  editingLaptopId: string | null;
  setEditingLaptopId: (id: string | null) => void;

  // Ad creator
  isAdCreatorOpen: boolean;
  setIsAdCreatorOpen: (open: boolean) => void;
  adCreatorLaptopId: string | null;
  setAdCreatorLaptopId: (id: string | null) => void;
  selectedPlatforms: Platform[];
  setSelectedPlatforms: (platforms: Platform[]) => void;
  adPreviews: AdPreview[];
  setAdPreviews: (previews: AdPreview[]) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;

  // Ad preview
  previewPlatform: Platform | null;
  setPreviewPlatform: (platform: Platform | null) => void;
  previewAd: AdPreview | null;
  setPreviewAd: (ad: AdPreview | null) => void;
  isPreviewOpen: boolean;
  setIsPreviewOpen: (open: boolean) => void;

  // Photo guide
  photoChecklist: Record<string, boolean>;
  togglePhotoCheck: (key: string) => void;
  resetPhotoChecklist: () => void;

  // Inventory
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;

  // Dashboard
  dashboardStats: {
    totalLaptops: number;
    activeListings: number;
    sold: number;
    totalRevenue: number;
    totalProfit: number;
    avgMargin: number;
  };
  setDashboardStats: (stats: AppState["dashboardStats"]) => void;

  // On-device LLM
  modelProgress: ModelProgress;
  setModelProgress: (progress: ModelProgress) => void;

  // Activity log
  activityLogs: ActivityLogEntry[];
  addActivityLog: (entry: Omit<ActivityLogEntry, "id" | "timestamp">) => void;
  getActivityLogs: (laptopId: string) => ActivityLogEntry[];

  // App settings (persisted to localStorage)
  appSettings: AppSettings;
  setAppSettings: (settings: Partial<AppSettings>) => void;

  // Notifications
  notifications: AppNotification[];
  setNotifications: (notifications: AppNotification[]) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  // Watchlist
  watchlist: string[];
  toggleWatchlist: (laptopId: string) => void;
  isWatched: (laptopId: string) => boolean;

  // Quick Notes
  quickNotes: QuickNote[];
  addQuickNote: (note: string) => void;
  deleteQuickNote: (index: number) => void;

  // Compare feature
  compareIds: string[];
  addToCompare: (laptopId: string) => void;
  removeFromCompare: (laptopId: string) => void;
  clearCompare: () => void;
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean) => void;

  // Sales pipeline
  laptopStages: Record<string, SalesStage>;
  updateLaptopStage: (laptopId: string, stage: SalesStage) => void;
  getLaptopStage: (laptopId: string) => SalesStage;
  clearAllStages: () => void;

  // Buyer contacts (CRM)
  contacts: BuyerContact[];
  setContacts: (contacts: BuyerContact[]) => void;
  addContact: (contact: Omit<BuyerContact, 'id' | 'createdAt'>) => void;
  updateContact: (id: string, updates: Partial<BuyerContact>) => void;
  deleteContact: (id: string) => void;
  isContactsSheetOpen: boolean;
  setContactsSheetOpen: (open: boolean) => void;
  contactsSheetLaptopId: string | null;
  setContactsSheetLaptopId: (id: string | null) => void;

  // Share card
  isShareCardOpen: boolean;
  setIsShareCardOpen: (open: boolean) => void;
}

const defaultChecklist: Record<string, boolean> = {
  "prep-clean": false,
  "prep-lighting": false,
  "prep-background": false,
  "prep-wipe-screen": false,
  "prep-remove-case": false,
  "prep-charge": false,
  "shot-front": false,
  "shot-back": false,
  "shot-screen-on": false,
  "shot-keyboard": false,
  "shot-ports": false,
  "shot-open-angle": false,
  "detail-dent": false,
  "detail-scratch": false,
  "detail-sticker": false,
  "detail-hinge": false,
  "detail-charger": false,
  "detail-box-accessories": false,
  "quality-focused": false,
  "quality-consistent": false,
  "quality-lit": false,
  "quality-8plus": false,
  "quality-all-shots": false,
  "quality-no-glare": false,
  "quality-honest": false,
};

let _activityCounter = 0;

/** Load persisted sales pipeline stages from localStorage */
function loadLaptopStages(): Record<string, SalesStage> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("laptopflip_stages");
    if (raw) {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    }
  } catch {
    // ignore
  }
  return {};
}

/** Persist sales pipeline stages to localStorage */
function persistLaptopStages(stages: Record<string, SalesStage>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("laptopflip_stages", JSON.stringify(stages));
  } catch {
    // ignore
  }
}

/** Load persisted watchlist from localStorage */
function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("laptopflip_watchlist");
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

/** Persist watchlist to localStorage */
function persistWatchlist(watchlist: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("laptopflip_watchlist", JSON.stringify(watchlist));
  } catch {
    // ignore
  }
}

/** Load persisted quick notes from localStorage */
function loadQuickNotes(): QuickNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("laptopflip_quicknotes");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Migrate legacy string[] to QuickNote[]
      const migrated = parsed.slice(0, 10).map((item: string | QuickNote) => {
        if (typeof item === 'string') {
          return { text: item, timestamp: new Date().toISOString() };
        }
        return item as QuickNote;
      });
      return migrated;
    }
  } catch {
    // ignore
  }
  return [];
}

/** Persist quick notes to localStorage */
function persistQuickNotes(notes: QuickNote[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("laptopflip_quicknotes", JSON.stringify(notes.slice(0, 10))); } catch { /* ignore */ }
}

/** Load persisted settings from localStorage */
function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") return { currency: "ZAR", region: "south-africa", whatsappNumber: "", defaultLocation: "" };
  try {
    const raw = localStorage.getItem("laptopflip_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currency: parsed.currency || "ZAR",
        region: parsed.region || "south-africa",
        whatsappNumber: parsed.whatsappNumber || "",
        defaultLocation: parsed.defaultLocation || "",
      };
    }
  } catch {
    // ignore
  }
  return { currency: "ZAR", region: "south-africa", whatsappNumber: "", defaultLocation: "" };
}

/** Persist settings to localStorage */
function persistAppSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("laptopflip_settings", JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Laptop management
  laptops: [],
  setLaptops: (laptops) => set({ laptops }),
  selectedLaptop: null,
  setSelectedLaptop: (laptop) => set({ selectedLaptop: laptop }),
  isDetailOpen: false,
  setIsDetailOpen: (open) => set({ isDetailOpen: open }),
  isFormOpen: false,
  setIsFormOpen: (open) => set({ isFormOpen: open }),
  editingLaptopId: null,
  setEditingLaptopId: (id) => set({ editingLaptopId: id }),

  // Ad creator
  isAdCreatorOpen: false,
  setIsAdCreatorOpen: (open) => set({ isAdCreatorOpen: open }),
  adCreatorLaptopId: null,
  setAdCreatorLaptopId: (id) => set({ adCreatorLaptopId: id }),
  selectedPlatforms: ["facebook", "whatsapp"],
  setSelectedPlatforms: (platforms) => set({ selectedPlatforms: platforms }),
  adPreviews: [],
  setAdPreviews: (previews) => set({ adPreviews: previews }),
  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),

  // Ad preview
  previewPlatform: null,
  setPreviewPlatform: (platform) => set({ previewPlatform: platform }),
  previewAd: null,
  setPreviewAd: (ad) => set({ previewAd: ad }),
  isPreviewOpen: false,
  setIsPreviewOpen: (open) => set({ isPreviewOpen: open }),

  // Photo guide
  photoChecklist: { ...defaultChecklist },
  togglePhotoCheck: (key) =>
    set((state) => ({
      photoChecklist: {
        ...state.photoChecklist,
        [key]: !state.photoChecklist[key],
      },
    })),
  resetPhotoChecklist: () => set({ photoChecklist: { ...defaultChecklist } }),

  // Inventory
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  filterStatus: "all",
  setFilterStatus: (status) => set({ filterStatus: status }),

  // Dashboard
  dashboardStats: {
    totalLaptops: 0,
    activeListings: 0,
    sold: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgMargin: 0,
  },
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

  // On-device LLM
  modelProgress: {
    status: "idle",
    progress: 0,
  },
  setModelProgress: (progress) => set({ modelProgress: progress }),

  // Activity log
  activityLogs: [],
  addActivityLog: (entry) =>
    set((state) => ({
      activityLogs: [
        ...state.activityLogs,
        {
          ...entry,
          id: `act-${++_activityCounter}`,
          timestamp: new Date().toISOString(),
        },
      ],
    })),
  getActivityLogs: (laptopId) =>
    get().activityLogs.filter((log) => log.laptopId === laptopId),

  // App settings
  appSettings: loadAppSettings(),
  setAppSettings: (partial) => {
    const updated = { ...get().appSettings, ...partial };
    set({ appSettings: updated });
    persistAppSettings(updated);
  },

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n
      ),
    })),
  clearNotifications: () => set({ notifications: [] }),

  // Watchlist
  watchlist: loadWatchlist(),
  toggleWatchlist: (laptopId) => {
    set((state) => {
      const isCurrentlyWatched = state.watchlist.includes(laptopId);
      const updated = isCurrentlyWatched
        ? state.watchlist.filter((id) => id !== laptopId)
        : [...state.watchlist, laptopId];
      persistWatchlist(updated);
      return { watchlist: updated };
    });
  },
  isWatched: (laptopId) => {
    return get().watchlist.includes(laptopId);
  },

  // Quick Notes
  quickNotes: loadQuickNotes(),
  addQuickNote: (note) => {
    const newNote: QuickNote = { text: note, timestamp: new Date().toISOString() };
    const updated = [newNote, ...get().quickNotes].slice(0, 10);
    set({ quickNotes: updated });
    persistQuickNotes(updated);
  },
  deleteQuickNote: (index) => {
    const updated = get().quickNotes.filter((_, i) => i !== index);
    set({ quickNotes: updated });
    persistQuickNotes(updated);
  },

  // Compare feature
  compareIds: [],
  addToCompare: (laptopId) => {
    set((state) => {
      if (state.compareIds.length >= 2) {
        return state; // Max 2 items — toast handled by caller
      }
      if (state.compareIds.includes(laptopId)) {
        return state; // Already added
      }
      return { compareIds: [...state.compareIds, laptopId] };
    });
  },
  removeFromCompare: (laptopId) => {
    set((state) => ({
      compareIds: state.compareIds.filter((id) => id !== laptopId),
    }));
  },
  clearCompare: () => set({ compareIds: [] }),
  isCompareOpen: false,
  setIsCompareOpen: (open) => set({ isCompareOpen: open }),

  // Sales pipeline
  laptopStages: loadLaptopStages(),
  updateLaptopStage: (laptopId, stage) => {
    set((state) => {
      const updated = { ...state.laptopStages, [laptopId]: stage };
      persistLaptopStages(updated);
      return { laptopStages: updated };
    });
  },
  getLaptopStage: (laptopId) => {
    return get().laptopStages[laptopId] || 'draft';
  },
  clearAllStages: () => {
    persistLaptopStages({});
    set({ laptopStages: {} });
  },

  // Buyer contacts (CRM)
  contacts: [],
  setContacts: (contacts) => {
    set({ contacts });
    if (typeof window !== "undefined") {
      try { localStorage.setItem("laptopflip_contacts", JSON.stringify(contacts)); } catch { /* ignore */ }
    }
  },
  addContact: (contact) => {
    set((state) => {
      const newContact: BuyerContact = {
        ...contact,
        id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [newContact, ...state.contacts];
      if (typeof window !== "undefined") {
        try { localStorage.setItem("laptopflip_contacts", JSON.stringify(updated)); } catch { /* ignore */ }
      }
      return { contacts: updated };
    });
  },
  updateContact: (id, updates) => {
    set((state) => {
      const updated = state.contacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      if (typeof window !== "undefined") {
        try { localStorage.setItem("laptopflip_contacts", JSON.stringify(updated)); } catch { /* ignore */ }
      }
      return { contacts: updated };
    });
  },
  deleteContact: (id) => {
    set((state) => {
      const updated = state.contacts.filter((c) => c.id !== id);
      if (typeof window !== "undefined") {
        try { localStorage.setItem("laptopflip_contacts", JSON.stringify(updated)); } catch { /* ignore */ }
      }
      return { contacts: updated };
    });
  },
  isContactsSheetOpen: false,
  setContactsSheetOpen: (open) => set({ isContactsSheetOpen: open }),
  contactsSheetLaptopId: null,
  setContactsSheetLaptopId: (id) => set({ contactsSheetLaptopId: id }),

  // Share card
  isShareCardOpen: false,
  setIsShareCardOpen: (open) => set({ isShareCardOpen: open }),
}));
