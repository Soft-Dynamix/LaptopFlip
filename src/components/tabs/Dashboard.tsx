"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { apiFetchLaptops } from "@/lib/api";
import { formatPrice, CONTACT_STATUSES } from "@/lib/types";
import type { Laptop as LaptopType } from "@/lib/types";
import { PricingCalculator } from "@/components/dashboard/PricingCalculator";
import { SalesAnalytics } from "@/components/dashboard/SalesAnalytics";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

// ─── Animated Counter Hook ─────────────────────────
function useCountUp(target: number, duration: number = 800, enabled: boolean = true) {
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  // Compute the displayed value from a ref that updates during animation
  const [displayValue, setDisplayValue] = useState(0);

  // Compute target when enabled, 0 otherwise
  const effectiveTarget = enabled ? target : 0;

  useEffect(() => {
    if (effectiveTarget === 0) return;

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * effectiveTarget));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [effectiveTarget, duration]);

  // When not enabled or target is 0, show 0
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 p-4 pb-8">
      {/* Header with greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden">
          {/* Decorative mesh/grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          {/* Shine/shimmer sweep every 4 seconds */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "300%"], opacity: [0, 0.7, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
            />
          </motion.div>
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

      {/* Stats Grid with animated counters & shimmer accent */}
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
            <Card
              key={stat.key}
              className={`gap-0 py-4 px-4 rounded-xl border border-l-4 ${stat.borderLeft} shadow-sm relative overflow-hidden hover:-translate-y-1 hover:ring-2 hover:ring-current/10 transition-all duration-200`}
            >
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/30 pointer-events-none" />
              <CardContent className="p-0 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                  </div>
                  <motion.div
                    className={`rounded-lg border p-2 ${stat.accent}`}
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.5, repeatDelay: 3 }}
                  >
                    <Icon className={`size-4 ${stat.iconColor}`} />
                  </motion.div>
                </div>
              </CardContent>
              {/* Animated shimmer gradient accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden transition-opacity duration-300">
                <motion.div
                  className="h-full w-[200%] bg-gradient-to-r from-transparent via-emerald-400 to-transparent dark:via-emerald-600"
                  animate={{ x: ["-50%", "50%"] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Quick Actions with subtitles */}
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
              <motion.button
                key={action.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAction(action.action)}
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg ${action.shadow} shadow-inner active:shadow-md transition-shadow duration-200 relative overflow-hidden`}
              >
                <div className="relative">
                  <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Icon className="size-5" />
                  </div>
                  {action.action === "add" && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-white/40"
                      animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  {/* Shimmer overlay on Add Laptop button */}
                  {action.action === "add" && (
                    <motion.div
                      className="absolute inset-0 overflow-hidden rounded-xl"
                    >
                      <motion.div
                        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                      />
                    </motion.div>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold block">{action.label}</span>
                  <span className="text-[10px] text-white/70 block">{action.subtitle}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Profit Insights Widget */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="space-y-3"
      >
        <h2 className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
          Profit Insights<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span>
        </h2>
        <Card className="rounded-xl border shadow-sm overflow-hidden relative">
          {/* Subtle dot pattern background */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(16,185,129,0.08) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          {/* Gradient left border accent */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-600 dark:from-emerald-600 dark:via-teal-700 dark:to-emerald-800 rounded-l-xl" />
          <CardContent className="p-4 pl-5 space-y-3">
            {/* Best Seller */}
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
            {/* Avg Days to Sell */}
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
            {/* Total Inventory Value */}
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

      {/* Watchlist Widget */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.29 }}
        className="space-y-3"
      >
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Heart className="size-4 text-rose-500" />
          Watchlist<span className="ml-1.5 text-transparent bg-gradient-to-r from-rose-400 to-pink-400 dark:from-rose-500 dark:to-pink-500 bg-clip-text">—</span>
          {watchlist.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {watchlist.length} item{watchlist.length > 1 ? "s" : ""}
            </Badge>
          )}
        </h2>
        <Card className="rounded-xl border shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 via-pink-500 to-rose-600 dark:from-rose-600 dark:via-pink-700 dark:to-rose-800 rounded-l-xl" />
          <CardContent className="p-4 pl-5">
            {watchlist.length === 0 ? (
              <div className="flex items-center gap-3 py-2">
                <div className="size-9 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Heart className="size-4 text-rose-400 dark:text-rose-500" />
                  </motion.div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">No watched items</p>
                  <p className="text-xs text-muted-foreground">
                    Tap the heart icon on any laptop to track it
                  </p>
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
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedLaptop(watchedLaptop);
                        setIsDetailOpen(true);
                      }}
                      className="shrink-0 rounded-xl border border-l-2 border-l-rose-400 dark:border-l-rose-600 bg-background/80 dark:bg-gray-900/80 p-3 min-w-[150px] max-w-[180px] text-left hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">
                          {watchedLaptop.photos && watchedLaptop.photos.length > 0
                            ? (() => {
                                const imgs = typeof watchedLaptop.photos === "string" ? JSON.parse(watchedLaptop.photos) : watchedLaptop.photos;
                                return (
                                  <img
                                    src={imgs[0]}
                                    alt=""
                                    className="size-8 rounded-md object-cover border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                    }}
                                  />
                                );
                              })()
                            : null}
                        </span>
                        <span className={watchedLaptop.photos && watchedLaptop.photos.length > 0 ? "hidden" : "text-lg"}>
                          {getBrandIcon(watchedLaptop.brand)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {watchedLaptop.brand} {watchedLaptop.model}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {watchedLaptop.ram} · {watchedLaptop.storage}
                          </p>
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

      {/* Recent Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.30 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Activity className="size-4 text-blue-500" />
            Recent Activity
            {activityLogs.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {activityLogs.length}
              </Badge>
            )}
          </h2>
          {activityLogs.length > 0 && (
            <button
              onClick={() => toast.info("Full activity log coming soon")}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
            >
              View All
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
        <Card className="rounded-xl border shadow-sm overflow-hidden relative">
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
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className={`size-8 rounded-lg ${actionConfig.bgColor} flex items-center justify-center shrink-0`}>
                          <ActionIcon className={`size-3.5 ${actionConfig.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{entry.detail}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatRelativeTime(entry.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </CardContent>
          <div className="h-0.5 bg-gradient-to-r from-blue-400 via-sky-400 to-blue-500 dark:from-blue-600 dark:via-sky-600 dark:to-blue-700 opacity-40" />
        </Card>
      </motion.div>

      {/* Pricing Calculator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.33 }}
      >
        <PricingCalculator />
      </motion.div>

      {/* Recent Listings with thumbnail preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Listings<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span></h2>
          {recentLaptops.length > 0 && (
            <button
              onClick={() => setActiveTab("inventory")}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
            >
              View All
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>

        {recentLaptops.length === 0 ? (
          <Card className="rounded-xl border-dashed border-2 border-muted py-10 overflow-hidden">
            <CardContent className="flex flex-col items-center gap-4 text-center p-6 relative">
              {/* Decorative gradient backdrop */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 size-32 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/50 dark:to-teal-950/50 blur-2xl pointer-events-none" />
              {/* Animated floating laptop icon */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <div className="size-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  <Laptop className="size-10 text-white" />
                </div>
                {/* Sparkle dots around laptop */}
                <motion.div
                  className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
                <motion.div
                  className="absolute -bottom-1 -left-1 size-2.5 rounded-full bg-sky-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                />
                <motion.div
                  className="absolute top-1/2 -right-3 size-2 rounded-full bg-rose-400"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                />
              </motion.div>
              <div className="space-y-1.5 relative">
                <p className="font-bold text-lg">No laptops yet</p>
                <p className="text-sm text-muted-foreground max-w-[220px]">
                  Add your first laptop and start tracking your resale profits!
                </p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <Button
                  onClick={() => {
                    setEditingLaptopId(null);
                    setIsFormOpen(true);
                  }}
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl px-6 shadow-lg shadow-emerald-600/30 font-semibold"
                >
                  <Plus className="size-5 mr-1.5" />
                  Add Your First Laptop
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentLaptops.map((laptop, index) => (
              <motion.div
                key={laptop.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card
                  className={`rounded-xl py-4 shadow-md hover:shadow-lg hover:bg-accent/40 dark:hover:bg-accent/20 transition-all duration-200 cursor-pointer border-l-[3px] ${getConditionBorderColor(laptop.condition)} relative overflow-hidden`}
                  onClick={() => {
                    setSelectedLaptop(laptop);
                    setIsDetailOpen(true);
                  }}
                >
                  {/* Subtle hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-50/50 to-transparent dark:via-emerald-900/20 pointer-events-none" />
                  <CardContent className="p-0 px-4">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail brand icon */}
                      <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0 border">
                        {laptop.photos && laptop.photos.length > 0 ? (
                          <img
                            src={typeof laptop.photos === "string" ? JSON.parse(laptop.photos)[0] : laptop.photos[0]}
                            alt=""
                            className="size-10 rounded-lg object-cover"
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
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {laptop.ram} · {laptop.storage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${getConditionColor(laptop.condition)}`}
                        >
                          {laptop.condition}
                        </Badge>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${getStatusColor(laptop.status)}`}
                        >
                          {laptop.status}
                        </Badge>
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatPrice(laptop.askingPrice)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLaptop(laptop);
                            setIsDetailOpen(true);
                          }}
                          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline ml-1"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleShareListing(laptop);
                          }}
                          className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors ml-0.5"
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="space-y-3"
        >
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
              const margin = laptop.purchasePrice > 0
                ? Math.round((profit / laptop.purchasePrice) * 100)
                : 0;
              return (
                <motion.div
                  key={laptop.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="rounded-xl py-3 shadow-md border-l-4 border-l-blue-500">
                    <CardContent className="p-0 px-4">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0 border">
                          {getBrandIcon(laptop.brand)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">
                              {laptop.brand} {laptop.model}
                            </p>
                            {laptop.stockId && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0 rounded border border-blue-200 dark:border-blue-800">
                                <Hash className="size-2.5" />
                                {laptop.stockId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {laptop.ram} · {laptop.storage}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatPrice(laptop.askingPrice)}
                          </p>
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
      )}

      {/* Sales Analytics Charts */}
      <SalesAnalytics laptops={laptops} loading={loading} />

      {/* Buyer Enquiries Quick Link */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
            Buyer Enquiries<span className="ml-1.5 text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 bg-clip-text">—</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            {contacts.length} total
          </span>
        </div>
        <Card className="rounded-xl border shadow-sm overflow-hidden">
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
                {/* Contact status summary */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "New", status: "new", color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" },
                    { label: "Interested", status: "interested", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
                    { label: "Sold To", status: "sold_to", color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" },
                  ].map((s) => (
                    <div key={s.status} className={`rounded-lg p-2 text-center ${s.color}`}>
                      <p className="text-lg font-bold">
                        {contacts.filter((c) => c.status === s.status).length}
                      </p>
                      <p className="text-[10px] font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Recent contacts */}
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
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 rounded-full border-0 ${CONTACT_STATUSES.find((s) => s.value === contact.status)?.color || ""}`}
                          >
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
  );
}
