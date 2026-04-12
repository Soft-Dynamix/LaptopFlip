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
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [clearingData, setClearingData] = useState(false);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % APP_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

        // Validate structure - should be an array
        if (!Array.isArray(parsed)) {
          toast.error("Invalid backup file: expected a JSON array");
          return;
        }

        // Validate each item has basic laptop fields
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

        // Merge: new items by ID, or replace entire set
        const existing = laptops;
        const existingIds = new Set(existing.map((l) => l.id));
        const newItems = parsed.filter(
          (item: { id: string }) => !existingIds.has(item.id)
        );

        if (laptops.length === 0) {
          // No existing data, just import
          setLaptops(parsed);
          localStorage.setItem("laptopflip_laptops", JSON.stringify(parsed));
          toast.success(`Imported ${parsed.length} laptops successfully`);
        } else {
          // Merge: add new items to existing
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
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const totalStorage = typeof window !== "undefined"
    ? new Blob(Object.values(localStorage)).size
    : 0;

  const themeOptions = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
      desc: "Bright and clean",
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
      desc: "Easy on the eyes",
    },
    {
      value: "system",
      label: "System",
      icon: MonitorSmartphone,
      desc: "Follow your device",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 p-4 pb-8"
    >
      {/* Header */}
      <motion.div variants={item}>
        <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Zap className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-sm text-slate-300 mt-0.5">Customize your experience</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge className="bg-white/15 text-white border-0 text-[10px]">
              v1.3.0
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
              {laptops.length} laptops
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* App Tips */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-500" />
          App Tips
        </h2>
        <Card className="rounded-xl border shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="relative min-h-[60px] flex items-center gap-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTipIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 w-full"
                >
                  <span className="text-2xl shrink-0">
                    {APP_TIPS[currentTipIndex].icon}
                  </span>
                  <p className="text-sm leading-relaxed">
                    {APP_TIPS[currentTipIndex].tip}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            {/* Tip indicators */}
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
          <div className="h-0.5 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 dark:from-amber-600 dark:via-amber-500 dark:to-amber-600 opacity-50" />
        </Card>
      </motion.div>

      {/* Marketplace Settings */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Globe className="size-4 text-emerald-500" />
          Marketplace
        </h2>
        <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-0">
            {/* Currency Selector */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Default Currency</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Used for price display across the app
                  </p>
                </div>
                <Select
                  value={appSettings.currency}
                  onValueChange={(val) => setAppSettings({ currency: val })}
                >
                  <SelectTrigger className="w-auto rounded-lg text-sm min-w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Region Selector */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Marketplace Region</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Affects ad generation suggestions
                  </p>
                </div>
                <Select
                  value={appSettings.region}
                  onValueChange={(val) => setAppSettings({ region: val })}
                >
                  <SelectTrigger className="w-auto rounded-lg text-sm min-w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGION_OPTIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* WhatsApp Number */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">WhatsApp Number</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Shown in generated ads
                  </p>
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

            {/* Default Location */}
            <div className="px-4 py-3 rounded-b-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Default Location</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pre-filled when adding laptops
                  </p>
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
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <Icon
                      className={`size-5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`text-xs font-medium ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Management */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Database className="size-4 text-amber-500" />
          Data Management
        </h2>
        <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-0">
            {/* Storage info */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <HardDrive className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Local Storage</p>
                  <p className="text-xs text-muted-foreground">
                    {(totalStorage / 1024).toFixed(1)} KB used
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {laptops.length} items
              </Badge>
            </div>

            <Separator />

            {/* Export button */}
            <button
              onClick={handleExportData}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
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

            {/* Import button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
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

            {/* Clear data */}
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
                    This will permanently delete all {laptops.length} laptops stored on
                    this device. This action cannot be undone. Server data (if any) will
                    not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearData}
                    disabled={clearingData}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {clearingData ? "Clearing..." : "Yes, clear everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Info className="size-4 text-sky-500" />
          About
        </h2>
        <Card className="rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-2xl">
                💻
              </div>
              <div>
                <h3 className="font-bold">LaptopFlip</h3>
                <p className="text-xs text-muted-foreground">
                  Sell Laptops Faster with AI
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <SettingRow
                icon={Zap}
                iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                iconColor="text-emerald-600 dark:text-emerald-400"
                label="Version"
                value="1.3.0"
              />
              <SettingRow
                icon={Shield}
                iconBg="bg-blue-100 dark:bg-blue-900/40"
                iconColor="text-blue-600 dark:text-blue-400"
                label="AI Engine"
                value="3-Tier (Server + On-Device + Templates)"
              />
              <SettingRow
                icon={Database}
                iconBg="bg-amber-100 dark:bg-amber-900/40"
                iconColor="text-amber-600 dark:text-amber-400"
                label="Storage"
                value="SQLite + localStorage"
              />
              <SettingRow
                icon={Globe}
                iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                iconColor="text-emerald-600 dark:text-emerald-400"
                label="Currency"
                value={CURRENCY_OPTIONS.find((c) => c.code === appSettings.currency)?.label ?? "ZAR (R)"}
              />
              <SettingRow
                icon={Globe}
                iconBg="bg-teal-100 dark:bg-teal-900/40"
                iconColor="text-teal-600 dark:text-teal-400"
                label="Region"
                value={REGION_OPTIONS.find((r) => r.id === appSettings.region)?.label ?? "South Africa"}
              />
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <a
                href="https://github.com/Soft-Dynamix/LaptopFlip"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl text-xs"
                >
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
        <p className="text-xs text-muted-foreground">
          Made with ❤️ in South Africa
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          © 2025 Soft-Dynamix
        </p>
      </motion.div>
    </motion.div>
  );
}

function SettingRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`size-8 rounded-lg ${iconBg} flex items-center justify-center`}>
        <Icon className={`size-3.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
