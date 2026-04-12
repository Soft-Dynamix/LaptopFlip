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

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
