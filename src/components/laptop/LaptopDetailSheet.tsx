"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Sparkles,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Battery,
  Palette,
  Calendar,
  Hash,
  Wrench,
  StickyNote,
  TrendingUp,
  TrendingDown,
  Clock,
  ImageIcon,
  AlertCircle,
  Activity,
  Circle,
  MapPin,
  FileText,
  CheckCircle2,
  Send,
  RotateCcw,
  Share2,
  Wallet,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import { apiDeleteLaptop, apiFetchLaptops, apiCreateLaptop, apiUpdateListing, apiUpdateLaptop } from "@/lib/api";
import { formatPrice, PLATFORMS } from "@/lib/types";
import type { Laptop, Listing } from "@/lib/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

// ─── Helpers ──────────────────────────────────────────────

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

function getBatteryColor(health: string) {
  switch (health) {
    case "Excellent":
      return "text-emerald-600 dark:text-emerald-400";
    case "Good":
      return "text-yellow-600 dark:text-yellow-400";
    case "Fair":
      return "text-orange-600 dark:text-orange-400";
    case "Poor":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

function parsePhotos(photos: string): string[] {
  if (Array.isArray(photos)) return photos;
  if (!photos) return [];
  try {
    const parsed = JSON.parse(photos);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

function daysSince(dateString: string): number {
  const created = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function getActionIcon(action: string) {
  switch (action) {
    case "created":
      return { icon: Sparkles, color: "text-emerald-500" };
    case "status_change":
      return { icon: Activity, color: "text-sky-500" };
    case "price_update":
      return { icon: TrendingUp, color: "text-amber-500" };
    case "edited":
      return { icon: Pencil, color: "text-purple-500" };
    case "ad_posted":
      return { icon: CheckCircle2, color: "text-emerald-500" };
    default:
      return { icon: Circle, color: "text-muted-foreground" };
  }
}

function getListingStatusColor(status: string) {
  switch (status) {
    case "draft":
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    case "posted":
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "removed":
      return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
}

function getPlatformBadge(platform: string) {
  const p = PLATFORMS.find((pl) => pl.id === platform);
  if (p) return { name: p.name, color: p.color };
  return { name: platform, color: "#6b7280" };
}

// ─── Detail Row ───────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  iconColor?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon
        className={`size-4 mt-0.5 shrink-0 ${iconColor || "text-muted-foreground"}`}
      />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

// ─── Photo Gallery ────────────────────────────────────────

function PhotoGallery({ photos }: { photos: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToPhoto = useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (scrollRef.current) {
        const container = scrollRef.current;
        const childWidth = container.offsetWidth;
        container.scrollTo({ left: index * childWidth, behavior: "smooth" });
      }
    },
    []
  );

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const childWidth = container.offsetWidth;
    const newIndex = Math.round(container.scrollLeft / childWidth);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex]);

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/30 flex flex-col items-center justify-center gap-2 h-48">
        <ImageIcon className="size-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No photos</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Scrollable photo strip */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl gap-0 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {photos.map((photo, index) => (
          <div
            key={index}
            className="w-full shrink-0 snap-center aspect-[4/3] rounded-2xl overflow-hidden"
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Dot indicators + counter */}
      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToPhoto(index)}
              className={`rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-6 h-2 bg-emerald-600 dark:bg-emerald-400"
                  : "w-2 h-2 bg-muted-foreground/30"
              }`}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
          <span className="text-[10px] text-muted-foreground ml-2">
            {activeIndex + 1}/{photos.length}
          </span>
        </div>
      )}

      {/* Prev/Next buttons */}
      {photos.length > 1 && (
        <div className="flex justify-between px-1 -mt-[calc(2rem+1.5rem+0.5rem+2.5rem)]">
          <button
            onClick={() =>
              scrollToPhoto(activeIndex > 0 ? activeIndex - 1 : photos.length - 1)
            }
            className="size-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() =>
              scrollToPhoto(
                activeIndex < photos.length - 1 ? activeIndex + 1 : 0
              )
            }
            className="size-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────

function ActivityTimeline({ laptopId }: { laptopId: string }) {
  const getActivityLogs = useAppStore((s) => s.getActivityLogs);
  const logs = useMemo(() => getActivityLogs(laptopId), [getActivityLogs, laptopId]);

  // Show the most recent entries first, limit to 10
  const displayLogs = [...logs].reverse().slice(0, 10);

  if (displayLogs.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-3">
        {displayLogs.map((log, index) => {
          const { icon: ActionIcon, color } = getActionIcon(log.action);
          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex gap-3 relative"
            >
              {/* Icon dot */}
              <div className="relative z-10 size-[22px] rounded-full bg-background border-2 border-border flex items-center justify-center shrink-0 mt-0.5">
                <ActionIcon className={`size-3 ${color}`} />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <p className="text-sm font-medium">{log.detail}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatTimeAgo(log.timestamp)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────

export function LaptopDetailSheet() {
  const isDetailOpen = useAppStore((s) => s.isDetailOpen);
  const setIsDetailOpen = useAppStore((s) => s.setIsDetailOpen);
  const selectedLaptop = useAppStore((s) => s.selectedLaptop);
  const setSelectedLaptop = useAppStore((s) => s.setSelectedLaptop);
  const setIsFormOpen = useAppStore((s) => s.setIsFormOpen);
  const setEditingLaptopId = useAppStore((s) => s.setEditingLaptopId);
  const setIsAdCreatorOpen = useAppStore((s) => s.setIsAdCreatorOpen);
  const setAdCreatorLaptopId = useAppStore((s) => s.setAdCreatorLaptopId);
  const setContactsSheetOpen = useAppStore((s) => s.setContactsSheetOpen);
  const setContactsSheetLaptopId = useAppStore((s) => s.setContactsSheetLaptopId);
  const setLaptops = useAppStore((s) => s.setLaptops);
  const addActivityLog = useAppStore((s) => s.addActivityLog);
  const setIsShareCardOpen = useAppStore((s) => s.setIsShareCardOpen);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [listingStatuses, setListingStatuses] = useState<Record<string, string>>({});
  const [updatingListing, setUpdatingListing] = useState<string | null>(null);
  const [quickSellOpen, setQuickSellOpen] = useState(false);
  const [quickSellPrice, setQuickSellPrice] = useState("");
  const [quickSelling, setQuickSelling] = useState(false);

  const photos = selectedLaptop ? parsePhotos(selectedLaptop.photos) : [];
  const days = selectedLaptop ? daysSince(selectedLaptop.createdAt) : 0;

  // Reset gallery scroll when laptop changes
  const [galleryKey, setGalleryKey] = useState(0);
  useEffect(() => {
    if (selectedLaptop) {
      setGalleryKey((prev) => prev + 1);
    }
  }, [selectedLaptop?.id]);

  // Sync listing statuses when laptop changes
  useEffect(() => {
    if (selectedLaptop?.listings) {
      const statuses: Record<string, string> = {};
      for (const listing of selectedLaptop.listings) {
        statuses[listing.id] = listing.status;
      }
      setListingStatuses(statuses);
    } else {
      setListingStatuses({});
    }
  }, [selectedLaptop?.id, selectedLaptop?.listings]);

  const handleSheetClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsDetailOpen(false);
        setSelectedLaptop(null);
      }
    },
    [setIsDetailOpen, setSelectedLaptop]
  );

  const handleEdit = useCallback(() => {
    if (!selectedLaptop) return;
    setIsDetailOpen(false);
    setEditingLaptopId(selectedLaptop.id);
    setSelectedLaptop(null);
    setIsFormOpen(true);
  }, [
    selectedLaptop,
    setIsDetailOpen,
    setEditingLaptopId,
    setSelectedLaptop,
    setIsFormOpen,
  ]);

  const handleCreateAd = useCallback(() => {
    if (!selectedLaptop) return;
    setIsDetailOpen(false);
    setAdCreatorLaptopId(selectedLaptop.id);
    setSelectedLaptop(null);
    setIsAdCreatorOpen(true);
  }, [
    selectedLaptop,
    setIsDetailOpen,
    setAdCreatorLaptopId,
    setSelectedLaptop,
    setIsAdCreatorOpen,
  ]);

  const handleOpenContacts = useCallback(() => {
    if (!selectedLaptop) return;
    setIsDetailOpen(false);
    setSelectedLaptop(null);
    setContactsSheetLaptopId(selectedLaptop.id);
    setContactsSheetOpen(true);
  }, [selectedLaptop, setIsDetailOpen, setSelectedLaptop, setContactsSheetLaptopId, setContactsSheetOpen]);

  const handleDelete = useCallback(async () => {
    if (!selectedLaptop) return;
    setDeleting(true);
    try {
      const success = await apiDeleteLaptop(selectedLaptop.id);
      if (success) {
        toast.success(`${selectedLaptop.brand} ${selectedLaptop.model} deleted`);
        setDeleteDialogOpen(false);
        setIsDetailOpen(false);
        setSelectedLaptop(null);
        // Refresh the laptop list
        const data = await apiFetchLaptops();
        setLaptops(data);
      } else {
        toast.error("Failed to delete laptop");
      }
    } catch {
      toast.error("Failed to delete laptop");
    } finally {
      setDeleting(false);
    }
  }, [
    selectedLaptop,
    setDeleteDialogOpen,
    setIsDetailOpen,
    setSelectedLaptop,
    setLaptops,
  ]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedLaptop) return;
    try {
      const duplicated = await apiCreateLaptop({
        ...selectedLaptop,
        id: undefined,
        model: `${selectedLaptop.model} - Copy`,
        status: "draft",
        photos: "[]",
      });
      if (duplicated) {
        addActivityLog({
          laptopId: duplicated.id,
          action: "created",
          detail: `Duplicated from ${selectedLaptop.brand} ${selectedLaptop.model}`,
        });
        toast.success(`${selectedLaptop.brand} ${selectedLaptop.model} duplicated`);
        const data = await apiFetchLaptops();
        setLaptops(Array.isArray(data) ? data : []);
        setIsDetailOpen(false);
        setSelectedLaptop(null);
      }
    } catch {
      toast.error("Failed to duplicate laptop");
    }
  }, [selectedLaptop, addActivityLog, setLaptops, setIsDetailOpen, setSelectedLaptop]);

  const handleOpenDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(true);
  }, [setDeleteDialogOpen]);

  const handleMarkPosted = useCallback(async (listing: Listing) => {
    if (!selectedLaptop) return;
    setUpdatingListing(listing.id);
    try {
      await apiUpdateListing(listing.id, { status: "posted" });
      setListingStatuses((prev) => ({ ...prev, [listing.id]: "posted" }));
      const updatedLaptop: Laptop = {
        ...selectedLaptop,
        listings: selectedLaptop.listings?.map((l) =>
          l.id === listing.id
            ? { ...l, status: "posted", postedAt: l.postedAt || new Date().toISOString() }
            : l
        ),
      };
      setSelectedLaptop(updatedLaptop);
      setLaptops((prev) =>
        prev.map((l) => (l.id === selectedLaptop.id ? updatedLaptop : l))
      );
      addActivityLog({
        laptopId: selectedLaptop.id,
        action: "ad_posted",
        detail: `Ad marked as posted on ${getPlatformBadge(listing.platform).name}`,
      });
      toast.success(`Ad posted on ${getPlatformBadge(listing.platform).name}`);
    } catch {
      toast.error("Failed to update listing");
    } finally {
      setUpdatingListing(null);
    }
  }, [selectedLaptop, setSelectedLaptop, setLaptops, addActivityLog]);

  const handleMarkDraft = useCallback(async (listing: Listing) => {
    if (!selectedLaptop) return;
    setUpdatingListing(listing.id);
    try {
      await apiUpdateListing(listing.id, { status: "draft" });
      setListingStatuses((prev) => ({ ...prev, [listing.id]: "draft" }));
      const updatedLaptop: Laptop = {
        ...selectedLaptop,
        listings: selectedLaptop.listings?.map((l) =>
          l.id === listing.id
            ? { ...l, status: "draft", postedAt: null }
            : l
        ),
      };
      setSelectedLaptop(updatedLaptop);
      setLaptops((prev) =>
        prev.map((l) => (l.id === selectedLaptop.id ? updatedLaptop : l))
      );
      addActivityLog({
        laptopId: selectedLaptop.id,
        action: "ad_posted",
        detail: `Ad reverted to draft on ${getPlatformBadge(listing.platform).name}`,
      });
      toast.info(`Ad moved to draft`);
    } catch {
      toast.error("Failed to update listing");
    } finally {
      setUpdatingListing(null);
    }
  }, [selectedLaptop, setSelectedLaptop, setLaptops, addActivityLog]);

  const handleQuickSell = useCallback(async () => {
    if (!selectedLaptop) return;
    const salePrice = Number(quickSellPrice) || selectedLaptop.askingPrice;
    if (salePrice <= 0) {
      toast.error("Enter a valid sale price");
      return;
    }
    setQuickSelling(true);
    try {
      const updated = await apiUpdateLaptop(selectedLaptop.id, { status: "sold", askingPrice: salePrice });
      if (updated) {
        setLaptops((prev) => prev.map((l) => (l.id === selectedLaptop.id ? updated : l)));
        const expenses = (selectedLaptop.repairsCost || 0) + (selectedLaptop.listingFees || 0) + (selectedLaptop.otherCosts || 0);
        const totalCost = (selectedLaptop.purchasePrice || 0) + expenses;
        const profitAmount = salePrice - totalCost;
        addActivityLog({
          laptopId: selectedLaptop.id,
          action: "status_change",
          detail: `Quick sold for ${formatPrice(salePrice)} — ${profitAmount >= 0 ? "+" : ""}${formatPrice(profitAmount)} profit`,
        });
        toast.success(`Sold ${selectedLaptop.brand} ${selectedLaptop.model} for ${formatPrice(salePrice)}`, {
          description: profitAmount >= 0 ? `Profit: ${formatPrice(profitAmount)} (${Math.round((profitAmount / totalCost) * 100)}%)` : `Loss: ${formatPrice(Math.abs(profitAmount))}`,
        });
        setQuickSellOpen(false);
        setQuickSellPrice("");
        setIsDetailOpen(false);
        setSelectedLaptop(null);
      }
    } catch {
      toast.error("Failed to mark as sold");
    } finally {
      setQuickSelling(false);
    }
  }, [selectedLaptop, quickSellPrice, setLaptops, addActivityLog, setIsDetailOpen, setSelectedLaptop]);

  if (!selectedLaptop) return null;

  const purchasePrice = selectedLaptop.purchasePrice || 0;
  const askingPrice = selectedLaptop.askingPrice || 0;
  const repairsCost = selectedLaptop.repairsCost || 0;
  const listingFees = selectedLaptop.listingFees || 0;
  const otherCosts = selectedLaptop.otherCosts || 0;
  const totalExpenses = repairsCost + listingFees + otherCosts;
  const totalInvested = purchasePrice + totalExpenses;
  const profit = askingPrice - totalInvested;
  const hasPricing = purchasePrice > 0 && askingPrice > 0;
  const hasExpenses = totalExpenses > 0;
  const margin =
    totalInvested > 0
      ? Math.round((profit / totalInvested) * 100)
      : 0;

  return (
    <>
      <Sheet open={isDetailOpen} onOpenChange={handleSheetClose}>
        <SheetContent
          side="bottom"
          className="max-h-[95vh] rounded-t-2xl overflow-hidden flex flex-col"
        >
          <SheetHeader className="pb-2 border-b border-border/50 shrink-0">
            <SheetTitle className="text-lg">Laptop Details</SheetTitle>
            <SheetDescription>
              {selectedLaptop.brand} {selectedLaptop.model}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 pb-4 space-y-5 pt-4">
            {/* ─── Photo Gallery ─── */}
            <motion.div
              key={galleryKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <PhotoGallery photos={photos} />
            </motion.div>

            {/* ─── Title + Badges ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="space-y-2"
            >
              <h2 className="text-xl font-bold tracking-tight">
                {selectedLaptop.brand} {selectedLaptop.model}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedLaptop.stockId && (
                  <Badge
                    className="text-xs font-mono font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 gap-1"
                  >
                    <Hash className="size-3" />
                    {selectedLaptop.stockId}
                  </Badge>
                )}
                <Badge
                  className={`text-xs px-2 py-0.5 border ${getConditionColor(selectedLaptop.condition)}`}
                >
                  {selectedLaptop.condition}
                </Badge>
                <Badge
                  className={`text-xs px-2 py-0.5 border ${getStatusColor(selectedLaptop.status)}`}
                >
                  {selectedLaptop.status.charAt(0).toUpperCase() +
                    selectedLaptop.status.slice(1)}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0.5 gap-1"
                >
                  <Clock className="size-3" />
                  {days === 0
                    ? "Today"
                    : days === 1
                      ? "1 day"
                      : `${days} days`}
                </Badge>
              </div>
            </motion.div>

            {/* ─── Stale Listing Warning ─── */}
            {selectedLaptop.status === "active" && days >= 14 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.07 }}
              >
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-3">
                  <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Listed for {days} days
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Consider adjusting the price or refreshing the listing to attract more buyers.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <Separator />

            {/* ─── Specifications ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                <Cpu className="size-4" />
                Specifications
              </h3>
              <Card className="rounded-xl">
                <CardContent className="p-4 space-y-0.5">
                  <DetailRow
                    icon={Cpu}
                    label="Processor"
                    value={selectedLaptop.cpu}
                  />
                  <DetailRow
                    icon={MemoryStick}
                    label="Memory"
                    value={selectedLaptop.ram}
                  />
                  <DetailRow
                    icon={HardDrive}
                    label="Storage"
                    value={selectedLaptop.storage}
                  />
                  <DetailRow
                    icon={Monitor}
                    label="Graphics"
                    value={selectedLaptop.gpu}
                  />
                  <DetailRow
                    icon={Monitor}
                    label="Screen Size"
                    value={selectedLaptop.screenSize}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* ─── Condition & Battery ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                <Battery className="size-4" />
                Condition & Battery
              </h3>
              <Card className="rounded-xl">
                <CardContent className="p-4 space-y-0.5">
                  <DetailRow
                    icon={AlertCircle}
                    label="Condition"
                    value={selectedLaptop.condition}
                    iconColor={getConditionColor(selectedLaptop.condition).split(" ").find(c => c.startsWith("text-"))}
                  />
                  <DetailRow
                    icon={Battery}
                    label="Battery Health"
                    value={selectedLaptop.batteryHealth}
                    iconColor={getBatteryColor(selectedLaptop.batteryHealth)}
                  />
                  <DetailRow
                    icon={Wrench}
                    label="Repairs"
                    value={selectedLaptop.repairs}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* ─── Features & Ports ─── */}
            {selectedLaptop.features && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.175 }}
              >
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                  <Wrench className="size-4" />
                  Features & Ports
                </h3>
                <Card className="rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLaptop.features.split(/[,\n]+/).map((feature, i) => {
                        const trimmed = feature.trim();
                        if (!trimmed) return null;
                        return (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                          >
                            {trimmed}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ─── Details ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                <Hash className="size-4" />
                Details
              </h3>
              <Card className="rounded-xl">
                <CardContent className="p-4 space-y-0.5">
                  <DetailRow
                    icon={Hash}
                    label="Stock ID"
                    value={selectedLaptop.stockId}
                    iconColor="text-emerald-600 dark:text-emerald-400"
                  />
                  <DetailRow
                    icon={Calendar}
                    label="Year"
                    value={
                      selectedLaptop.year
                        ? selectedLaptop.year.toString()
                        : undefined
                    }
                  />
                  <DetailRow
                    icon={Palette}
                    label="Color"
                    value={selectedLaptop.color}
                  />
                  <DetailRow
                    icon={Hash}
                    label="Serial Number"
                    value={selectedLaptop.serialNumber}
                  />
                  <DetailRow
                    icon={Calendar}
                    label="Created"
                    value={formatDate(selectedLaptop.createdAt)}
                  />
                  <DetailRow
                    icon={Calendar}
                    label="Last Updated"
                    value={formatDate(selectedLaptop.updatedAt)}
                  />
                  <DetailRow
                    icon={MapPin}
                    label="Location"
                    value={selectedLaptop.location}
                    iconColor="text-emerald-600 dark:text-emerald-400"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* ─── Pricing ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                <TrendingUp className="size-4" />
                Pricing
              </h3>
              <Card className="rounded-xl">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Purchase Price
                      </p>
                      <p className="text-lg font-bold">
                        {purchasePrice > 0
                          ? formatPrice(purchasePrice)
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Asking Price
                      </p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {askingPrice > 0
                          ? formatPrice(askingPrice)
                          : "Not set"}
                      </p>
                    </div>
                  </div>

                  {hasPricing && (
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      {/* Expense breakdown */}
                      {hasExpenses && (
                        <div className="space-y-1.5 pb-2 border-b border-border/30">
                          <p className="text-xs font-medium text-muted-foreground">Additional Costs</p>
                          <div className="grid grid-cols-3 gap-2">
                            {repairsCost > 0 && (
                              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 text-center">
                                <p className="text-[10px] text-muted-foreground">Repairs</p>
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{formatPrice(repairsCost)}</p>
                              </div>
                            )}
                            {listingFees > 0 && (
                              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 text-center">
                                <p className="text-[10px] text-muted-foreground">Fees</p>
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{formatPrice(listingFees)}</p>
                              </div>
                            )}
                            {otherCosts > 0 && (
                              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 text-center">
                                <p className="text-[10px] text-muted-foreground">Other</p>
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{formatPrice(otherCosts)}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-muted-foreground">Total Invested</span>
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{formatPrice(totalInvested)}</span>
                          </div>
                        </div>
                      )}
                      {/* Net profit */}
                      <div
                        className={`flex items-center gap-2 rounded-lg p-3 ${
                          profit > 0
                            ? "bg-emerald-50 dark:bg-emerald-950/30"
                            : profit < 0
                              ? "bg-red-50 dark:bg-red-950/30"
                              : "bg-muted"
                        }`}
                      >
                        {profit > 0 ? (
                          <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
                        ) : profit < 0 ? (
                          <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <TrendingUp className="size-5 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              profit > 0
                                ? "text-emerald-700 dark:text-emerald-300"
                                : profit < 0
                                  ? "text-red-700 dark:text-red-300"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {profit > 0
                              ? `${formatPrice(profit)} profit`
                              : profit < 0
                                ? `${formatPrice(Math.abs(profit))} loss`
                                : "Break even"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {margin !== 0 ? `${margin}% margin` : "No margin"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ─── Investment Analysis (when pricing is set) ─── */}
            {hasPricing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.275 }}
              >
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                  <Wallet className="size-4" />
                  Investment Analysis
                </h3>
                <Card className="rounded-xl overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Visual progress bar: asking vs invested */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Cost Recovery</span>
                        <span className={`font-semibold ${totalInvested > 0 && askingPrice >= totalInvested ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {totalInvested > 0 ? Math.min(100, Math.round((askingPrice / totalInvested) * 100)) : 0}%
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${totalInvested > 0 && askingPrice >= totalInvested ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-red-400 to-red-500"}`}
                          style={{ width: `${totalInvested > 0 ? Math.min(100, Math.round((askingPrice / totalInvested) * 100)) : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown rows */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Banknote className="size-3.5" />
                          Purchase
                        </span>
                        <span className="font-medium">{formatPrice(purchasePrice)}</span>
                      </div>
                      {hasExpenses && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Wrench className="size-3.5" />
                            Expenses
                          </span>
                          <span className="font-medium text-amber-700 dark:text-amber-300">{formatPrice(totalExpenses)}</span>
                        </div>
                      )}
                      <div className="h-px bg-border/50" />
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span>Total Invested</span>
                        <span className="text-amber-700 dark:text-amber-300">{formatPrice(totalInvested)}</span>
                      </div>
                    </div>

                    {/* Profit badge */}
                    <div className={`flex items-center gap-2 rounded-xl p-3 ${profit > 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" : profit < 0 ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : "bg-muted border border-border"}`}>
                      {profit > 0 ? (
                        <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      ) : profit < 0 ? (
                        <div className="size-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                          <TrendingDown className="size-4 text-red-600 dark:text-red-400" />
                        </div>
                      ) : (
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                          <Activity className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className={`text-base font-bold ${profit > 0 ? "text-emerald-700 dark:text-emerald-300" : profit < 0 ? "text-red-700 dark:text-red-300" : "text-muted-foreground"}`}>
                          {profit > 0 ? formatPrice(profit) : profit < 0 ? `-${formatPrice(Math.abs(profit))}` : "Break even"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {margin !== 0 ? `${margin}% ${margin > 0 ? "profit" : "loss"} margin` : "No margin data"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ─── Notes ─── */}
            {selectedLaptop.notes && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                  <StickyNote className="size-4" />
                  Notes
                </h3>
                <Card className="rounded-xl">
                  <CardContent className="p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                      {selectedLaptop.notes}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ─── Ad History ─── */}
            {selectedLaptop.listings && selectedLaptop.listings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.325 }}
              >
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                  <FileText className="size-4" />
                  Ad History
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                    {selectedLaptop.listings.length} ads
                  </Badge>
                </h3>

                {/* Posted vs Draft summary */}
                {(() => {
                  const posted = selectedLaptop.listings!.filter(
                    (l) => listingStatuses[l.id] === "posted"
                  ).length;
                  const drafts = selectedLaptop.listings!.length - posted;
                  return (
                    <div className="flex gap-3 mb-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">{posted}</span>
                        <span className="text-muted-foreground">posted</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <RotateCcw className="size-3.5 text-gray-400" />
                        <span className="font-medium text-muted-foreground">{drafts}</span>
                        <span className="text-muted-foreground">draft</span>
                      </div>
                    </div>
                  );
                })()}

                <Card className="rounded-xl">
                  <CardContent className="p-3 space-y-2 max-h-64 overflow-y-auto">
                    {selectedLaptop.listings.map((listing) => {
                      const currentStatus = listingStatuses[listing.id] || listing.status;
                      const platformInfo = getPlatformBadge(listing.platform);
                      return (
                        <div
                          key={listing.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                        >
                          {/* Platform indicator */}
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${platformInfo.color}20` }}
                          >
                            <span className="text-xs font-bold" style={{ color: platformInfo.color }}>
                              {platformInfo.name.charAt(0)}
                            </span>
                          </div>

                          {/* Listing info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold truncate">
                                {listing.adTitle || `${platformInfo.name} Ad`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(listing.createdAt)}
                              </span>
                              {listing.postedAt && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">·</span>
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                    Posted {formatTimeAgo(listing.postedAt)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Status badge + action */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              className={`text-[10px] px-1.5 py-0 border ${getListingStatusColor(currentStatus)}`}
                            >
                              {currentStatus === "posted" ? "Posted" : currentStatus === "removed" ? "Removed" : "Draft"}
                            </Badge>
                            {currentStatus === "draft" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                onClick={() => handleMarkPosted(listing)}
                                disabled={updatingListing === listing.id}
                                aria-label="Mark as posted"
                              >
                                <Send className="size-3" />
                              </Button>
                            )}
                            {currentStatus === "posted" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-muted-foreground hover:bg-muted"
                                onClick={() => handleMarkDraft(listing)}
                                disabled={updatingListing === listing.id}
                                aria-label="Revert to draft"
                              >
                                <RotateCcw className="size-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ─── Activity Log ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                <Activity className="size-4" />
                Activity
              </h3>
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <ActivityTimeline laptopId={selectedLaptop.id} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ─── Action Buttons ─── */}
          <div className="shrink-0 border-t border-border/50 pt-3 pb-2 space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={handleEdit}
                variant="outline"
                className="flex-1 rounded-xl h-11 gap-2"
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                onClick={handleCreateAd}
                variant="outline"
                className="flex-1 rounded-xl h-11 gap-2"
              >
                <Sparkles className="size-4" />
                Create Ad
              </Button>
              <Button
                onClick={handleDuplicate}
                variant="outline"
                className="flex-1 rounded-xl h-11 gap-2"
              >
                <Copy className="size-4" />
                Duplicate
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleOpenContacts}
                variant="outline"
                className="flex-1 rounded-xl h-11 gap-2"
              >
                <Users className="size-4" />
                Buyers
              </Button>
              <Button
                onClick={() => setIsShareCardOpen(true)}
                variant="outline"
                className="flex-1 rounded-xl h-11 gap-2"
              >
                <Share2 className="size-4" />
                Share
              </Button>
            </div>
            <Button
              onClick={handleOpenDeleteDialog}
              variant="ghost"
              className="w-full rounded-xl h-10 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            >
              <Trash2 className="size-4" />
              Delete Laptop
            </Button>
            {selectedLaptop.status !== "sold" && selectedLaptop.status !== "archived" && (
              <Button
                onClick={() => { setQuickSellPrice(selectedLaptop.askingPrice?.toString() || ""); setQuickSellOpen(true); }}
                className="w-full rounded-xl h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold gap-2 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="size-4" />
                Quick Sell
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Laptop</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {selectedLaptop?.brand} {selectedLaptop?.model}
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

      {/* Quick Sell Dialog */}
      <AlertDialog open={quickSellOpen} onOpenChange={(open) => { if (!open) { setQuickSellOpen(false); setQuickSellPrice(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quick Sell — {selectedLaptop?.brand} {selectedLaptop?.model}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the final sale price to mark this laptop as sold.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Sale Price</label>
            <input
              type="number"
              value={quickSellPrice}
              onChange={(e) => setQuickSellPrice(e.target.value)}
              placeholder="Enter sale price..."
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              autoFocus
            />
            {quickSellPrice && Number(quickSellPrice) > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Est. profit: {purchasePrice > 0 ? formatPrice(Number(quickSellPrice) - totalInvested) : "Set purchase price to see profit estimate"}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={quickSelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQuickSell}
              disabled={quickSelling || !quickSellPrice || Number(quickSellPrice) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {quickSelling ? "Selling..." : "Confirm Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
