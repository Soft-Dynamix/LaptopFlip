"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Palette,
  Database,
  Trash2,
  HardDrive,
  Info,
  Shield,
  Zap,
  ChevronRight,
  ExternalLink,
  MonitorSmartphone,
  Globe,
  Upload,
  Lightbulb,
  Facebook,
  Sparkles,
  Rocket,
  Keyboard,
  Timer,
  ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/store";
import { CURRENCY_OPTIONS, REGION_OPTIONS } from "@/lib/types";
import { FacebookIntegration } from "@/components/facebook/FacebookIntegration";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const APP_TIPS = [
  { icon: "📸", tip: "Take photos near a window for best lighting" },
  { icon: "💰", tip: "Price competitively — check similar listings first" },
  { icon: "⚡", tip: "Respond to buyers within 30 minutes for best results" },
  { icon: "✨", tip: "Mint condition laptops sell 40% faster" },
  { icon: "📦", tip: "Include the box and charger to increase value" },
];

const PRODUCTIVITY_TIPS = [
  { icon: "🎯", title: "Batch your photos", desc: "Take all photos in one session to save time. Use the guided photo walk-through." },
  { icon: "🏷️", title: "Price with margins", desc: "Always set both purchase and asking price to track profit in real-time." },
  { icon: "📱", title: "Use WhatsApp share", desc: "One-tap share sends a formatted listing directly to buyers." },
];

const KEYBOARD_SHORTCUTS = [
  { key: "Ctrl + N", action: "Add new laptop" },
  { key: "Ctrl + E", action: "Export CSV" },
  { key: "Ctrl + F", action: "Focus search" },
  { key: "Ctrl + R", action: "Refresh data" },
  { key: "Esc", action: "Close sheet/dialog" },
];

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [storagePercent, setStoragePercent] = useState(0);
  const laptops = useAppStore((s) => s.laptops);
  const setLaptops = useAppStore((s) => s.setLaptops);
  const appSettings = useAppStore((s) => s.appSettings);
  const setAppSettings = useAppStore((s) => s.setAppSettings);
  const setContacts = useAppStore((s) => s.setContacts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydration safety for theme
  useState(() => {
    setMounted(true);
  });

  // Rotating tips
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [currentProductivityTip, setCurrentProductivityTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % APP_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProductivityTip((prev) => (prev + 1) % PRODUCTIVITY_TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Quick Setup Wizard state
  const setupDone = typeof window !== "undefined" ? localStorage.getItem("laptopflip_setup_done") : null;
  const [setupComplete, setSetupComplete] = useState(!!setupDone);
  const [wizardStep, setWizardStep] = useState(0);

  const handleClearData = async () => {
    setClearingData(true);
    try {
      localStorage.removeItem("laptopflip_laptops");
      setLaptops([]);
      toast.success("All local data cleared successfully");
    } catch {
      toast.error("Failed to clear data");
    }
    setClearingData(false);
  };

  const handleExportData = () => {
    try {
      const data = localStorage.getItem("laptopflip_laptops");
      if (!data) {
        toast.error("No data to export");
        return;
      }
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laptopflip-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    }
  };

  // Load contacts from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("laptopflip_contacts");
      if (raw) setContacts(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [setContacts]);

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          toast.error("Invalid backup file: expected a JSON array");
          return;
        }

        const isValid = parsed.every(
          (item: Record<string, unknown>) =>
            typeof item.id === "string" &&
            typeof item.brand === "string" &&
            typeof item.model === "string"
        );

        if (!isValid) {
          toast.error("Invalid backup file: some items are missing required fields");
          return;
        }

        const existing = laptops;
        const existingIds = new Set(existing.map((l) => l.id));
        const newItems = parsed.filter(
          (item: { id: string }) => !existingIds.has(item.id)
        );

        if (laptops.length === 0) {
          setLaptops(parsed);
          localStorage.setItem("laptopflip_laptops", JSON.stringify(parsed));
          toast.success(`Imported ${parsed.length} laptops successfully`);
        } else {
          const merged = [...existing, ...newItems];
          setLaptops(merged);
          localStorage.setItem("laptopflip_laptops", JSON.stringify(merged));
          toast.success(
            `Merged ${newItems.length} new laptops. ${existing.length} existing laptops preserved.`
          );
        }
      } catch {
        toast.error("Failed to parse backup file. Make sure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const totalStorage = typeof window !== "undefined"
    ? new Blob(Object.values(localStorage)).size
    : 0;
  const maxStorage = 5 * 1024 * 1024;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pct = Math.min((totalStorage / maxStorage) * 100, 100);
      const timer = setTimeout(() => setStoragePercent(pct), 300);
      return () => clearTimeout(timer);
    }
  }, [totalStorage]);

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun, desc: "Bright and clean" },
    { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
    { value: "system", label: "System", icon: MonitorSmartphone, desc: "Follow your device" },
  ];

  const handleSetupComplete = () => {
    setSetupComplete(true);
    localStorage.setItem("laptopflip_setup_done", "true");
    toast.success("Quick setup complete! 🎉");
  };

  // Estimate photo storage
  const totalPhotos = laptops.reduce((sum, l) => {
    const photoList = Array.isArray(l.photos) ? l.photos : [];
    return sum + photoList.length;
  }, 0);
  const estimatedPhotoStorage = totalPhotos * 1.5; // ~1.5MB per photo average

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 p-4 pb-8"
    >
      {/* Header */}
      <motion.div variants={item}>
        <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 size-16 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Zap className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-sm text-slate-300 mt-0.5">Customize your experience</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
            >
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-[10px] font-bold px-2 py-0.5 shadow-sm">
                v1.6.1
              </Badge>
            </motion.div>
            <Badge className="bg-white/15 text-white border-0 text-[10px]">
              {laptops.length} laptops
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Quick Setup Wizard */}
      {!setupComplete && (
        <motion.div variants={item} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Rocket className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Quick Setup</h2>
                <p className="text-[10px] text-muted-foreground">Get started in 3 steps</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {/* Step 1: Currency */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${wizardStep >= 0 ? "bg-white dark:bg-gray-800/50 border-emerald-200 dark:border-emerald-800" : "bg-muted/30 border-transparent"}`}
              >
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${wizardStep >= 0 ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Default Currency</p>
                </div>
                <Select
                  value={appSettings.currency}
                  onValueChange={(val) => { setAppSettings({ currency: val }); if (wizardStep === 0) setWizardStep(1); }}
                >
                  <SelectTrigger className="w-auto rounded-lg text-xs min-w-[90px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Step 2: Region */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${wizardStep >= 1 ? "bg-white dark:bg-gray-800/50 border-emerald-200 dark:border-emerald-800" : "bg-muted/30 border-transparent"}`}
              >
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${wizardStep >= 1 ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Marketplace Region</p>
                </div>
                <Select
                  value={appSettings.region}
                  onValueChange={(val) => { setAppSettings({ region: val }); if (wizardStep === 1) setWizardStep(2); }}
                >
                  <SelectTrigger className="w-auto rounded-lg text-xs min-w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGION_OPTIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Step 3: WhatsApp */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${wizardStep >= 2 ? "bg-white dark:bg-gray-800/50 border-emerald-200 dark:border-emerald-800" : "bg-muted/30 border-transparent"}`}
              >
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${wizardStep >= 2 ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">WhatsApp Number</p>
                </div>
                <Input
                  placeholder="076 748 8988"
                  className="w-auto max-w-[140px] rounded-lg text-xs h-8"
                  value={appSettings.whatsappNumber}
                  onChange={(e) => {
                    setAppSettings({ whatsappNumber: e.target.value });
                    if (wizardStep === 2) setWizardStep(3);
                  }}
                />
              </motion.div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSetupComplete}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-sm font-semibold gap-2 shadow-md"
              >
                <CheckCircle2 className="size-4" />
                Complete Setup
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Productivity Tips */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-500" />
          Productivity Tips
        </h2>
        <Card className="rounded-xl border shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="relative min-h-[70px] flex items-center gap-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentProductivityTip}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-3 w-full"
                >
                  <div className="size-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-950/20 flex items-center justify-center shrink-0 text-lg">
                    {PRODUCTIVITY_TIPS[currentProductivityTip].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{PRODUCTIVITY_TIPS[currentProductivityTip].title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{PRODUCTIVITY_TIPS[currentProductivityTip].desc}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {PRODUCTIVITY_TIPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentProductivityTip(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentProductivityTip
                      ? "w-5 bg-amber-500"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                  aria-label={`Tip ${idx + 1}`}
                />
              ))}
            </div>
          </CardContent>
          <div className="h-0.5 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 dark:from-amber-600 dark:via-amber-500 dark:to-amber-600 opacity-50" />
        </Card>
      </motion.div>

      {/* App Tips */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="size-4 text-emerald-500" />
          Quick Tips
        </h2>
        <Card className="rounded-xl border shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="relative min-h-[50px] flex items-center gap-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTipIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 w-full"
                >
                  <span className="text-2xl shrink-0">{APP_TIPS[currentTipIndex].icon}</span>
                  <p className="text-sm leading-relaxed">{APP_TIPS[currentTipIndex].tip}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {APP_TIPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTipIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentTipIndex
                      ? "w-5 bg-emerald-500"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                  aria-label={`Tip ${idx + 1}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-600 to-transparent opacity-40" />

      {/* Marketplace Settings */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Globe className="size-4 text-emerald-500" />
          Marketplace
        </h2>
        <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-0">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Default Currency</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Used for price display across the app</p>
                </div>
                <Select value={appSettings.currency} onValueChange={(val) => setAppSettings({ currency: val })}>
                  <SelectTrigger className="w-auto rounded-lg text-sm min-w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Marketplace Region</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Affects ad generation suggestions</p>
                </div>
                <Select value={appSettings.region} onValueChange={(val) => setAppSettings({ region: val })}>
                  <SelectTrigger className="w-auto rounded-lg text-sm min-w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGION_OPTIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">WhatsApp Number</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Shown in generated ads</p>
                </div>
                <Input
                  placeholder="076 748 8988"
                  className="w-auto max-w-[180px] rounded-lg text-sm"
                  value={appSettings.whatsappNumber}
                  onChange={(e) => setAppSettings({ whatsappNumber: e.target.value })}
                />
              </div>
            </div>
            <Separator />
            <div className="px-4 py-3 rounded-b-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Default Location</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled when adding laptops</p>
                </div>
                <Input
                  placeholder="e.g. Potchefstroom"
                  className="w-auto max-w-[180px] rounded-lg text-sm"
                  value={appSettings.defaultLocation}
                  onChange={(e) => setAppSettings({ defaultLocation: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-600 to-transparent opacity-40" />

      {/* Facebook Integration */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Facebook className="size-4 text-[#1877F2]" />
          Facebook Integration
          {!facebookConnected && (
            <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
              Needs Setup
            </Badge>
          )}
        </h2>
        {!facebookConnected ? (
          <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10 p-1">
            <FacebookIntegration onConnectedChange={setFacebookConnected} />
          </div>
        ) : (
          <FacebookIntegration onConnectedChange={setFacebookConnected} />
        )}
      </motion.div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-600 to-transparent opacity-40" />

      {/* Appearance */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Palette className="size-4 text-violet-500" />
          Appearance
        </h2>
        <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = mounted && theme === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTheme(opt.value)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm shadow-emerald-500/20"
                        : "border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20"
                    }`}
                  >
                    <Icon className={`size-5 transition-colors duration-200 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium transition-colors duration-200 ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
                      {opt.label}
                    </span>
                    <span className={`text-[10px] leading-tight transition-colors duration-200 ${isActive ? "text-emerald-600/70 dark:text-emerald-400/70" : "text-muted-foreground/60"}`}>
                      {opt.desc}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="themeCheck"
                        className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-emerald-500 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <svg className="size-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-600 to-transparent opacity-40" />

      {/* Data Management with Storage Usage */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Database className="size-4 text-amber-500" />
          Data Management
        </h2>
        <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 dark:from-amber-600 dark:via-orange-600 dark:to-amber-600 opacity-60" />
          <CardContent className="p-0">
            {/* Storage Usage */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <HardDrive className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Storage Usage</p>
                  <p className="text-xs text-muted-foreground">
                    {(totalStorage / 1024).toFixed(1)} KB used
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {laptops.length} items
                </Badge>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${storagePercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              {/* Photo storage estimate */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <ImageIcon className="size-3" />
                  <span>{totalPhotos} photos (~{estimatedPhotoStorage < 1024 ? `${estimatedPhotoStorage.toFixed(1)} KB` : `${(estimatedPhotoStorage / 1024).toFixed(1)} MB`} est.)</span>
                </div>
              </div>
            </div>

            <Separator />

            <button onClick={handleExportData} className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <svg className="size-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Export Data</p>
                  <p className="text-xs text-muted-foreground">Download backup as JSON</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>

            <Separator />

            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportData} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Upload className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Import Data</p>
                  <p className="text-xs text-muted-foreground">Restore from JSON backup</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>

            <Separator />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors rounded-b-xl">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                      <Trash2 className="size-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Clear All Data</p>
                      <p className="text-xs text-muted-foreground">Remove all local laptops</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all local data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {laptops.length} laptops stored on this device. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearData} disabled={clearingData} className="bg-red-600 hover:bg-red-700 text-white">
                    {clearingData ? "Clearing..." : "Yes, clear everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-600 to-transparent opacity-40" />

      {/* Keyboard Shortcuts */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Keyboard className="size-4 text-sky-500" />
          Keyboard Shortcuts
        </h2>
        <Card className="rounded-xl border shadow-sm">
          <CardContent className="p-3">
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{shortcut.action}</span>
                  <kbd className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded border border-border text-foreground">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-600 to-transparent opacity-40" />

      {/* About with animated version badge */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Info className="size-4 text-sky-500" />
          About
        </h2>
        <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-2xl"
              >
                💻
              </motion.div>
              <div>
                <h3 className="font-bold">LaptopFlip</h3>
                <p className="text-xs text-muted-foreground">Sell Laptops Faster with AI</p>
              </div>
              <div className="ml-auto">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 font-bold">
                    v1.6.1
                  </Badge>
                </motion.div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Zap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-sm font-medium">1.6.1</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Shield className="size-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">AI Engine</p>
                  <p className="text-sm font-medium">3-Tier (Server + On-Device + Templates)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Database className="size-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Storage</p>
                  <p className="text-sm font-medium">SQLite + localStorage</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Globe className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="text-sm font-medium">{CURRENCY_OPTIONS.find((c) => c.code === appSettings.currency)?.label ?? "ZAR (R)"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                  <Globe className="size-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Region</p>
                  <p className="text-sm font-medium">{REGION_OPTIONS.find((r) => r.id === appSettings.region)?.label ?? "South Africa"}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <a href="https://github.com/Soft-Dynamix/LaptopFlip" target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-xl text-xs">
                  <ExternalLink className="size-3.5 mr-1.5" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </CardContent>
          <div className="h-0.5 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300 dark:from-slate-600 dark:via-slate-500 dark:to-slate-600 opacity-40" />
        </Card>
      </motion.div>

      {/* Footer branding */}
      <motion.div variants={item} className="text-center py-4">
        <p className="text-xs text-muted-foreground">Made with ❤️ in South Africa</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2025 Soft-Dynamix</p>
      </motion.div>
    </motion.div>
  );
}
