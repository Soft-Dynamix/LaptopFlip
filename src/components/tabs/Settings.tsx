"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/store";

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

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const laptops = useAppStore((s) => s.laptops);
  const setLaptops = useAppStore((s) => s.setLaptops);

  // Hydration safety for theme
  useState(() => {
    setMounted(true);
  });

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
              v1.1.0-debug
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
              {laptops.length} laptops
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Palette className="size-4 text-violet-500" />
          Appearance
        </h2>
        <Card className="rounded-xl border shadow-sm">
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
        <Card className="rounded-xl border shadow-sm">
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
        <Card className="rounded-xl border shadow-sm">
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
                value="1.1.0-debug"
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
