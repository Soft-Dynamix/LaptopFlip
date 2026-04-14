"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ChevronDown, Info, TrendingUp, Zap, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatPrice } from "@/lib/types";

const CONDITIONS = ["Mint", "Excellent", "Good", "Fair", "Poor"] as const;
const AGES = ["New", "1yr", "2yr", "3yr+"] as const;
const YES_NO = ["Yes", "No"] as const;

const CONDITION_MULTIPLIERS: Record<string, { value: number; label: string; color: string; darkColor: string }> = {
  "Mint":      { value: 1.10, label: "+10%", color: "text-emerald-600",  darkColor: "dark:text-emerald-400" },
  "Excellent": { value: 1.05, label: "+5%",  color: "text-sky-600",      darkColor: "dark:text-sky-400" },
  "Good":      { value: 1.00, label: "0%",   color: "text-amber-600",    darkColor: "dark:text-amber-400" },
  "Fair":      { value: 0.90, label: "-10%", color: "text-orange-600",   darkColor: "dark:text-orange-400" },
  "Poor":      { value: 0.80, label: "-20%", color: "text-red-600",      darkColor: "dark:text-red-400" },
};

const QUICK_PRESETS = [
  { label: "Budget", sub: "Under R5k", range: [1000, 5000], icon: "🏷️", color: "from-amber-500 to-orange-500" },
  { label: "Mid-Range", sub: "R5k–R15k", range: [5000, 15000], icon: "💰", color: "from-emerald-500 to-teal-500" },
  { label: "Premium", sub: "R15k+", range: [15000, 50000], icon: "👑", color: "from-rose-500 to-pink-500" },
];

// ─── Visual Gauge Component ─────────────────────────
function PriceGauge({ value, min, max, suggested }: { value: number; min: number; max: number; suggested: number }) {
  // Normalize suggested price to a 0-100 scale for the gauge
  const range = Math.max(max - min, 1);
  const normalized = Math.min(100, Math.max(0, ((suggested - min) / range) * 100));

  // Determine gauge color based on position
  const gaugeColor = normalized < 25
    ? "text-amber-500"
    : normalized < 50
    ? "text-emerald-500"
    : normalized < 75
    ? "text-sky-500"
    : "text-rose-500";

  const gaugeBg = normalized < 25
    ? "stroke-amber-500"
    : normalized < 50
    ? "stroke-emerald-500"
    : normalized < 75
    ? "stroke-sky-500"
    : "stroke-rose-500";

  // Arc parameters for a semicircle gauge
  const radius = 40;
  const strokeWidth = 6;
  const cx = 50;
  const cy = 52;
  const startAngle = -180;
  const endAngle = 0;
  const angle = startAngle + (normalized / 100) * (endAngle - startAngle);

  const startX = cx + radius * Math.cos((startAngle * Math.PI) / 180);
  const startY = cy + radius * Math.sin((startAngle * Math.PI) / 180);
  const endX = cx + radius * Math.cos((angle * Math.PI) / 180);
  const endY = cy + radius * Math.sin((angle * Math.PI) / 180);
  const largeArcFlag = normalized > 50 ? 1 : 0;
  const pathD = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;

  // Background arc
  const bgEndX = cx + radius * Math.cos((endAngle * Math.PI) / 180);
  const bgEndY = cy + radius * Math.sin((endAngle * Math.PI) / 180);
  const bgPathD = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${bgEndX} ${bgEndY}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[120px] h-[70px]">
        <svg viewBox="0 0 100 65" className="w-full h-full">
          {/* Background track */}
          <path
            d={bgPathD}
            fill="none"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            className="text-muted/30"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <motion.path
            d={pathD}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={gaugeBg}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          {/* Needle dot */}
          <motion.circle
            cx={endX}
            cy={endY}
            r={3}
            className="fill-current"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, cx: endX, cy: endY }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ color: normalized < 25 ? "#f59e0b" : normalized < 50 ? "#10b981" : normalized < 75 ? "#0ea5e9" : "#f43f5e" }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <Gauge className={`size-3.5 mx-auto mb-0.5 ${gaugeColor}`} />
          <span className="text-[10px] text-muted-foreground font-medium">Market Position</span>
        </div>
      </div>

      {/* Range indicators */}
      <div className="flex items-center gap-3 mt-1 w-full max-w-[200px]">
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">Min</p>
          <p className="text-xs font-semibold">{formatPrice(min)}</p>
        </div>
        <motion.div
          className="h-px flex-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-rose-400 opacity-50"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />
        <div className="flex-1 text-center">
          <p className="text-[10px] text-muted-foreground">Max</p>
          <p className="text-xs font-semibold">{formatPrice(max)}</p>
        </div>
      </div>
    </div>
  );
}

export function PricingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [condition, setCondition] = useState<string>("Good");
  const [age, setAge] = useState<string>("1yr");
  const [hasBox, setHasBox] = useState<string>("Yes");
  const [hasCharger, setHasCharger] = useState<string>("Yes");
  const [basePrice, setBasePrice] = useState<string>("");

  const condMultiplier = CONDITION_MULTIPLIERS[condition] || CONDITION_MULTIPLIERS["Good"];

  const result = useMemo(() => {
    const price = parseFloat(basePrice);
    if (!price || price <= 0) return null;

    // Base markup by condition
    let markup = 1;
    switch (condition) {
      case "Mint": markup = 1.35; break;
      case "Excellent": markup = 1.25; break;
      case "Good": markup = 1.15; break;
      case "Fair": markup = 1.05; break;
      case "Poor": markup = 0.9; break;
    }

    // Deduct for age (5% per year)
    let ageYears = 0;
    switch (age) {
      case "New": ageYears = 0; break;
      case "1yr": ageYears = 1; break;
      case "2yr": ageYears = 2; break;
      case "3yr+": ageYears = 3; break;
    }
    const ageDeduction = 0.05 * ageYears;

    // Deduct for missing items
    const boxDeduction = hasBox === "No" ? 0.03 : 0;
    const chargerDeduction = hasCharger === "No" ? 0.02 : 0;

    const totalDeduction = ageDeduction + boxDeduction + chargerDeduction;
    const effectiveMarkup = Math.max(0.7, markup - totalDeduction);

    const suggestedPrice = Math.round(price * effectiveMarkup);
    const minPrice = Math.round(suggestedPrice * 0.9);
    const maxPrice = Math.round(suggestedPrice * 1.1);

    // Market range boundaries (budget: 1k-5k, mid: 5k-15k, premium: 15k-50k)
    const marketMin = 1000;
    const marketMax = 50000;

    // Estimated days to sell based on condition
    let estDays: number;
    let sellLabel: string;
    switch (condition) {
      case "Mint": estDays = 5; sellLabel = "Sells fast"; break;
      case "Excellent": estDays = 8; sellLabel = "Quick sale"; break;
      case "Good": estDays = 14; sellLabel = "Average"; break;
      case "Fair": estDays = 21; sellLabel = "Slower sale"; break;
      case "Poor": estDays = 30; sellLabel = "Parts market"; break;
      default: estDays = 14; sellLabel = "Average";
    }

    const profitMargin = Math.round(((suggestedPrice - price) / price) * 100);

    return {
      suggestedPrice,
      minPrice,
      maxPrice,
      marketMin,
      marketMax,
      estDays,
      sellLabel,
      profitMargin,
      effectiveMarkup: effectiveMarkup * 100,
    };
  }, [basePrice, condition, age, hasBox, hasCharger]);

  const handlePresetClick = (range: [number, number]) => {
    // Set base price to the midpoint of the range
    const mid = Math.round((range[0] + range[1]) / 2);
    setBasePrice(mid.toString());
  };

  return (
    <Card className="rounded-xl border shadow-sm overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Calculator className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Pricing Calculator</p>
                  <p className="text-xs text-muted-foreground">
                    Estimate your asking price
                  </p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="size-4 text-muted-foreground" />
              </motion.div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
            {/* Quick Price Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Zap className="size-3 text-amber-500" />
                Quick Price Range
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_PRESETS.map((preset, i) => (
                  <motion.button
                    key={preset.label}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePresetClick(preset.range)}
                    className={`rounded-xl p-2.5 text-center bg-gradient-to-br ${preset.color} text-white shadow-sm hover:shadow-md transition-shadow duration-200`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className="text-lg block">{preset.icon}</span>
                    <span className="text-[10px] font-semibold block mt-0.5">{preset.label}</span>
                    <span className="text-[9px] text-white/80 block">{preset.sub}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Base Price Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                What did you pay?
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R
                </span>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="pl-8 rounded-lg"
                />
              </div>
            </div>

            {/* Selectors Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Condition
                </Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger className="w-full rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Condition multiplier indicator */}
                <div className="flex items-center gap-1.5 px-1">
                  <div className={`size-1.5 rounded-full ${condMultiplier.value >= 1 ? "bg-emerald-500" : "bg-red-400"}`} />
                  <span className={`text-[10px] font-semibold ${condMultiplier.color} ${condMultiplier.darkColor}`}>
                    {condMultiplier.label} adjustment
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Age
                </Label>
                <Select value={age} onValueChange={setAge}>
                  <SelectTrigger className="w-full rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Has Box?
                </Label>
                <Select value={hasBox} onValueChange={setHasBox}>
                  <SelectTrigger className="w-full rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YES_NO.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Has Charger?
                </Label>
                <Select value={hasCharger} onValueChange={setHasCharger}>
                  <SelectTrigger className="w-full rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YES_NO.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results */}
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
                >
                  {/* Visual Gauge */}
                  <PriceGauge
                    value={result.suggestedPrice}
                    min={result.marketMin}
                    max={result.marketMax}
                    suggested={result.suggestedPrice}
                  />

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Suggested Asking Price
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 border-0"
                    >
                      {result.profitMargin >= 0 ? "+" : ""}
                      {result.profitMargin}% margin
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {formatPrice(result.suggestedPrice)}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      className="p-2.5 rounded-lg bg-white/60 dark:bg-white/5"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <p className="text-[10px] text-muted-foreground">Min Price</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {formatPrice(result.minPrice)}
                      </p>
                    </motion.div>
                    <motion.div
                      className="p-2.5 rounded-lg bg-white/60 dark:bg-white/5"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <p className="text-[10px] text-muted-foreground">Max Price</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {formatPrice(result.maxPrice)}
                      </p>
                    </motion.div>
                  </div>

                  {/* Condition breakdown */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/40 dark:bg-white/5">
                    <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-700">
                      {condition}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Markup: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{result.effectiveMarkup.toFixed(0)}%</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Adj: <span className={`font-semibold ${condMultiplier.color} ${condMultiplier.darkColor}`}>{condMultiplier.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Est. {result.estDays} days to sell · {result.sellLabel}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-4 rounded-xl bg-muted/50 text-muted-foreground"
                >
                  <Info className="size-4 shrink-0" />
                  <p className="text-xs">
                    Enter your purchase price above to get a pricing suggestion.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formula Info */}
            <p className="text-[10px] text-muted-foreground text-center">
              Formula: base × condition markup × condition adj − age/box/charger deductions
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Bottom accent */}
      <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-60" />
    </Card>
  );
}
