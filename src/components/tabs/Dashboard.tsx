"use client";

import { useEffect, useState } from "react";
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
  PackageOpen,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { apiFetchLaptops } from "@/lib/api";
import { formatPrice } from "@/lib/types";
import type { Laptop as LaptopType } from "@/lib/types";
import { useCallback } from "react";

const statCards = [
  {
    key: "totalLaptops" as const,
    label: "Total Laptops",
    icon: Laptop,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "activeListings" as const,
    label: "Active Listings",
    icon: Eye,
    accent: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "sold" as const,
    label: "Sold",
    icon: CheckCircle2,
    accent: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "totalRevenue" as const,
    label: "Revenue",
    icon: DollarSign,
    accent: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "totalProfit" as const,
    label: "Total Profit",
    icon: TrendingUp,
    accent: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
    iconColor: "text-rose-600 dark:text-rose-400",
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
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Quick actions skeleton */}
      <Skeleton className="h-12 rounded-xl" />
      {/* Recent listings skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const {
    laptops,
    setLaptops,
    dashboardStats,
    setDashboardStats,
    setActiveTab,
    setIsFormOpen,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLaptops = useCallback(async () => {
    try {
      const data = await apiFetchLaptops();
      setLaptops(data);

      const soldItems = data.filter((l: LaptopType) => l.status === "sold");
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
        totalLaptops: data.length,
        activeListings: data.filter(
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

  const recentLaptops = [...laptops]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 p-4 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">LaptopFlip</h1>
              <p className="text-sm text-emerald-100 mt-1">Your laptop resale command center</p>
            </div>
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
          {dashboardStats.avgMargin > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-emerald-100 bg-white/15 px-2 py-1 rounded-lg">
                Avg. margin: {dashboardStats.avgMargin}%
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const value =
            stat.key === "totalRevenue" || stat.key === "totalProfit"
              ? formatPrice(dashboardStats[stat.key])
              : dashboardStats[stat.key].toString();

          return (
            <Card
              key={stat.key}
              className="gap-0 py-4 px-4 rounded-xl border shadow-sm"
            >
              <CardContent className="p-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                  <div
                    className={`rounded-lg border p-2 ${stat.accent}`}
                  >
                    <Icon className={`size-4 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="text-base font-semibold">Quick Actions</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              useAppStore.getState().setEditingLaptopId(null);
              setIsFormOpen(true);
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11"
          >
            <Plus className="size-4" />
            Add Laptop
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("photos")}
            className="flex-1 rounded-xl h-11"
          >
            <Camera className="size-4" />
            Photo Guide
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("inventory")}
            className="flex-1 rounded-xl h-11"
          >
            <Sparkles className="size-4" />
            My Stock
          </Button>
        </div>
      </motion.div>

      {/* Recent Listings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="space-y-3"
      >
        <h2 className="text-base font-semibold">Recent Listings</h2>

        {recentLaptops.length === 0 ? (
          <Card className="rounded-xl border-dashed border-2 border-muted py-10">
            <CardContent className="flex flex-col items-center gap-3 text-center p-6">
              <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-4">
                <PackageOpen className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">No laptops yet</p>
                <p className="text-xs text-muted-foreground">
                  Start by adding your first laptop to get flipping!
                </p>
              </div>
              <Button
                onClick={() => {
                  useAppStore.getState().setEditingLaptopId(null);
                  setIsFormOpen(true);
                }}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                <Plus className="size-4" />
                Add Your First Laptop
              </Button>
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
                <Card className="rounded-xl py-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    useAppStore.getState().setSelectedLaptop(laptop);
                    useAppStore.getState().setIsDetailOpen(true);
                  }}
                >
                  <CardContent className="p-0 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {laptop.brand} {laptop.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {laptop.ram} · {laptop.storage}
                        </p>
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
