"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Laptop,
  Eye,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Plus,
  Camera,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Trophy,
  Clock,
  Wallet,
  Users,
  Hash,
  Share2,
  Heart,
  Activity,
  ArrowUpDown,
  Trash2,
  CircleDot,
  BarChart3,
  StickyNote,
  X,
  Package,
  FileText,
  Rocket,
  Megaphone,
  Layers,
  Zap,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { apiFetchLaptops } from "@/lib/api";
import { formatPrice, CONTACT_STATUSES } from "@/lib/types";
import type { Laptop as LaptopType } from "@/lib/types";
import { PricingCalculator } from "@/components/dashboard/PricingCalculator";
import { SalesAnalytics } from "@/components/dashboard/SalesAnalytics";
import { SalesPipelineTracker } from "@/components/dashboard/SalesPipelineTracker";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

// ─── Emerald shade palette for brand bars ─────────────────────────
const EMERALD_SHADES = [
  "bg-emerald-600 dark:bg-emerald-500",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-teal-500 dark:bg-teal-400",
  "bg-emerald-400 dark:bg-emerald-300",
  "bg-teal-400 dark:bg-teal-300",
  "bg-emerald-300 dark:bg-emerald-200",
  "bg-teal-300 dark:bg-teal-200",
  "bg-emerald-200 dark:bg-emerald-100",
];

// ─── Note color palette (gradient left borders) ─────────────────────────
const NOTE_COLORS = [
  "border-l-amber-400 dark:border-l-amber-500",
  "border-l-emerald-400 dark:border-l-emerald-500",
  "border-l-sky-400 dark:border-l-sky-500",
  "border-l-rose-400 dark:border-l-rose-500",
  "border-l-violet-400 dark:border-l-violet-500",
  "border-l-teal-400 dark:border-l-teal-500",
  "border-l-orange-400 dark:border-l-orange-500",
  "border-l-pink-400 dark:border-l-pink-500",
  "border-l-cyan-400 dark:border-l-cyan-500",
  "border-l-lime-400 dark:border-l-lime-500",
];

const NOTE_BG_COLORS = [
  "bg-amber-50/60 dark:bg-amber-950/20",
  "bg-emerald-50/60 dark:bg-emerald-950/20",
  "bg-sky-50/60 dark:bg-sky-950/20",
  "bg-rose-50/60 dark:bg-rose-950/20",
  "bg-violet-50/60 dark:bg-violet-950/20",
  "bg-teal-50/60 dark:bg-teal-950/20",
  "bg-orange-50/60 dark:bg-orange-950/20",
  "bg-pink-50/60 dark:bg-pink-950/20",
  "bg-cyan-50/60 dark:bg-cyan-950/20",
  "bg-lime-50/60 dark:bg-lime-950/20",
];

// ─── Animated Counter Hook ─────────────────────────
function useCountUp(target: number, duration: number = 800, enabled: boolean = true) {
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [displayValue, setDisplayValue] = useState(0);
  const effectiveTarget = enabled ? target : 0;

  useEffect(() => {
    if (effectiveTarget === 0) return;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * effectiveTarget));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [effectiveTarget, duration]);

  if (!enabled || effectiveTarget === 0) return 0;
  return displayValue;
}

// ─── Time-based Greeting ─────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good Morning", emoji: "☀️" };
  if (hour < 17) return { text: "Good Afternoon", emoji: "🌤️" };
  return { text: "Good Evening", emoji: "🌙" };
}

// ─── Brand Icon Helper ─────────────────────────
function getBrandIcon(brand: string): string {
  const lower = brand.toLowerCase();
  if (lower.includes("apple") || lower.includes("mac")) return "🍎";
  if (lower.includes("dell")) return "💻";
  if (lower.includes("hp")) return "🖥️";
  if (lower.includes("lenovo")) return "📋";
  if (lower.includes("asus")) return "🎮";
  if (lower.includes("acer")) return "💠";
  if (lower.includes("msi")) return "🐉";
  if (lower.includes("samsung")) return "📱";
  if (lower.includes("razer")) return "🐍";
  if (lower.includes("microsoft")) return "🪟";
  return "💻";
}

// ─── Stat Cards Config ─────────────────────────
const statCards = [
  {
    key: "totalLaptops" as const,
    label: "Total Laptops",
    icon: Laptop,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderLeft: "border-l-emerald-500",
  },
  {
    key: "activeListings" as const,
    label: "Active Listings",
    icon: Eye,
    accent: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800",
    iconColor: "text-sky-600 dark:text-sky-400",
    borderLeft: "border-l-sky-500",
  },
  {
    key: "sold" as const,
    label: "Sold",
    icon: CheckCircle2,
    accent: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderLeft: "border-l-amber-500",
  },
  {
    key: "totalRevenue" as const,
    label: "Revenue",
    icon: DollarSign,
    accent: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
    iconColor: "text-rose-600 dark:text-rose-400",
    borderLeft: "border-l-rose-500",
  },
  {
    key: "totalProfit" as const,
    label: "Total Profit",
    icon: TrendingUp,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderLeft: "border-l-emerald-500",
  },
];

function getConditionColor(condition: string) {
  switch (condition) {
    case "Mint":
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "Excellent":
      return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "Good":
      return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "Fair":
      return "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    case "Poor":
      return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  }
}

function getConditionBorderColor(condition: string) {
  switch (condition) {
    case "Mint":
      return "border-l-emerald-500";
    case "Excellent":
      return "border-l-blue-500";
    case "Good":
      return "border-l-yellow-500";
    case "Fair":
      return "border-l-orange-500";
    case "Poor":
      return "border-l-red-500";
    default:
      return "border-l-gray-400";
  }
}

function getConditionDotColor(condition: string) {
  switch (condition) {
    case "Mint": return "bg-emerald-500";
    case "Excellent": return "bg-sky-500";
    case "Good": return "bg-yellow-500";
    case "Fair": return "bg-orange-500";
    case "Poor": return "bg-red-500";
    default: return "bg-gray-400";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "draft":
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    case "active":
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "sold":
      return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "archived":
      return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Relative Time Helper ─────────────────────────
function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${diffWeek}w ago`;
}

// ─── Activity Action Config ─────────────────────────
function getActivityActionConfig(action: string) {
  switch (action) {
    case "price_update":
      return {
        icon: ArrowUpDown,
        bgColor: "bg-amber-100 dark:bg-amber-900/40",
        iconColor: "text-amber-600 dark:text-amber-400",
      };
    case "status_change":
      return {
        icon: RefreshCw,
        bgColor: "bg-blue-100 dark:bg-blue-900/40",
        iconColor: "text-blue-600 dark:text-blue-400",
      };
    case "created":
      return {
        icon: Plus,
        bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      };
    case "deleted":
      return {
        icon: Trash2,
        bgColor: "bg-red-100 dark:bg-red-900/40",
        iconColor: "text-red-600 dark:text-red-400",
      };
    case "ad_created":
      return {
        icon: Sparkles,
        bgColor: "bg-purple-100 dark:bg-purple-900/40",
        iconColor: "text-purple-600 dark:text-purple-400",
      };
    default:
      return {
        icon: CircleDot,
        bgColor: "bg-gray-100 dark:bg-gray-800",
        iconColor: "text-gray-500 dark:text-gray-400",
      };
  }
}

const quickActions = [
  {
    label: "Add Laptop",
    subtitle: "Add inventory",
    icon: Plus,
    gradient: "from-emerald-500 to-emerald-700",
    shadow: "shadow-emerald-500/25",
    action: "add" as const,
  },
  {
    label: "Photo Guide",
    subtitle: "Photo tips",
    icon: Camera,
    gradient: "from-teal-500 to-emerald-600",
    shadow: "shadow-teal-500/25",
    action: "photos" as const,
  },
  {
    label: "My Stock",
    subtitle: "Manage stock",
    icon: Sparkles,
    gradient: "from-emerald-600 to-teal-700",
    shadow: "shadow-emerald-600/25",
    action: "inventory" as const,
  },
];

// ─── Quick Notes Input Component ─────────────────────────
const NOTE_MAX_CHARS = 200;

function QuickNotesInput({ addQuickNote }: { addQuickNote: (note: string) => void }) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed.length <= NOTE_MAX_CHARS) {
      addQuickNote(trimmed);
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          placeholder="Add a quick note..."
          className="flex-1 h-9 text-sm rounded-lg"
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= NOTE_MAX_CHARS) {
              setValue(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="sm"
          className="h-9 w-9 p-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleAdd}
          disabled={!value.trim() || value.trim().length > NOTE_MAX_CHARS}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="flex items-center justify-end">
        <span className={`text-[10px] ${value.length > 180 ? (value.length >= NOTE_MAX_CHARS ? "text-red-500 font-semibold" : "text-amber-500") : "text-muted-foreground/50"}`}>
          {value.length}/{NOTE_MAX_CHARS}
        </span>
      </div>
    </div>
  );
}

// ─── Quick Note Item Component ─────────────────────────
function QuickNoteItem({ note, index, colorIndex, deleteQuickNote }: {
  note: { text: string; timestamp: string };
  index: number;
  colorIndex: number;
  deleteQuickNote: (index: number) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (pendingDelete) {
      if (timerRef.current) clearTimeout(timerRef.current);
      deleteQuickNote(index);
      setPendingDelete(false);
    } else {
      setPendingDelete(true);
      timerRef.current = setTimeout(() => {
        setPendingDelete(false);
      }, 3000);
    }
  };

  return (
    <motion.div
      key={`${note.text}-${index}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={`group flex items-start gap-2.5 p-2.5 rounded-lg border-l-[3px] ${NOTE_COLORS[colorIndex]} ${NOTE_BG_COLORS[colorIndex]} hover:shadow-sm transition-shadow ${pendingDelete ? "bg-red-50/60 dark:bg-red-950/20" : ""}`}
    >
      <div className="min-w-0 flex-1">
        {pendingDelete ? (
          <p className="text-xs text-red-500 dark:text-red-400 font-medium italic">Tap again to delete</p>
        ) : (
          <p className="text-xs text-foreground/90 leading-relaxed">{note.text}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
          <Clock className="size-2.5" />
          {note.timestamp ? formatRelativeTime(note.timestamp) : ""}
        </p>
      </div>
      <button
        onClick={handleClick}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 shrink-0 mt-0.5 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
        aria-label="Delete note"
      >
        <X className="size-3" />
      </button>
    </motion.div>
  );
}

// ─── Gradient Section Divider ─────────────────────────
function SectionDivider({ className }: { className?: string }) {
  return (
    <div className={`h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent dark:via-emerald-700/40 my-2 ${className || ""}`} />
  );
}

// ─── Onboarding Steps Config ─────────────────────────
const onboardingSteps = [
  {
    step: 1,
    icon: Package,
    title: "Add Laptops",
    description: "Enter specs, photos, and pricing for each laptop in your inventory",
    gradient: "from-emerald-400 to-emerald-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    step: 2,
    icon: Megaphone,
    title: "Create Ads",
    description: "Generate AI-powered ads for Facebook, WhatsApp, Gumtree, and OLX",
    gradient: "from-teal-400 to-emerald-600",
    bgLight: "bg-teal-50 dark:bg-teal-950/30",
  },
  {
    step: 3,
    icon: Rocket,
    title: "Start Selling",
    description: "Track your pipeline, manage buyers, and watch profits grow",
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
  },
];

export function Dashboard() {
  const {
    laptops,
    setLaptops,
    dashboardStats,
    setDashboardStats,
    setActiveTab,
    setIsFormOpen,
    contacts,
    setSelectedLaptop,
    setIsDetailOpen,
    setEditingLaptopId,
    watchlist,
    activityLogs,
    notifications,
    setNotifications,
    quickNotes,
    addQuickNote,
    deleteQuickNote,
  } = useAppStore();
  const safeLaptops = Array.isArray(laptops) ? laptops : [];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const greeting = getGreeting();

  // Animated counters
  const animatedTotal = useCountUp(dashboardStats.totalLaptops, 600, !loading);
  const animatedActive = useCountUp(dashboardStats.activeListings, 700, !loading);
  const animatedSold = useCountUp(dashboardStats.sold, 800, !loading);
  const animatedRevenue = useCountUp(dashboardStats.totalRevenue, 1000, !loading);
  const animatedProfit = useCountUp(dashboardStats.totalProfit, 1100, !loading);

  const fetchLaptops = useCallback(async () => {
    try {
      const data = await apiFetchLaptops();
      const safeData = Array.isArray(data) ? data : [];
      setLaptops(safeData);

      const soldItems = safeData.filter((l: LaptopType) => l.status === "sold");
      const totalProfit = soldItems.reduce((sum: number, l: LaptopType) => {
        const purchase = l.purchasePrice || 0;
        return sum + (l.askingPrice - purchase);
      }, 0);
      const itemsWithCost = soldItems.filter(
        (l: LaptopType) => l.purchasePrice > 0
      );
      const avgMargin =
        itemsWithCost.length > 0
          ? itemsWithCost.reduce((sum: number, l: LaptopType) => {
              return sum + ((l.askingPrice - l.purchasePrice) / l.purchasePrice) * 100;
            }, 0) / itemsWithCost.length
          : 0;

      const stats = {
        totalLaptops: safeData.length,
        activeListings: safeData.filter(
          (l: LaptopType) => l.status === "active"
        ).length,
        sold: soldItems.length,
        totalRevenue: soldItems.reduce(
          (sum: number, l: LaptopType) => sum + l.askingPrice,
          0
        ),
        totalProfit,
        avgMargin: Math.round(avgMargin),
      };
      setDashboardStats(stats);
    } catch {
      // Error silently handled
    }
  }, [setLaptops, setDashboardStats]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchLaptops();
      setLoading(false);
    }
    load();
  }, [fetchLaptops]);

  // ─── Smart Notification Generation ─────────────────────────
  useEffect(() => {
    if (safeLaptops.length === 0) return;

    const existingIds = new Set(notifications.map((n) => n.id));
    const newNotifications = [...notifications];

    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const staleListings = safeLaptops.filter(
      (l: LaptopType) =>
        l.status === "active" &&
        new Date(l.createdAt).getTime() < fourteenDaysAgo
    );
    const staleId = "smart-stale-listing-14d";
    if (staleListings.length > 0 && !existingIds.has(staleId)) {
      newNotifications.unshift({
        id: staleId,
        type: "stale_listing",
        title: `Stale listing alert`,
        message: `${staleListings.length} laptop(s) have been active for 14+ days. Consider updating prices or refreshing your listings.`,
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
    }

    const draftCount = safeLaptops.filter(
      (l: LaptopType) => l.status === "draft"
    ).length;
    const draftId = "smart-draft-reminder";
    if (draftCount > 0 && !existingIds.has(draftId)) {
      newNotifications.unshift({
        id: draftId,
        type: "draft_reminder",
        title: `Draft laptop(s) waiting`,
        message: `${draftCount} draft laptop(s) waiting to be listed. Complete your listings to start selling.`,
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
    }

    if (newNotifications.length !== notifications.length) {
      setNotifications(newNotifications);
    }
  }, [loading, safeLaptops, notifications, setNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLaptops();
    setRefreshing(false);
    toast.success("Data refreshed");
  }, [fetchLaptops]);

  const recentLaptops = [...safeLaptops]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  // Profit insights calculations
  const soldLaptops = safeLaptops.filter((l: LaptopType) => l.status === "sold");
  const bestSeller = soldLaptops.length > 0
    ? soldLaptops.reduce((best: LaptopType, l: LaptopType) => {
        const bestProfit = best.askingPrice - (best.purchasePrice || 0);
        const lProfit = l.askingPrice - (l.purchasePrice || 0);
        return lProfit > bestProfit ? l : best;
      })
    : null;
  const totalInventoryValue = safeLaptops.reduce(
    (sum: number, l: LaptopType) => sum + l.askingPrice,
    0
  );

  const handleQuickAction = (action: string) => {
    if (action === "add") {
      setEditingLaptopId(null);
      setIsFormOpen(true);
    } else {
      setActiveTab(action);
    }
  };

  const handleShareListing = async (laptop: LaptopType) => {
    const specs = [laptop.cpu, laptop.ram, laptop.storage, laptop.gpu]
      .filter(Boolean)
      .join(", ");
    const text = `${laptop.brand} ${laptop.model}\nPrice: ${formatPrice(laptop.askingPrice)}\nSpecs: ${specs}\nCondition: ${laptop.condition}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Recently sold laptops (last 3)
  const recentSold = [...safeLaptops]
    .filter((l: LaptopType) => l.status === "sold")
    .sort((a: LaptopType, b: LaptopType) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  // Recent buyer contacts (last 5)
  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Get animated value for stat
  const getAnimatedValue = (key: string): number => {
    switch (key) {
      case "totalLaptops": return animatedTotal;
      case "activeListings": return animatedActive;
      case "sold": return animatedSold;
      case "totalRevenue": return animatedRevenue;
      case "totalProfit": return animatedProfit;
      default: return 0;
    }
  };

  // ─── Brand Distribution Data ─────────────────────────
  const brandDistribution = useMemo(() => {
    const brandMap: Record<string, number> = {};
    safeLaptops.forEach((l: LaptopType) => {
      const brand = l.brand || "Unknown";
      brandMap[brand] = (brandMap[brand] || 0) + 1;
    });
    return Object.entries(brandMap)
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([brand, count]) => ({ brand, count }));
  }, [safeLaptops]);

  const maxBrandCount = Math.max(...brandDistribution.map((b) => b.count), 1);

  // ─── Condition Breakdown Data ─────────────────────────
  const conditionBreakdown = useMemo(() => {
    const condMap: Record<string, number> = {};
    safeLaptops.forEach((l: LaptopType) => {
      const cond = l.condition || "Unknown";
      condMap[cond] = (condMap[cond] || 0) + 1;
    });
    return Object.entries(condMap)
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([condition, count]) => ({ condition, count }));
  }, [safeLaptops]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // ─── Empty / Onboarding State ─────────────────────────
  if (safeLaptops.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/10 dark:via-background dark:to-background">
        <div className="space-y-6 p-4 pb-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-100 flex items-center gap-1.5">
                    <span>{greeting.emoji}</span>
                    <span>{greeting.text}</span>
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight mt-0.5">LaptopFlip</h1>
                  <p className="text-sm text-emerald-100 mt-1">Your laptop resale command center</p>
                </div>
                <div className="flex items-center gap-1">
                  <NotificationCenter />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Onboarding Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15, type: "spring", stiffness: 200 }}
          >
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 text-white shadow-xl shadow-emerald-600/25 relative overflow-hidden">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 shadow-lg">
                  <Laptop className="size-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to LaptopFlip!</h2>
                <p className="text-emerald-100 text-sm mb-1">
                  Start flipping laptops like a pro 🚀
                </p>
                <p className="text-emerald-200/80 text-xs leading-relaxed">
                  Track inventory, generate AI ads, manage your sales pipeline, and maximize profits — all in one place.
                </p>
              </div>
            </div>
          </motion.div>

          {/* 3-Step Onboarding Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="space-y-3"
          >
            <h2 className="text-base font-semibold text-center text-muted-foreground">
              Get started in 3 easy steps
            </h2>
            <div className="space-y-2.5">
              {onboardingSteps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
                  >
                    <div className="flex items-center gap-3.5 p-4 rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group">
                      {/* Subtle gradient background on hover */}
                      <div className={`absolute inset-0 ${step.bgLight} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
                      {/* Step number badge */}
                      <div className="relative z-10 flex items-center gap-3 shrink-0">
                        <div className={`size-10 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-md`}>
                          <StepIcon className="size-5" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground/60 w-4">0{step.step}</span>
                      </div>
                      <div className="relative z-10 min-w-0">
                        <p className="text-sm font-semibold">{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                      </div>
                      {index < 2 && (
                        <ArrowRight className="size-4 text-muted-foreground/30 shrink-0 relative z-10" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="pt-2"
          >
            <Button
              onClick={() => {
                setEditingLaptopId(null);
                setIsFormOpen(true);
              }}
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl px-6 py-6 shadow-lg shadow-emerald-600/30 font-semibold text-base transition-shadow duration-200 hover:shadow-xl"
            >
              <Plus className="size-5 mr-2" />
              <span>Add Your First Laptop</span>
              <Zap className="size-4 ml-2 opacity-70" />
            </Button>
          </motion.div>

          {/* Pricing Calculator (still useful for new users) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.7 }}>
            <PricingCalculator />
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Main Dashboard (laptops exist) ─────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/30 via-white to-white dark:from-emerald-950/10 dark:via-background dark:to-background">
      <div className="space-y-6 p-4 pb-8">
        {/* Header with greeting */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100 flex items-center gap-1.5">
                  <span>{greeting.emoji}</span>
                  <span>{greeting.text}</span>
                </p>
                <h1 className="text-2xl font-bold tracking-tight mt-0.5">LaptopFlip</h1>
                <p className="text-sm text-emerald-100 mt-1">Your laptop resale command center</p>
              </div>
              <div className="flex items-center gap-1">
                <NotificationCenter />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 hover:text-white"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh data"
                >
                  <RefreshCw className={`size-5 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
            {dashboardStats.avgMargin > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-emerald-100 bg-white/15 px-2 py-1 rounded-lg">
                  Avg. margin: {dashboardStats.avgMargin}%
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats Strip */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
        >
          {[
            { label: "Avg Price", value: safeLaptops.length > 0 ? formatPrice(Math.round(safeLaptops.reduce((sum: number, l: LaptopType) => sum + l.askingPrice, 0) / safeLaptops.length)) : formatPrice(0), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { label: "Mint", value: safeLaptops.filter((l: LaptopType) => l.condition === "Mint").length.toString(), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { label: "Excellent", value: safeLaptops.filter((l: LaptopType) => l.condition === "Excellent").length.toString(), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { label: "Good", value: safeLaptops.filter((l: LaptopType) => l.condition === "Good").length.toString(), color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
            { label: "Watched", value: watchlist.length.toString(), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className={`shrink-0 rounded-lg px-3 py-2 border border-border/50 ${stat.bg} flex flex-col items-center min-w-[70px] active:scale-95 transition-transform duration-100`}
            >
              <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        <SectionDivider />

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const isPrice = stat.key === "totalRevenue" || stat.key === "totalProfit";
            const value = isPrice
              ? formatPrice(getAnimatedValue(stat.key))
              : getAnimatedValue(stat.key).toString();

            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card
                  className={`gap-0 py-5 px-5 rounded-xl border border-l-4 ${stat.borderLeft} shadow-sm relative overflow-hidden backdrop-blur-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/30 pointer-events-none" />
                  <CardContent className="p-0 relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold tracking-tight">{value}</p>
                      </div>
                      <div className={`rounded-lg border p-2 transition-transform duration-200 hover:scale-110 ${stat.accent}`}>
                        <Icon className={`size-4 ${stat.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <SectionDivider />

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-base font-semibold">Quick Actions<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span></h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.action)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg ${action.shadow} shadow-inner active:shadow-md transition-all duration-200 relative overflow-hidden hover:shadow-xl hover:-translate-y-0.5`}
                >
                  <div className="relative">
                    <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <div className="text-center relative z-10">
                    <span className="text-xs font-semibold block">{action.label}</span>
                    <span className="text-[10px] text-white/70 block">{action.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <SectionDivider />

        {/* Profit Insights Widget */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }} className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            Profit Insights<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span>
          </h2>
          <Card className="rounded-xl border shadow-sm overflow-hidden relative hover:shadow-md transition-shadow duration-200">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(16,185,129,0.08) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-600 dark:from-emerald-600 dark:via-teal-700 dark:to-emerald-800 rounded-l-xl" />
            <CardContent className="p-4 pl-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Trophy className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Best Seller</p>
                  {bestSeller ? (
                    <p className="text-sm font-semibold truncate">
                      {bestSeller.brand} {bestSeller.model}
                      <span className="ml-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        +{formatPrice(bestSeller.askingPrice - (bestSeller.purchasePrice || 0))}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sales yet</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center shrink-0">
                  <Clock className="size-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Average Days to Sell</p>
                  <p className="text-sm font-semibold">
                    {soldLaptops.length > 0
                      ? `~${Math.round(
                          soldLaptops.reduce((sum: number, l: LaptopType) => {
                            const created = new Date(l.createdAt).getTime();
                            return sum + Math.max(0, (Date.now() - created) / (1000 * 60 * 60 * 24));
                          }, 0) / soldLaptops.length
                        )} days (est.)`
                      : "No sales yet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Total Inventory Value</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatPrice(totalInventoryValue)}
                  </p>
                </div>
              </div>
            </CardContent>
            <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-60" />
          </Card>
        </motion.div>

        {/* This Week Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.27 }} className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="size-4 text-violet-500" />
            This Week
            <span className="ml-1.5 text-transparent bg-gradient-to-r from-violet-400 to-purple-400 dark:from-violet-500 dark:to-purple-500 bg-clip-text">—</span>
          </h2>
          <Card className="rounded-xl border shadow-sm overflow-hidden relative hover:shadow-md transition-shadow duration-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 via-purple-500 to-violet-600 dark:from-violet-600 dark:via-purple-700 dark:to-violet-800 rounded-l-xl" />
            <CardContent className="p-4 pl-5 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Listed", value: safeLaptops.filter((l: LaptopType) => { const d = new Date(l.createdAt).getTime(); const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; return d > weekAgo; }).length, color: "text-violet-600 dark:text-violet-400" },
                  { label: "Sold", value: soldLaptops.filter((l: LaptopType) => { const d = new Date(l.createdAt).getTime(); const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; return d > weekAgo; }).length, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Revenue", value: formatPrice(soldLaptops.filter((l: LaptopType) => { const d = new Date(l.createdAt).getTime(); const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; return d > weekAgo; }).reduce((sum: number, l: LaptopType) => sum + l.askingPrice, 0)), color: "text-amber-600 dark:text-amber-400" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="h-0.5 bg-gradient-to-r from-violet-400 via-purple-400 to-violet-500 dark:from-violet-600 dark:via-purple-600 dark:to-violet-700 opacity-40" />
          </Card>
        </motion.div>

        <SectionDivider />

        {/* Brand Distribution Widget (NEW) */}
        {brandDistribution.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.275 }} className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Layers className="size-4 text-emerald-600 dark:text-emerald-400" />
              Brand Distribution<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span>
            </h2>
            <Card className="rounded-xl border shadow-sm overflow-hidden relative hover:shadow-md transition-shadow duration-200">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-600 dark:from-emerald-600 dark:via-teal-700 dark:to-emerald-800 rounded-l-xl" />
              <CardContent className="p-4 pl-5 space-y-3">
                {brandDistribution.map((brand, index) => (
                  <motion.div
                    key={brand.brand}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.06 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{getBrandIcon(brand.brand)}</span>
                        <span className="text-xs font-semibold">{brand.brand}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{brand.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${EMERALD_SHADES[index % EMERALD_SHADES.length]}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(brand.count / maxBrandCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + index * 0.08, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                ))}
              </CardContent>
              <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-40" />
            </Card>
          </motion.div>
        )}

        {/* Condition Breakdown Mini Widget (NEW) */}
        {conditionBreakdown.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.28 }}>
            <Card className="rounded-xl border shadow-sm overflow-hidden relative hover:shadow-md transition-shadow duration-200">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 via-emerald-500 to-amber-500 dark:from-sky-600 dark:via-emerald-700 dark:to-amber-700 rounded-l-xl" />
              <CardContent className="p-4 pl-5">
                <p className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                  Condition Breakdown
                </p>
                <div className="flex flex-wrap gap-2">
                  {conditionBreakdown.map((cond, index) => (
                    <motion.div
                      key={cond.condition}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.05, type: "spring", stiffness: 300 }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-card hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                    >
                      <span className={`size-2 rounded-full ${getConditionDotColor(cond.condition)} shrink-0`} />
                      <span className="text-[11px] font-medium">{cond.condition}</span>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0 rounded">{cond.count}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
              <div className="h-0.5 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 dark:from-sky-600 dark:via-emerald-600 dark:to-amber-600 opacity-40" />
            </Card>
          </motion.div>
        )}

        {/* Sales Pipeline Tracker */}
        <SectionDivider />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.285 }}>
          <SalesPipelineTracker />
        </motion.div>

        {/* Watchlist Widget */}
        <SectionDivider />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.29 }} className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Heart className="size-4 text-rose-500" />
            Watchlist<span className="ml-1.5 text-transparent bg-gradient-to-r from-rose-400 to-pink-400 dark:from-rose-500 dark:to-pink-500 bg-clip-text">—</span>
            {watchlist.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {watchlist.length} item{watchlist.length > 1 ? "s" : ""}
              </Badge>
            )}
          </h2>
          <Card className="rounded-xl border shadow-sm overflow-hidden relative hover:shadow-md transition-shadow duration-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 via-pink-500 to-rose-600 dark:from-rose-600 dark:via-pink-700 dark:to-rose-800 rounded-l-xl" />
            <CardContent className="p-4 pl-5">
              {watchlist.length === 0 ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="size-9 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                    <Heart className="size-4 text-rose-400 dark:text-rose-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">No watched items</p>
                    <p className="text-xs text-muted-foreground">Tap the heart icon on any laptop to track it</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {(Array.isArray(watchlist) ? watchlist : []).map((id) => {
                    const watchedLaptop = safeLaptops.find((l: LaptopType) => l.id === id);
                    if (!watchedLaptop) return null;
                    return (
                      <motion.button
                        key={id}
                        onClick={() => {
                          setSelectedLaptop(watchedLaptop);
                          setIsDetailOpen(true);
                        }}
                        className="shrink-0 rounded-xl border border-l-2 border-l-rose-400 dark:border-l-rose-600 bg-background/80 dark:bg-gray-900/80 p-3 min-w-[150px] max-w-[180px] text-left hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 active:scale-[0.98] transition-all duration-200"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm">
                            {watchedLaptop.photos && watchedLaptop.photos.length > 0
                              ? (() => {
                                  const imgs = typeof watchedLaptop.photos === "string" ? JSON.parse(watchedLaptop.photos) : watchedLaptop.photos;
                                  return (
                                    <img src={imgs[0]} alt="" className="size-8 rounded-md object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }} />
                                  );
                                })()
                              : null}
                          </span>
                          <span className={watchedLaptop.photos && watchedLaptop.photos.length > 0 ? "hidden" : "text-lg"}>
                            {getBrandIcon(watchedLaptop.brand)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{watchedLaptop.brand} {watchedLaptop.model}</p>
                            <p className="text-[10px] text-muted-foreground">{watchedLaptop.ram} · {watchedLaptop.storage}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {formatPrice(watchedLaptop.askingPrice)}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <div className="h-0.5 bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500 dark:from-rose-600 dark:via-pink-600 dark:to-rose-700 opacity-40" />
          </Card>
        </motion.div>

        {/* Recent Activity Feed — Timeline Style */}
        <SectionDivider />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.30 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Activity className="size-4 text-blue-500" />
              Recent Activity
              {activityLogs.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{activityLogs.length}</Badge>
              )}
            </h2>
            {activityLogs.length > 0 && (
              <button onClick={() => toast.info("Full activity log coming soon")} className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                View All <ArrowRight className="size-3" />
              </button>
            )}
          </div>
          <Card className="rounded-xl border shadow-sm overflow-hidden relative hover:shadow-md transition-shadow duration-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-sky-500 to-blue-500 dark:from-blue-600 dark:via-sky-700 dark:to-blue-800 rounded-l-xl" />
            <CardContent className="p-4 pl-5">
              {activityLogs.length === 0 ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                    <Activity className="size-4 text-blue-400 dark:text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">No recent activity</p>
                    <p className="text-xs text-muted-foreground">
                      Actions like price changes and status updates will appear here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative pl-5">
                  {/* Timeline vertical line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-blue-300 via-sky-300 to-transparent dark:from-blue-700 dark:via-sky-700 dark:to-transparent" />
                  <div className="space-y-0">
                    {[...activityLogs]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 5)
                      .map((entry, index) => {
                        const actionConfig = getActivityActionConfig(entry.action);
                        const ActionIcon = actionConfig.icon;
                        return (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.04 }}
                            className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 relative"
                          >
                            {/* Timeline dot */}
                            <div className={`absolute left-[-17px] top-[14px] size-[9px] rounded-full ${actionConfig.bgColor} border-2 border-background z-10`} />
                            <div className={`size-8 rounded-lg ${actionConfig.bgColor} flex items-center justify-center shrink-0`}>
                              <ActionIcon className={`size-3.5 ${actionConfig.iconColor}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{entry.detail}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{formatRelativeTime(entry.timestamp)}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              )}
            </CardContent>
            <div className="h-0.5 bg-gradient-to-r from-blue-400 via-sky-400 to-blue-500 dark:from-blue-600 dark:via-sky-600 dark:to-blue-700 opacity-40" />
          </Card>
        </motion.div>

        {/* Profit Calculator — Portfolio-level tracking */}
        <SectionDivider />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.32 }} className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
            Profit Calculator<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span>
          </h2>
          <Card className="rounded-xl border shadow-sm overflow-hidden relative hover:shadow-md transition-shadow duration-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-600 dark:from-emerald-600 dark:via-teal-700 dark:to-emerald-800 rounded-l-xl" />
            <CardContent className="p-4 pl-5 space-y-3">
              {(() => {
                const totalPurchase = safeLaptops.reduce((s: number, l: LaptopType) => s + (l.purchasePrice || 0), 0);
                const totalAsking = safeLaptops.reduce((s: number, l: LaptopType) => s + l.askingPrice, 0);
                const potentialProfit = totalAsking - totalPurchase;
                const marginPct = totalPurchase > 0 ? Math.round((potentialProfit / totalPurchase) * 100) : 0;
                const hasCostData = totalPurchase > 0;
                const maxVal = Math.max(totalPurchase, totalAsking, 1);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium">Total Invested</p>
                        <p className="text-base font-bold text-rose-600 dark:text-rose-400">{formatPrice(totalPurchase)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium">Potential Revenue</p>
                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(totalAsking)}</p>
                      </div>
                    </div>
                    {/* Mini Bar Chart */}
                    {hasCostData && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Invested vs Revenue</span>
                          <span className={potentialProfit >= 0 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-red-600 dark:text-red-400 font-semibold"}>
                            {potentialProfit >= 0 ? "+" : ""}{formatPrice(potentialProfit)} ({marginPct}%)</span>
                        </div>
                        <div className="space-y-1.5">
                          {/* Invested bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground w-12 shrink-0">Invested</span>
                            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-rose-400 dark:bg-rose-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max((totalPurchase / maxVal) * 100, 2)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                          {/* Revenue bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground w-12 shrink-0">Revenue</span>
                            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${potentialProfit >= 0 ? "bg-emerald-400 dark:bg-emerald-500" : "bg-red-400 dark:bg-red-500"}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max((totalAsking / maxVal) * 100, 2)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {!hasCostData && (
                      <p className="text-[11px] text-muted-foreground text-center py-1">
                        Set purchase prices on laptops to see profit data
                      </p>
                    )}
                  </>
                );
              })()}
            </CardContent>
            <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-60" />
          </Card>
        </motion.div>

        {/* Quick Notes — Colorful Note Cards */}
        <SectionDivider />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.33 }} className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <StickyNote className="size-4 text-amber-500" />
            Quick Notes
            {quickNotes.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{quickNotes.length}</Badge>
            )}
          </h2>
          <Card className="rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="h-0.5 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 dark:from-amber-600 dark:via-yellow-600 dark:to-amber-600 opacity-50" />
            <CardContent className="p-4 space-y-3">
              <QuickNotesInput addQuickNote={addQuickNote} />
              {quickNotes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 py-4 text-center"
                >
                  <div className="size-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <StickyNote className="size-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No notes yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">Jot down quick reminders or thoughts</p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {quickNotes.slice(0, 5).map((note, i) => (
                    <QuickNoteItem
                      key={`${note.text}-${i}`}
                      note={note}
                      index={i}
                      colorIndex={i % NOTE_COLORS.length}
                      deleteQuickNote={deleteQuickNote}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pricing Calculator */}
        <SectionDivider />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }}>
          <PricingCalculator />
        </motion.div>

        {/* Recent Listings with thumbnail preview */}
        <SectionDivider />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
              Recent Listings<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span>
            </h2>
            {recentLaptops.length > 0 && (
              <button onClick={() => setActiveTab("inventory")} className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline">
                View All <ArrowRight className="size-3" />
              </button>
            )}
          </div>

          {/* Mini Cards Grid for latest 3 laptops */}
          {recentLaptops.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {recentLaptops.map((laptop, index) => (
                <motion.div
                  key={laptop.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.06 }}
                >
                  <Card
                    className={`rounded-xl shadow-sm hover:shadow-lg hover:bg-accent/40 dark:hover:bg-accent/20 transition-all duration-200 cursor-pointer border-l-[3px] ${getConditionBorderColor(laptop.condition)} relative overflow-hidden`}
                    onClick={() => {
                      setSelectedLaptop(laptop);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-50/30 to-transparent dark:via-emerald-900/10 pointer-events-none" />
                    <CardContent className="p-0 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="size-11 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0 border overflow-hidden">
                          {laptop.photos && laptop.photos.length > 0 ? (
                            <img
                              src={typeof laptop.photos === "string" ? JSON.parse(laptop.photos)[0] : laptop.photos[0]}
                              alt=""
                              className="size-11 rounded-lg object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                              }}
                            />
                          ) : null}
                          <span className={laptop.photos && laptop.photos.length > 0 ? "hidden" : ""}>
                            {getBrandIcon(laptop.brand)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">
                              {laptop.brand} {laptop.model}
                            </p>
                            {laptop.stockId && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0 rounded border border-emerald-200 dark:border-emerald-800">
                                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <Hash className="size-2.5" />
                                {laptop.stockId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[11px] text-muted-foreground">{laptop.ram} · {laptop.storage}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] px-1.5 py-0 ${getConditionColor(laptop.condition)}`}>
                            {laptop.condition}
                          </Badge>
                          <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(laptop.status)}`}>
                            {laptop.status}
                          </Badge>
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatPrice(laptop.askingPrice)}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleShareListing(laptop); }}
                            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                            aria-label="Copy listing to clipboard"
                          >
                            <Share2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recently Sold with confetti emoji */}
        {recentSold.length > 0 && (
          <>
            <SectionDivider />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-blue-500" />
                  Recently Sold<span className="ml-1.5 text-transparent bg-gradient-to-r from-blue-400 to-sky-400 dark:from-blue-500 dark:to-sky-500 bg-clip-text">—</span>
                  <span className="text-base">🎉</span>
                </h2>
                <Badge variant="secondary" className="text-[10px]">
                  {recentSold.length} item{recentSold.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="space-y-2">
                {recentSold.map((laptop, index) => {
                  const profit = laptop.askingPrice - (laptop.purchasePrice || 0);
                  const margin = laptop.purchasePrice > 0 ? Math.round((profit / laptop.purchasePrice) * 100) : 0;
                  return (
                    <motion.div key={laptop.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: index * 0.05 }}>
                      <Card className="rounded-xl py-3 shadow-md border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow duration-200">
                        <CardContent className="p-0 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0 border">
                              {getBrandIcon(laptop.brand)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{laptop.brand} {laptop.model}</p>
                                {laptop.stockId && (
                                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0 rounded border border-blue-200 dark:border-blue-800">
                                    <Hash className="size-2.5" />
                                    {laptop.stockId}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">{laptop.ram} · {laptop.storage}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(laptop.askingPrice)}</p>
                              {profit > 0 && (
                                <p className="text-[10px] text-emerald-500 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                                  <TrendingUp className="size-2.5" />
                                  +{formatPrice(profit)} ({margin}%)
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}

        {/* Sales Analytics Charts */}
        <SectionDivider />
        <SalesAnalytics laptops={laptops} loading={loading} />

        {/* Buyer Enquiries Quick Link */}
        <SectionDivider />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
              Buyer Enquiries<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span>
            </h2>
            <span className="text-xs text-muted-foreground">{contacts.length} total</span>
          </div>
          <Card className="rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              {contacts.length === 0 ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">No enquiries yet</p>
                    <p className="text-xs text-muted-foreground">Open a laptop detail to add buyer contacts</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "New", status: "new", color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
                      { label: "Interested", status: "interested", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
                      { label: "Sold To", status: "sold_to", color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
                    ].map((s) => (
                      <div key={s.status} className={`rounded-lg p-2 text-center ${s.color}`}>
                        <p className="text-lg font-bold">{contacts.filter((c) => c.status === s.status).length}</p>
                        <p className="text-[10px] font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {recentContacts.length > 0 && (
                    <div className="space-y-1.5">
                      {recentContacts.slice(0, 3).map((contact) => {
                        const laptop = safeLaptops.find((l) => l.id === contact.laptopId);
                        return (
                          <div key={contact.id} className="flex items-center gap-2 text-sm">
                            <span className="text-xs font-medium truncate flex-1">
                              {contact.name}
                              {laptop ? (
                                <span className="text-muted-foreground"> · {laptop.brand} {laptop.model}</span>
                              ) : null}
                            </span>
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 rounded-full border-0 ${CONTACT_STATUSES.find((s) => s.value === contact.status)?.color || ""}`}>
                              {CONTACT_STATUSES.find((s) => s.value === contact.status)?.label || contact.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-40" />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
