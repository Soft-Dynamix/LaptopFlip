"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  X,
  Trash2,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Battery,
  ImageIcon,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowLeft,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import { formatPrice } from "@/lib/types";
import type { Laptop } from "@/lib/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────

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

function getConditionBadgeClass(condition: string): string {
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
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
}

function getConditionOrder(condition: string): number {
  switch (condition) {
    case "Mint": return 0;
    case "Excellent": return 1;
    case "Good": return 2;
    case "Fair": return 3;
    case "Poor": return 4;
    default: return 5;
  }
}

function getBatteryBadgeClass(health: string): string {
  switch (health) {
    case "Excellent":
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "Good":
      return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "Fair":
      return "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    case "Poor":
      return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
}

function getBatteryOrder(health: string): number {
  switch (health) {
    case "Excellent": return 0;
    case "Good": return 1;
    case "Fair": return 2;
    case "Poor": return 3;
    default: return 4;
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

function computeHealthScore(laptop: Laptop): number {
  let score = 50;
  // Condition: 0-25 points
  score += (5 - getConditionOrder(laptop.condition)) * 5;
  // Battery: 0-15 points
  score += (4 - getBatteryOrder(laptop.batteryHealth)) * 3.75;
  // Age bonus: up to 10 points
  if (laptop.year) {
    const age = new Date().getFullYear() - laptop.year;
    if (age <= 1) score += 10;
    else if (age <= 2) score += 7;
    else if (age <= 3) score += 4;
    else if (age <= 5) score += 2;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── Spec Row ─────────────────────────────────────────────

interface SpecRowProps {
  label: string;
  valueA?: string;
  valueB?: string;
  winner?: "a" | "b" | "tie" | null;
  isCondition?: boolean;
  isBattery?: boolean;
}

function SpecRow({ label, valueA, valueB, winner, isCondition, isBattery }: SpecRowProps) {
  return (
    <div className={cn(
      "grid grid-cols-[auto_1fr_1fr] gap-0 px-3 py-2 text-sm",
      "odd:bg-muted/30 even:bg-transparent"
    )}>
      <span className="text-xs font-medium text-muted-foreground pr-2 py-1">{label}</span>
      <div className={cn(
        "text-sm text-center py-1 font-medium",
        winner === "a" && "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-l-md"
      )}>
        {isCondition && valueA ? (
          <Badge className={cn("text-[10px] px-1.5 py-0 border", getConditionBadgeClass(valueA))}>
            {valueA}
          </Badge>
        ) : isBattery && valueA ? (
          <Badge className={cn("text-[10px] px-1.5 py-0 border", getBatteryBadgeClass(valueA))}>
            {valueA}
          </Badge>
        ) : (
          <span>{valueA || "—"}</span>
        )}
      </div>
      <div className={cn(
        "text-sm text-center py-1 font-medium",
        winner === "b" && "text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-r-md"
      )}>
        {isCondition && valueB ? (
          <Badge className={cn("text-[10px] px-1.5 py-0 border", getConditionBadgeClass(valueB))}>
            {valueB}
          </Badge>
        ) : isBattery && valueB ? (
          <Badge className={cn("text-[10px] px-1.5 py-0 border", getBatteryBadgeClass(valueB))}>
            {valueB}
          </Badge>
        ) : (
          <span>{valueB || "—"}</span>
        )}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Laptop Photo Header ──────────────────────────────────

function LaptopHeader({ laptop, side }: { laptop: Laptop; side: "a" | "b" }) {
  const photos = parsePhotos(laptop.photos);
  const thumbnail = photos[0] || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: side === "a" ? 0.05 : 0.1 }}
      className="flex-1 min-w-0"
    >
      {/* Photo */}
      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted border mb-2">
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
        <div className={cn("w-full h-full flex items-center justify-center", thumbnail ? "hidden" : "")}>
          <span className="text-4xl">{getBrandIcon(laptop.brand)}</span>
        </div>
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="text-sm font-bold truncate">{laptop.brand} {laptop.model}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Badge className={cn("text-[10px] px-1.5 py-0 border", getConditionBadgeClass(laptop.condition))}>
            {laptop.condition}
          </Badge>
          <Badge className={cn("text-[10px] px-1.5 py-0 border", getBatteryBadgeClass(laptop.batteryHealth))}>
            {laptop.batteryHealth}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────

function EmptyState({
  count,
  onClose,
}: {
  count: number;
  onClose: () => void;
}) {
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: "spring" }}
        className="size-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 flex items-center justify-center"
      >
        <Cpu className="size-10 text-emerald-500 dark:text-emerald-400" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-2"
      >
        <h3 className="text-lg font-bold">Select 2 Laptops to Compare</h3>
        <p className="text-sm text-muted-foreground">
          {count === 0
            ? "Tap the compare option from a laptop's menu in Stock to add laptops."
            : "You've selected 1 laptop. Select 1 more to start comparing."}
        </p>
        <Badge variant="secondary" className="text-sm px-3 py-1 mt-2">
          {count}/2 selected
        </Badge>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex gap-2"
      >
        <Button
          variant="outline"
          onClick={() => {
            onClose();
            setActiveTab("inventory");
          }}
          className="gap-2"
        >
          <Package className="size-4" />
          Go to Stock
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────

export function CompareSheet() {
  const isCompareOpen = useAppStore((s) => s.isCompareOpen);
  const setIsCompareOpen = useAppStore((s) => s.setIsCompareOpen);
  const compareIds = useAppStore((s) => s.compareIds);
  const clearCompare = useAppStore((s) => s.clearCompare);
  const removeFromCompare = useAppStore((s) => s.removeFromCompare);
  const laptops = useAppStore((s) => s.laptops);

  const handleSheetClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsCompareOpen(false);
      }
    },
    [setIsCompareOpen]
  );

  const handleClearSelection = useCallback(() => {
    clearCompare();
    toast.success("Comparison cleared");
  }, [clearCompare]);

  // Look up the two laptops
  const laptopA = useMemo(
    () => laptops.find((l) => l.id === compareIds[0]) || null,
    [laptops, compareIds[0]]
  );
  const laptopB = useMemo(
    () => laptops.find((l) => l.id === compareIds[1]) || null,
    [laptops, compareIds[1]]
  );

  const isReady = laptopA && laptopB;

  // Compute comparison data
  const comparison = useMemo(() => {
    if (!laptopA || !laptopB) return null;

    const profitA = laptopA.askingPrice - laptopA.purchasePrice;
    const profitB = laptopB.askingPrice - laptopB.purchasePrice;
    const marginA = laptopA.purchasePrice > 0 ? Math.round((profitA / laptopA.purchasePrice) * 100) : 0;
    const marginB = laptopB.purchasePrice > 0 ? Math.round((profitB / laptopB.purchasePrice) * 100) : 0;
    const healthA = computeHealthScore(laptopA);
    const healthB = computeHealthScore(laptopB);

    // Condition winner: lower order number = better
    const condOrderA = getConditionOrder(laptopA.condition);
    const condOrderB = getConditionOrder(laptopB.condition);
    const conditionWinner = condOrderA < condOrderB ? "a" : condOrderB < condOrderA ? "b" : "tie";

    // Battery winner: lower order number = better
    const battOrderA = getBatteryOrder(laptopA.batteryHealth);
    const battOrderB = getBatteryOrder(laptopB.batteryHealth);
    const batteryWinner = battOrderA < battOrderB ? "a" : battOrderB < battOrderA ? "b" : "tie";

    // Price winner: lower asking price = better
    const priceWinner = laptopA.askingPrice < laptopB.askingPrice ? "a" : laptopB.askingPrice < laptopA.askingPrice ? "b" : "tie";

    // Margin winner: higher margin = better
    const marginWinner = marginA > marginB ? "a" : marginB > marginA ? "b" : "tie";

    // Health winner: higher = better
    const healthWinner = healthA > healthB ? "a" : healthB > healthA ? "b" : "tie";

    return {
      profitA, profitB, marginA, marginB, healthA, healthB,
      conditionWinner, batteryWinner, priceWinner, marginWinner, healthWinner,
    };
  }, [laptopA, laptopB]);

  return (
    <Sheet open={isCompareOpen} onOpenChange={handleSheetClose}>
      <SheetContent
        side="bottom"
        className="max-h-[95vh] rounded-t-2xl overflow-hidden flex flex-col"
      >
        <SheetHeader className="pb-2 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg flex items-center gap-2">
                <Cpu className="size-5 text-emerald-600 dark:text-emerald-400" />
                Quick Compare
              </SheetTitle>
              <SheetDescription>
                {isReady
                  ? `${laptopA!.brand} ${laptopA!.model} vs ${laptopB!.brand} ${laptopB!.model}`
                  : "Select 2 laptops to compare"}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              disabled={compareIds.length === 0}
              className="text-muted-foreground hover:text-destructive gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 pb-4">
          {!isReady ? (
            <EmptyState count={compareIds.length} onClose={() => setIsCompareOpen(false)} />
          ) : (
            <motion.div
              key={`${laptopA!.id}-${laptopB!.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pt-4"
            >
              {/* ─── Laptop Headers Side by Side ─── */}
              <div className="flex gap-3">
                <LaptopHeader laptop={laptopA!} side="a" />
                <div className="flex items-center self-center">
                  <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-2 py-1">VS</span>
                </div>
                <LaptopHeader laptop={laptopB!} side="b" />
              </div>

              <Separator />

              {/* ─── Hardware Specs ─── */}
              <div className="rounded-xl border overflow-hidden">
                <SectionHeader icon={Cpu} label="Hardware" />
                <SpecRow label="Brand" valueA={laptopA!.brand} valueB={laptopB!.brand} />
                <SpecRow label="Model" valueA={laptopA!.model} valueB={laptopB!.model} />
                <SpecRow label="CPU" valueA={laptopA!.cpu || undefined} valueB={laptopB!.cpu || undefined} />
                <SpecRow label="RAM" valueA={laptopA!.ram || undefined} valueB={laptopB!.ram || undefined} />
                <SpecRow label="Storage" valueA={laptopA!.storage || undefined} valueB={laptopB!.storage || undefined} />
                <SpecRow label="GPU" valueA={laptopA!.gpu || undefined} valueB={laptopB!.gpu || undefined} />
                <SpecRow label="Screen" valueA={laptopA!.screenSize || undefined} valueB={laptopB!.screenSize || undefined} />
              </div>

              {/* ─── Condition ─── */}
              <div className="rounded-xl border overflow-hidden">
                <SectionHeader icon={Battery} label="Condition" />
                <SpecRow
                  label="Condition"
                  valueA={laptopA!.condition}
                  valueB={laptopB!.condition}
                  winner={comparison?.conditionWinner}
                  isCondition
                />
                <SpecRow
                  label="Battery"
                  valueA={laptopA!.batteryHealth}
                  valueB={laptopB!.batteryHealth}
                  winner={comparison?.batteryWinner}
                  isBattery
                />
              </div>

              {/* ─── Pricing ─── */}
              <div className="rounded-xl border overflow-hidden">
                <SectionHeader icon={TrendingUp} label="Pricing" />
                <SpecRow
                  label="Price"
                  valueA={laptopA!.askingPrice > 0 ? formatPrice(laptopA!.askingPrice) : "—"}
                  valueB={laptopB!.askingPrice > 0 ? formatPrice(laptopB!.askingPrice) : "—"}
                  winner={comparison?.priceWinner}
                />
                <SpecRow
                  label="Purchase"
                  valueA={laptopA!.purchasePrice > 0 ? formatPrice(laptopA!.purchasePrice) : "—"}
                  valueB={laptopB!.purchasePrice > 0 ? formatPrice(laptopB!.purchasePrice) : "—"}
                />

                {/* Profit row with colors */}
                {comparison && (
                  <>
                    <div className="grid grid-cols-[auto_1fr_1fr] gap-0 px-3 py-2 text-sm odd:bg-muted/30 even:bg-transparent">
                      <span className="text-xs font-medium text-muted-foreground pr-2 py-1">Profit</span>
                      <div className="text-sm text-center py-1">
                        {laptopA!.purchasePrice > 0 ? (
                          <span className={cn(
                            "font-semibold",
                            comparison.profitA > 0
                              ? "text-green-600 dark:text-green-400"
                              : comparison.profitA < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                          )}>
                            {comparison.profitA > 0 ? "+" : ""}{formatPrice(comparison.profitA)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="text-sm text-center py-1">
                        {laptopB!.purchasePrice > 0 ? (
                          <span className={cn(
                            "font-semibold",
                            comparison.profitB > 0
                              ? "text-green-600 dark:text-green-400"
                              : comparison.profitB < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                          )}>
                            {comparison.profitB > 0 ? "+" : ""}{formatPrice(comparison.profitB)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>

                    {/* Margin row with winner badge */}
                    <div className="grid grid-cols-[auto_1fr_1fr] gap-0 px-3 py-2 text-sm odd:bg-muted/30 even:bg-transparent">
                      <span className="text-xs font-medium text-muted-foreground pr-2 py-1">Margin</span>
                      <div className="flex items-center justify-center gap-1 py-1">
                        <span className={cn(
                          "text-sm font-semibold",
                          comparison.marginWinner === "a" && "text-emerald-700 dark:text-emerald-400"
                        )}>
                          {laptopA!.purchasePrice > 0 ? `${comparison.marginA}%` : "—"}
                        </span>
                        {comparison.marginWinner === "a" && comparison.marginA > 0 && (
                          <Crown className="size-3 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1 py-1">
                        <span className={cn(
                          "text-sm font-semibold",
                          comparison.marginWinner === "b" && "text-emerald-700 dark:text-emerald-400"
                        )}>
                          {laptopB!.purchasePrice > 0 ? `${comparison.marginB}%` : "—"}
                        </span>
                        {comparison.marginWinner === "b" && comparison.marginB > 0 && (
                          <Crown className="size-3 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ─── Health Score ─── */}
              {comparison && (
                <div className="rounded-xl border overflow-hidden">
                  <SectionHeader icon={Battery} label="Health Score" />
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-0 px-3 py-3 odd:bg-muted/30 even:bg-transparent">
                    <span className="text-xs font-medium text-muted-foreground pr-2 py-1">Score</span>
                    <div className="flex items-center justify-center gap-1.5 py-1">
                      <span className={cn(
                        "text-lg font-bold tabular-nums",
                        comparison.healthWinner === "a"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-foreground"
                      )}>
                        {comparison.healthA}
                      </span>
                      {comparison.healthWinner === "a" && (
                        <Crown className="size-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 py-1">
                      <span className={cn(
                        "text-lg font-bold tabular-nums",
                        comparison.healthWinner === "b"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-foreground"
                      )}>
                        {comparison.healthB}
                      </span>
                      {comparison.healthWinner === "b" && (
                        <Crown className="size-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Remove individual buttons ─── */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-muted-foreground hover:text-destructive gap-1.5"
                  onClick={() => removeFromCompare(laptopA!.id)}
                >
                  <X className="size-3.5" />
                  Remove {laptopA!.brand} {laptopA!.model}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-muted-foreground hover:text-destructive gap-1.5"
                  onClick={() => removeFromCompare(laptopB!.id)}
                >
                  <X className="size-3.5" />
                  Remove {laptopB!.brand} {laptopB!.model}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
