"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { GitBranch, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore, SALES_STAGES } from "@/lib/store";
import type { SalesStage } from "@/lib/store";
import type { Laptop as LaptopType } from "@/lib/types";
import { formatPrice } from "@/lib/types";

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

export function SalesPipelineTracker() {
  const laptops = useAppStore((s) => s.laptops);
  const laptopStages = useAppStore((s) => s.laptopStages);
  const updateLaptopStage = useAppStore((s) => s.updateLaptopStage);

  const safeLaptops = Array.isArray(laptops) ? laptops : [];

  // Map status to default stage for laptops without explicit pipeline stage
  const laptopStageMap = useMemo(() => {
    const map: Record<string, SalesStage> = {};
    for (const l of safeLaptops) {
      if (laptopStages[l.id]) {
        map[l.id] = laptopStages[l.id];
      } else {
        // Default stage based on status
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
  const nextStages: Record<SalesStage, SalesStage> = {
    draft: "listed",
    listed: "contacted",
    contacted: "negotiating",
    negotiating: "sold",
    sold: "draft",
  };

  const handleAdvanceStage = (laptop: LaptopType) => {
    const currentStage = laptopStageMap[laptop.id] || "draft";
    const nextStage = nextStages[currentStage];
    updateLaptopStage(laptop.id, nextStage);
  };

  // Get laptops for each stage (limit to 2 displayed)
  const getStageLaptops = (stage: SalesStage): LaptopType[] => {
    return safeLaptops.filter((l) => (laptopStageMap[l.id] || "draft") === stage).slice(0, 2);
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

        {/* Stage items (show laptops in non-empty stages) */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {SALES_STAGES.filter((s) => (stageCounts[s.id] || 0) > 0).map((stage, idx) => {
            const stageLaptops = getStageLaptops(stage.id);
            const remaining = (stageCounts[stage.id] || 0) - stageLaptops.length;
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className={`rounded-lg border-l-[3px] ${getStageBorderColor(stage.id)} ${stage.bgColor} ${stage.darkBgColor} p-2.5 space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{getStageIcon(stage.id)}</span>
                    <span className={`text-[11px] font-semibold ${stage.textColor} ${stage.darkTextColor}`}>
                      {stage.label}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {stageCounts[stage.id]}
                  </Badge>
                </div>
                {stageLaptops.map((laptop) => (
                  <motion.button
                    key={laptop.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAdvanceStage(laptop)}
                    className="w-full flex items-center justify-between rounded-md bg-background/60 dark:bg-background/30 px-2 py-1.5 hover:bg-background/90 dark:hover:bg-background/60 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs truncate font-medium">
                        {laptop.brand} {laptop.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatPrice(laptop.askingPrice)}
                      </span>
                      <ChevronRight className="size-3 text-muted-foreground/50 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </motion.button>
                ))}
                {remaining > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{remaining} more
                  </p>
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
