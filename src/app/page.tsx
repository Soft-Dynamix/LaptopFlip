"use client";

import { useCallback } from "react";
// Initialize Capacitor runtime so window.Capacitor is available for native detection
import "@capacitor/core";
import {
  LayoutDashboard,
  Camera,
  Plus,
  Package,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Dashboard } from "@/components/tabs/Dashboard";
import { PhotoGuide } from "@/components/tabs/PhotoGuide";
import { Inventory } from "@/components/tabs/Inventory";
import { LaptopFormSheet } from "@/components/laptop/LaptopFormSheet";
import { AdCreatorSheet } from "@/components/ad/AdCreatorSheet";
import { AdPreviewSheet } from "@/components/ad/AdPreviewSheet";
import { LaptopDetailSheet } from "@/components/laptop/LaptopDetailSheet";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "add", label: "", icon: Plus },
  { id: "inventory", label: "Stock", icon: Package },
  { id: "theme", label: "", icon: Sun },
] as const;

export default function Home() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setIsFormOpen = useAppStore((s) => s.setIsFormOpen);
  const setEditingLaptopId = useAppStore((s) => s.setEditingLaptopId);
  const { theme, setTheme } = useTheme();

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (tabId === "add") {
        setEditingLaptopId(null);
        setIsFormOpen(true);
        return;
      }
      if (tabId === "theme") {
        setTheme(theme === "dark" ? "light" : "dark");
        return;
      }
      setActiveTab(tabId);
    },
    [setActiveTab, setIsFormOpen, setEditingLaptopId, theme, setTheme]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Main Content Area */}
      <main className="flex-1 pb-20 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "photos" && <PhotoGuide />}
            {activeTab === "inventory" && <Inventory />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const isAdd = tab.id === "add";
            const isTheme = tab.id === "theme";
            const Icon =
              isTheme && theme === "dark" ? Moon : tab.icon;

            if (isAdd) {
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="relative -mt-6"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-all duration-200">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 min-w-[3.5rem]",
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                {tab.label && (
                  <span className="text-[10px] font-medium leading-tight">
                    {tab.label}
                  </span>
                )}
                {/* Active indicator: small pill below the label */}
                {isActive && !isTheme && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* Safe area padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Sheets */}
      <LaptopDetailSheet />
      <LaptopFormSheet />
      <AdCreatorSheet />
      <AdPreviewSheet />
    </div>
  );
}
