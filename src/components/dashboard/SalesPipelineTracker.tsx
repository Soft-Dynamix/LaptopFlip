"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GitBranch, ChevronRight, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore, SALES_STAGES } from "@/lib/store";
import type { SalesStage } from "@/lib/store";
import type { Laptop as LaptopType } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { toast } from "sonner";

function getStageIcon(stage: SalesStage) {
  switch (stage) {
    case "draft": return "📝";
    case "listed": return "📢";
    case "contacted": return "💬";
    case "negotiating": return "🤝";
    case "sold": return "✅";
    default: return "📝";
  }
}

function getStageBorderColor(stage: SalesStage): string {
  switch (stage) {
    case "draft": return "border-l-gray-400 dark:border-l-gray-500";
    case "listed": return "border-l-emerald-400 dark:border-l-emerald-500";
    case "contacted": return "border-l-sky-400 dark:border-l-sky-500";
    case "negotiating": return "border-l-amber-400 dark:border-l-amber-500";
    case "sold": return "border-l-rose-400 dark:border-l-rose-500";
    default: return "border-l-gray-400";
  }
}

function getStageDotColor(stage: SalesStage): string {
  switch (stage) {
    case "draft": return "bg-gray-500 dark:bg-gray-400";
    case "listed": return "bg-emerald-500 dark:bg-emerald-400";
    case "contacted": return "bg-sky-500 dark:bg-sky-400";
    case "negotiating": return "bg-amber-500 dark:bg-amber-400";
    case "sold": return "bg-rose-500 dark:bg-rose-400";
    default: return "bg-gray-400";
  }
}

export function SalesPipelineTracker() {
  const laptops = useAppStore((s) => s.laptops);
  const laptopStages = useAppStore((s) => s.laptopStages);
  const updateLaptopStage = useAppStore((s) => s.updateLaptopStage);
  const clearAllStages = useAppStore((s) => s.clearAllStages);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const safeLaptops = Array.isArray(laptops) ? laptops : [];

  // Map status to default stage for laptops without explicit pipeline stage
  const laptopStageMap = useMemo(() => {
    const map: Record<string, SalesStage> = {};
    for (const l of safeLaptops) {
      if (laptopStages[l.id]) {
        map[l.id] = laptopStages[l.id];
      } else {
        switch (l.status) {
          case "draft": map[l.id] = "draft"; break;
          case "active": map[l.id] = "listed"; break;
          case "sold": map[l.id] = "sold"; break;
          default: map[l.id] = "draft";
        }
      }
    }
    return map;
  }, [safeLaptops, laptopStages]);

  // Count per stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of SALES_STAGES) {
      counts[stage.id] = 0;
    }
    for (const l of safeLaptops) {
      const stage = laptopStageMap[l.id] || "draft";
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return counts;
  }, [safeLaptops, laptopStageMap]);

  const totalInPipeline = safeLaptops.length;
  const hasStages = Object.keys(laptopStages).length > 0;

  const handleStageChange = (laptopId: string, newStage: SalesStage) => {
    setTransitioningId(laptopId);
    updateLaptopStage(laptopId, newStage);
    setTimeout(() => setTransitioningId(null), 300);
  };

  const handleClearAll = () => {
    clearAllStages();
    toast.success("Pipeline stages cleared");
  };

  // Get laptops for each stage (limit to 2 displayed)
  const getStageLaptops = (stage: SalesStage): LaptopType[] => {
    return safeLaptops.filter((l) => (laptopStageMap[l.id] || "draft") === stage).slice(0, 3);
  };

  return (
    <Card className="rounded-xl border shadow-sm overflow-hidden relative">
      {/* Gradient left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-sky-500 to-rose-500 dark:from-emerald-600 dark:via-sky-700 dark:to-rose-800 rounded-l-xl" />
      <CardContent className="p-4 pl-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-100 to-sky-100 dark:from-emerald-900/40 dark:to-sky-900/40 flex items-center justify-center shrink-0">
            <GitBranch className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Sales Pipeline</p>
            <p className="text-xs text-muted-foreground">
              {totalInPipeline} laptop{totalInPipeline !== 1 ? "s" : ""} in pipeline
            </p>
          </div>
          {hasStages && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-muted-foreground hover:text-red-500 gap-1"
              onClick={handleClearAll}
            >
              <RotateCcw className="size-3" />
              Clear
            </Button>
          )}
        </div>

        {/* Stage Progress Bar */}
        {totalInPipeline > 0 && (
          <div className="space-y-2">
            {/* Visual pipeline */}
            <div className="flex items-center gap-1">
              {SALES_STAGES.map((stage, index) => {
                const count = stageCounts[stage.id] || 0;
                const pct = totalInPipeline > 0 ? (count / totalInPipeline) * 100 : 0;
                return (
                  <div key={stage.id} className="flex-1 space-y-1">
                    <motion.div
                      className="relative rounded-full overflow-hidden h-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* Background track */}
                      <div className={`absolute inset-0 ${stage.bgColor} ${stage.darkBgColor} rounded-full`} />
                      {/* Filled portion */}
                      <motion.div
                        className={`absolute inset-y-0 left-0 ${stage.color} ${stage.darkColor} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 4)}%` }}
                        transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                      />
                    </motion.div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{getStageIcon(stage.id)}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{stage.label}</span>
                      </div>
                      <motion.span
                        className="text-[10px] font-bold"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15, delay: index * 0.1 + 0.3 }}
                      >
                        {count}
                      </motion.span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connector arrows between stages */}
            <div className="flex items-center justify-center gap-1 -mt-1">
              {SALES_STAGES.slice(0, -1).map((_, i) => (
                <ChevronRight key={i} className="size-3 text-muted-foreground/40" />
              ))}
            </div>
          </div>
        )}

        {/* Stage items (show ALL stages including empty ones) */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {SALES_STAGES.map((stage, idx) => {
            const stageLaptops = getStageLaptops(stage.id);
            const count = stageCounts[stage.id] || 0;
            const remaining = count - stageLaptops.length;
            const isEmpty = count === 0;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className={`rounded-lg border-l-[3px] ${getStageBorderColor(stage.id)} ${isEmpty ? "border border-dashed border-muted-foreground/20 bg-muted/10 dark:bg-muted/5" : `${stage.bgColor} ${stage.darkBgColor} border border-transparent`} p-2.5 space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{getStageIcon(stage.id)}</span>
                    <span className={`text-[11px] font-semibold ${stage.textColor} ${stage.darkTextColor}`}>
                      {stage.label}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {count}
                  </Badge>
                </div>

                {isEmpty ? (
                  <div className="flex items-center justify-center py-2 opacity-50">
                    <p className="text-[10px] text-muted-foreground italic">No laptops</p>
                  </div>
                ) : (
                  <>
                    {stageLaptops.map((laptop) => (
                      <div
                        key={laptop.id}
                        className={`w-full flex items-center justify-between rounded-md bg-background/60 dark:bg-background/30 px-2 py-1.5 hover:bg-background/90 dark:hover:bg-background/60 transition-all duration-200 ${transitioningId === laptop.id ? "opacity-50 scale-[0.98]" : ""}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className={`size-4 rounded-full ${getStageDotColor(laptopStageMap[laptop.id] || "draft")} shrink-0 ring-2 ring-background hover:ring-offset-1 hover:ring-offset-muted transition-all duration-200 cursor-pointer`}
                                aria-label={`Change stage for ${laptop.brand} ${laptop.model}`}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1.5" side="bottom" align="start">
                              <div className="space-y-0.5">
                                {SALES_STAGES.map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => handleStageChange(laptop.id, s.id)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                      (laptopStageMap[laptop.id] || "draft") === s.id
                                        ? `${s.bgColor} ${s.darkBgColor} font-semibold`
                                        : "hover:bg-muted"
                                    }`}
                                  >
                                    <span className="text-sm">{getStageIcon(s.id)}</span>
                                    <span>{s.label}</span>
                                    {(laptopStageMap[laptop.id] || "draft") === s.id && (
                                      <span className="ml-auto text-emerald-500">✓</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <span className="text-xs truncate font-medium">
                            {laptop.brand} {laptop.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatPrice(laptop.askingPrice)}
                          </span>
                          <ChevronRight className="size-3 text-muted-foreground/50" />
                        </div>
                      </div>
                    ))}
                    {remaining > 0 && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        +{remaining} more
                      </p>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        {totalInPipeline === 0 && (
          <div className="flex items-center gap-2 py-2">
            <span className="text-xs text-muted-foreground">
              Add laptops to track them through your sales pipeline
            </span>
          </div>
        )}
      </CardContent>
      <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-rose-500 dark:from-emerald-600 dark:via-sky-600 dark:to-rose-700 opacity-40" />
    </Card>
  );
}
