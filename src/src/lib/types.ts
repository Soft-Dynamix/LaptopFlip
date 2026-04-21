export interface LaptopFormData {
  brand: string;
  model: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  screenSize: string;
  condition: string;
  batteryHealth: string;
  purchasePrice: string;
  askingPrice: string;
  notes: string;
  color: string;
  year: string;
  serialNumber: string;
  repairs: string;
  features: string;
  location: string;
}

export const defaultLaptopForm: LaptopFormData = {
  brand: "",
  model: "",
  cpu: "",
  ram: "",
  storage: "",
  gpu: "",
  screenSize: "",
  condition: "Good",
  batteryHealth: "Good",
  purchasePrice: "",
  askingPrice: "",
  notes: "",
  color: "",
  year: "",
  serialNumber: "",
  repairs: "",
  features: "",
  location: "",
};

export interface Laptop {
  id: string;
  brand: string;
  model: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  screenSize: string;
  condition: string;
  batteryHealth: string;
  purchasePrice: number;
  askingPrice: number;
  notes: string;
  photos: string;
  status: string;
  color: string;
  year: number;
  serialNumber: string;
  repairs: string;
  features: string;
  stockId: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  listings?: Listing[];
}

export interface Listing {
  id: string;
  laptopId: string;
  platform: string;
  adTitle: string;
  adBody: string;
  price: number;
  status: string;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Platform = "facebook" | "whatsapp" | "gumtree" | "olx";

export interface AdPreview {
  platform: Platform;
  title: string;
  body: string;
  price: number;
}

export const PLATFORMS: { id: Platform; name: string; icon: string; color: string }[] = [
  { id: "facebook", name: "Facebook", icon: "facebook", color: "#1877F2" },
  { id: "whatsapp", name: "WhatsApp", icon: "message-circle", color: "#25D366" },
  { id: "gumtree", name: "Gumtree", icon: "tag", color: "#00A650" },
  { id: "olx", name: "OLX", icon: "shopping-bag", color: "#F7A300" },
];

export const CONDITIONS = ["Mint", "Excellent", "Good", "Fair", "Poor"] as const;
export const BATTERY_HEALTH = ["Excellent", "Good", "Fair", "Poor"] as const;
export const STATUSES = ["draft", "active", "sold", "archived"] as const;

export const POPULAR_BRANDS = [
  "Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "MSI", "Microsoft",
  "Samsung", "Huawei", "Toshiba", "LG", "Razer", "Gigabyte", "Honor",
];

export const RAM_OPTIONS = ["2GB", "4GB", "8GB", "16GB", "32GB", "64GB", "128GB"];
export const STORAGE_OPTIONS = [
  "128GB SSD", "256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD",
  "256GB HDD", "500GB HDD", "1TB HDD", "2TB HDD",
];

export interface ActivityLogEntry {
  id: string;
  laptopId: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface BuyerContact {
  id: string;
  laptopId: string;
  name: string;
  phone: string;
  email: string;
  platform: string;
  message: string;
  status: 'new' | 'contacted' | 'interested' | 'not_interested' | 'sold_to';
  createdAt: string;
}

// ─── Currency & Locale helpers ─────────────────────────

export type CurrencyCode = "ZAR" | "USD" | "GBP" | "EUR";

export const CURRENCY_OPTIONS: { code: CurrencyCode; symbol: string; label: string; locale: string }[] = [
  { code: "ZAR", symbol: "R", label: "ZAR (R)", locale: "en-ZA" },
  { code: "USD", symbol: "$", label: "USD ($)", locale: "en-US" },
  { code: "GBP", symbol: "£", label: "GBP (£)", locale: "en-GB" },
  { code: "EUR", symbol: "€", label: "EUR (€)", locale: "de-DE" },
];

export const REGION_OPTIONS = [
  { id: "south-africa", label: "South Africa" },
  { id: "kenya", label: "Kenya" },
  { id: "nigeria", label: "Nigeria" },
  { id: "international", label: "International" },
];

export function formatPrice(amount: number, currency?: CurrencyCode): string {
  const effectiveCurrency = currency ?? getAppCurrency();
  const option = CURRENCY_OPTIONS.find((c) => c.code === effectiveCurrency) ?? CURRENCY_OPTIONS[0];
  return new Intl.NumberFormat(option.locale, {
    style: "currency",
    currency: option.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Read the user's preferred currency from localStorage (works on client only) */
export function getAppCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "ZAR";
  try {
    const raw = localStorage.getItem("laptopflip_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.currency) return parsed.currency as CurrencyCode;
    }
  } catch {
    // ignore
  }
  return "ZAR";
}

// ─── Notifications ─────────────────────────

export interface AppNotification {
  id: string;
  type: "stale_listing" | "price_suggestion" | "welcome_back" | "tip" | "draft_reminder";
  title: string;
  message: string;
  laptopId?: string;
  timestamp: string;
  dismissed: boolean;
}

export const CONTACT_STATUSES = [
  { value: "new", label: "New", color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
  { value: "contacted", label: "Contacted", color: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300" },
  { value: "interested", label: "Interested", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  { value: "not_interested", label: "Not Interested", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  { value: "sold_to", label: "Sold To", color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
] as const;

export const CONTACT_PLATFORMS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "gumtree", label: "Gumtree" },
  { value: "olx", label: "OLX" },
  { value: "other", label: "Other" },
] as const;
