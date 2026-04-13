"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ChevronDown, Info, TrendingUp } from "lucide-react";
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

export function PricingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [condition, setCondition] = useState<string>("Good");
  const [age, setAge] = useState<string>("1yr");
  const [hasBox, setHasBox] = useState<string>("Yes");
  const [hasCharger, setHasCharger] = useState<string>("Yes");
  const [basePrice, setBasePrice] = useState<string>("");

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
      estDays,
      sellLabel,
      profitMargin,
      effectiveMarkup: effectiveMarkup * 100,
    };
  }, [basePrice, condition, age, hasBox, hasCharger]);

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
                  className="space-y-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
                >
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
                    <div className="p-2.5 rounded-lg bg-white/60 dark:bg-white/5">
                      <p className="text-[10px] text-muted-foreground">Min Price</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {formatPrice(result.minPrice)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/60 dark:bg-white/5">
                      <p className="text-[10px] text-muted-foreground">Max Price</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {formatPrice(result.maxPrice)}
                      </p>
                    </div>
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
              Formula: base × condition markup − age/box/charger deductions
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Bottom accent */}
      <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-60" />
    </Card>
  );
}
