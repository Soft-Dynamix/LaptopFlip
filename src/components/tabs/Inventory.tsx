"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Pencil,
  Sparkles,
  MoreVertical,
  Trash2,
  RefreshCw,
  Laptop,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Download,
  Copy,
  Plus,
  Minus,
  Hash,
  MessageCircle,
  PackageSearch,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/store";
import {
  apiFetchLaptops,
  apiDeleteLaptop,
  apiUpdateLaptop,
  apiCreateLaptop,
} from "@/lib/api";
import { formatPrice } from "@/lib/types";
import type { Laptop as LaptopType } from "@/lib/types";

type SortOption = "newest" | "oldest" | "price-high" | "price-low" | "brand" | "condition";

const CONDITION_ORDER: Record<string, number> = {
  Mint: 0,
  Excellent: 1,
  Good: 2,
  Fair: 3,
  Poor: 4,
};

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "brand", label: "Brand (A–Z)" },
  { value: "condition", label: "Condition (Best first)" },
];

function formatDaysAgo(dateString: string): string {
  const now = new Date();
  const created = new Date(dateString);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "just now";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}m ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years}y ago`;
}

const filterChips = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
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

function abbreviateCpu(cpu: string): string {
  if (!cpu) return "";
  return cpu.length > 20 ? cpu.substring(0, 18) + "..." : cpu;
}

function getDaysListed(dateString: string): number {
  const now = new Date();
  const created = new Date(dateString);
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
}

function handleWhatsAppShare(laptop: LaptopType) {
  const text = `*${laptop.brand} ${laptop.model}*\n${laptop.cpu ? laptop.cpu + " · " : ""}${laptop.ram} · ${laptop.storage}\nCondition: ${laptop.condition}\nPrice: R${laptop.askingPrice.toLocaleString()}\n\nReply if interested!`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// ─── Status Summary Bar ─────────────────────────────────────

function StatusSummaryBar({ laptops }: { laptops: LaptopType[] }) {
  const safeLaptops = Array.isArray(laptops) ? laptops : [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, draft: 0, active: 0, sold: 0, archived: 0 };
    for (const l of safeLaptops) {
      c[l.status] = (c[l.status] || 0) + 1;
      c.all++;
    }
    return c;
  }, [laptops]);

  const bars = [
    { key: "active", label: "Active", color: "bg-emerald-500", gradient: "bg-gradient-to-br from-emerald-50 to-emerald-100/80 dark:from-emerald-900/30 dark:to-emerald-800/20" },
    { key: "sold", label: "Sold", color: "bg-blue-500", gradient: "bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/20" },
    { key: "draft", label: "Draft", color: "bg-gray-400", gradient: "bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-gray-900/30 dark:to-gray-800/20" },
    { key: "archived", label: "Archived", color: "bg-slate-400", gradient: "bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900/30 dark:to-slate-800/20" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {bars.map((bar) => {
        const pct = counts.all > 0 ? Math.round((counts[bar.key] / counts.all) * 100) : 0;
        return (
          <div key={bar.key} className={`rounded-xl ${bar.gradient} p-2.5 space-y-1.5`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium">{bar.label}</span>
              <span className="text-xs font-bold">{counts[bar.key]}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${bar.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Brand Icon Helper ────────────────────────────────────

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

function InventorySkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 rounded-xl" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

const statusTransition: Record<string, string> = {
  draft: "active",
  active: "sold",
  sold: "archived",
  archived: "draft",
};

export function Inventory() {
  const {
    laptops,
    setLaptops,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    editingLaptopId,
    setEditingLaptopId,
    isFormOpen,
    setIsFormOpen,
    adCreatorLaptopId,
    setAdCreatorLaptopId,
    isAdCreatorOpen,
    setIsAdCreatorOpen,
    setSelectedLaptop,
    isDetailOpen,
    setIsDetailOpen,
    addActivityLog,
    watchlist,
    toggleWatchlist,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LaptopType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [duplicating, setDuplicating] = useState(false);
  const deletedLaptopRef = useRef<LaptopType | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLaptops = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchLaptops();
      setLaptops(Array.isArray(data) ? data : []);
    } catch {
      // Error silently handled
    } finally {
      setLoading(false);
    }
  }, [setLaptops]);

  useEffect(() => {
    fetchLaptops();
  }, [fetchLaptops]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await apiFetchLaptops();
      setLaptops(data);
      toast.success("Data refreshed");
    } catch {
      // Error silently handled
    } finally {
      setRefreshing(false);
    }
  }, [setLaptops]);

  const filteredLaptops = useMemo(() => {
    return (Array.isArray(laptops) ? laptops : [])
      .filter((laptop) => {
        const matchesStatus =
          filterStatus === "all" || laptop.status === filterStatus;
        const query = debouncedQuery.toLowerCase();
        const matchesSearch =
          !query ||
          laptop.brand.toLowerCase().includes(query) ||
          laptop.model.toLowerCase().includes(query) ||
          laptop.status.toLowerCase().includes(query) ||
          laptop.condition.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "price-high":
            return b.askingPrice - a.askingPrice;
          case "price-low":
            return a.askingPrice - b.askingPrice;
          case "brand":
            return a.brand.localeCompare(b.brand);
          case "condition":
            return (CONDITION_ORDER[a.condition] ?? 9) - (CONDITION_ORDER[b.condition] ?? 9);
          default:
            return 0;
        }
      });
  }, [laptops, filterStatus, debouncedQuery, sortBy]);

  const handleExportCsv = useCallback(() => {
    const headers = [
      "Brand", "Model", "CPU", "RAM", "Storage", "GPU", "Screen",
      "Condition", "Battery", "PurchasePrice", "AskingPrice", "Profit",
      "Status", "CreatedAt", "DaysListed"
    ];

    const rows = filteredLaptops.map((l) => {
      const profit = l.askingPrice - l.purchasePrice;
      const now = new Date();
      const created = new Date(l.createdAt);
      const daysListed = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));

      return [
        l.brand,
        l.model,
        l.cpu,
        l.ram,
        l.storage,
        l.gpu,
        l.screenSize,
        l.condition,
        l.batteryHealth,
        l.purchasePrice,
        l.askingPrice,
        profit,
        l.status,
        l.createdAt,
        daysListed,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => {
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `laptopflip-inventory-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredLaptops.length} laptops to CSV`);
  }, [filteredLaptops]);

  const handleEdit = (laptop: LaptopType) => {
    setIsDetailOpen(false);
    setSelectedLaptop(null);
    setEditingLaptopId(laptop.id);
    setIsFormOpen(true);
  };

  const handleViewDetail = (laptop: LaptopType) => {
    setSelectedLaptop(laptop);
    setIsDetailOpen(true);
  };

  const handleCreateAd = (laptop: LaptopType) => {
    setAdCreatorLaptopId(laptop.id);
    setIsAdCreatorOpen(true);
  };

  const handleQuickPrice = async (laptop: LaptopType, delta: number) => {
    const newPrice = Math.max(0, laptop.askingPrice + delta);
    if (newPrice === laptop.askingPrice) return;
    try {
      const updated = await apiUpdateLaptop(laptop.id, { askingPrice: newPrice });
      if (updated) {
        setLaptops((prev: LaptopType[]) =>
          prev.map((l) => (l.id === laptop.id ? { ...l, askingPrice: newPrice } : l))
        );
        addActivityLog({
          laptopId: laptop.id,
          action: "price_update",
          detail: `Price adjusted by ${delta > 0 ? "+" : ""}R${delta} → ${formatPrice(newPrice)}`,
        });
        toast.success(`${laptop.brand} ${laptop.model}: ${formatPrice(newPrice)}`);
      }
    } catch {
      toast.error("Failed to update price");
    }
  };

  const handleDuplicate = async (laptop: LaptopType) => {
    setDuplicating(true);
    try {
      const duplicated = await apiCreateLaptop({
        ...laptop,
        id: undefined,
        model: `${laptop.model} - Copy`,
        status: "draft",
      });
      if (duplicated) {
        setLaptops((prev: LaptopType[]) => [duplicated, ...prev]);
        addActivityLog({
          laptopId: duplicated.id,
          action: "created",
          detail: `Duplicated from ${laptop.brand} ${laptop.model}`,
        });
        toast.success(`Duplicated ${laptop.brand} ${laptop.model}`);
        // Open edit form for the duplicated laptop
        setIsDetailOpen(false);
        setSelectedLaptop(null);
        setEditingLaptopId(duplicated.id);
        setIsFormOpen(true);
      }
    } catch {
      toast.error("Failed to duplicate laptop");
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const success = await apiDeleteLaptop(deleteTarget.id);
      if (success) {
        deletedLaptopRef.current = deleteTarget;
        setLaptops(laptops.filter((l) => l.id !== deleteTarget.id));
        setDeleteTarget(null);

        toast.success("Laptop deleted", {
          action: {
            label: "Undo",
            onClick: async () => {
              const laptop = deletedLaptopRef.current;
              if (!laptop) return;
              const restored = await apiCreateLaptop({ ...laptop, id: undefined });
              if (restored) {
                setLaptops(prev => [restored, ...prev]);
                toast.info("Laptop restored");
              }
            },
          },
          duration: 5000,
        });
      }
    } catch {
      // Error silently handled
    } finally {
      setDeleting(false);
    }
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    active: "Active",
    sold: "Sold",
    archived: "Archived",
  };

  const handleChangeStatus = async (laptop: LaptopType) => {
    const newStatus = statusTransition[laptop.status] || "draft";
    try {
      const updated = await apiUpdateLaptop(laptop.id, { status: newStatus });
      if (updated) {
        setLaptops(
          laptops.map((l) => (l.id === laptop.id ? updated : l))
        );
        addActivityLog({
          laptopId: laptop.id,
          action: "status_change",
          detail: `Status changed to ${statusLabels[newStatus] || newStatus}`,
        });
        toast.success(
          `${laptop.brand} ${laptop.model} → ${statusLabels[newStatus] || newStatus}`
        );
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return <InventorySkeleton />;
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-1"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
              Inventory
            </h1>
            <p className="text-sm text-muted-foreground">
              {filteredLaptops.length} of {laptops.length} laptops
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleExportCsv}
              disabled={filteredLaptops.length === 0}
              aria-label="Export CSV"
            >
              <Download className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh data"
            >
              <RefreshCw className={`size-5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by brand, model, status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-10 rounded-xl h-10 bg-background"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-foreground"
              aria-label="Sort inventory"
            >
              <ArrowUpDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Status Summary Bar */}
      {laptops.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <StatusSummaryBar laptops={laptops} />
        </motion.div>
      )}

      {/* Filter Chips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {filterChips.map((chip) => (
          <Button
            key={chip.value}
            variant={filterStatus === chip.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(chip.value)}
            className={`rounded-full text-xs shrink-0 ${
              filterStatus === chip.value
                ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-sm"
                : ""
            }`}
          >
            {chip.label}
          </Button>
        ))}
      </motion.div>

      {/* Laptop List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredLaptops.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="rounded-xl border-dashed border-2 border-muted py-12">
                <CardContent className="flex flex-col items-center gap-3 text-center p-6">
                  {searchQuery || filterStatus !== "all" ? (
                    <>
                      <div className="relative rounded-full bg-amber-50 dark:bg-amber-900/20 p-5">
                        <Search className="size-8 text-amber-500 dark:text-amber-400" />
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-gray-900 p-1.5 shadow-sm">
                          <PackageSearch className="size-4 text-amber-600 dark:text-amber-300" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">No laptops match your search</p>
                        <p className="text-xs text-muted-foreground">
                          {searchQuery && filterStatus !== "all"
                            ? `No results for "${searchQuery}" in ${filterStatus} items`
                            : searchQuery
                              ? `No results for "${searchQuery}"`
                              : `No ${filterStatus} laptops found`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Try different keywords or clear filters
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-muted p-4">
                        <Laptop className="size-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">No laptops found</p>
                        <p className="text-xs text-muted-foreground">
                          Add your first laptop to get started
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {filteredLaptops.map((laptop, index) => {
            const photos: string[] = Array.isArray(laptop.photos)
              ? laptop.photos
              : laptop.photos
                ? (() => { try { return JSON.parse(laptop.photos); } catch { return []; } })()
                : [];
            const thumbnail = photos[0] || null;

            return (
              <motion.div
                key={laptop.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, transition: { duration: 0.15 } }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.04,
                }}
                layout
              >
                <Card
                  className={`rounded-xl py-0 shadow-sm overflow-hidden cursor-pointer border-l-[3px] ${getConditionBorderColor(laptop.condition)} hover:shadow-xl hover:shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-emerald-300/60 dark:hover:border-emerald-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:ring-1 hover:ring-emerald-200/40 dark:hover:ring-emerald-800/40`}
                  onClick={() => handleViewDetail(laptop)}
                >
                  <CardContent className="p-0">
                    <div className="flex gap-3 p-3">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={`${laptop.brand} ${laptop.model}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <span className={`text-2xl ${thumbnail ? "hidden" : ""}`}>
                          {getBrandIcon(laptop.brand)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">
                              {laptop.brand} {laptop.model}
                            </p>
                            {laptop.stockId && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0 rounded border border-emerald-200 dark:border-emerald-800">
                                <Hash className="size-2.5" />
                                {laptop.stockId}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {abbreviateCpu(laptop.cpu)}
                            {laptop.cpu && laptop.ram ? " · " : ""}
                            {laptop.ram}
                            {laptop.ram && laptop.storage ? " · " : ""}
                            {laptop.storage}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border ${getConditionColor(laptop.condition)}`}
                          >
                            {laptop.condition}
                          </Badge>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border ${getStatusColor(laptop.status)}`}
                          >
                            {laptop.status}
                          </Badge>
                          {watchlist.includes(laptop.id) && (
                            <Badge className="text-[10px] px-1.5 py-0 border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                              <Heart className="size-2.5 mr-0.5 fill-current" />
                              Watched
                            </Badge>
                          )}
                          {laptop.status === "active" && getDaysListed(laptop.createdAt) > 14 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0 rounded-full border border-amber-200 dark:border-amber-800">
                              <span>⚠</span>
                              {getDaysListed(laptop.createdAt) >= 30
                                ? `${Math.floor(getDaysListed(laptop.createdAt) / 7)}w+`
                                : `${getDaysListed(laptop.createdAt)}d+`}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDaysAgo(laptop.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Price & Actions */}
                      <div className="flex flex-col items-end justify-between shrink-0 py-0.5">
                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleWhatsAppShare(laptop)}
                            className="size-6 rounded-md bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 flex items-center justify-center text-green-600 dark:text-green-400 transition-colors"
                            aria-label="Share on WhatsApp"
                          >
                            <MessageCircle className="size-3" />
                          </button>
                          <button
                            onClick={() => handleQuickPrice(laptop, -500)}
                            className="size-6 rounded-md bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Decrease price by R500"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 min-w-[60px] text-right">
                            {formatPrice(laptop.askingPrice)}
                          </span>
                          <button
                            onClick={() => handleQuickPrice(laptop, 500)}
                            className="size-6 rounded-md bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Increase price by R500"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        {laptop.purchasePrice > 0 && laptop.askingPrice > 0 && (
                          <div
                            className={`flex items-center gap-0.5 text-[10px] font-medium mt-0.5 ${
                              laptop.askingPrice > laptop.purchasePrice
                                ? "text-green-600 dark:text-green-400"
                                : laptop.askingPrice < laptop.purchasePrice
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {laptop.askingPrice > laptop.purchasePrice ? (
                              <TrendingUp className="size-3" />
                            ) : laptop.askingPrice < laptop.purchasePrice ? (
                              <TrendingDown className="size-3" />
                            ) : null}
                            <span>
                              {laptop.askingPrice > laptop.purchasePrice
                                ? `R ${(laptop.askingPrice - laptop.purchasePrice).toLocaleString()} profit`
                                : laptop.askingPrice < laptop.purchasePrice
                                  ? `R ${(laptop.purchasePrice - laptop.askingPrice).toLocaleString()} loss`
                                  : "Break even"}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => toggleWatchlist(laptop.id)}
                            className="size-8 rounded-md flex items-center justify-center transition-colors relative"
                            aria-label={watchlist.includes(laptop.id) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            {watchlist.includes(laptop.id) ? (
                              <motion.div
                                key="filled"
                                initial={{ scale: 0.5 }}
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                              >
                                <Heart className="size-3.5 text-rose-500 fill-rose-500" />
                              </motion.div>
                            ) : (
                              <Heart className="size-3.5 text-muted-foreground hover:text-rose-400 transition-colors" />
                            )}
                          </motion.button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleEdit(laptop)}
                            aria-label="Edit laptop"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 relative"
                            onClick={() => handleCreateAd(laptop)}
                            aria-label="Create ad"
                          >
                            <Sparkles className="size-3.5" />
                            {laptop.listings && laptop.listings.length > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
                                {laptop.listings.length}
                              </span>
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label="More options"
                              >
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(laptop)}
                                disabled={duplicating}
                              >
                                <Copy className="size-4" />
                                {duplicating ? "Duplicating..." : "Duplicate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleChangeStatus(laptop)}
                              >
                                <RefreshCw className="size-4" />
                                Mark as {statusLabels[statusTransition[laptop.status] || "draft"]}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(laptop)}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Laptop</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deleteTarget?.brand} {deleteTarget?.model}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
