"use client";

import { useCallback } from "react";
// Initialize Capacitor runtime so window.Capacitor is available for native detection
import "@capacitor/core";
import {
  LayoutDashboard,
  Camera,
  Plus,
  Package,
  Settings as SettingsIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Dashboard } from "@/components/tabs/Dashboard";
import { PhotoGuide } from "@/components/tabs/PhotoGuide";
import { Inventory } from "@/components/tabs/Inventory";
import { Settings } from "@/components/tabs/Settings";
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
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;

export default function Home() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setIsFormOpen = useAppStore((s) => s.setIsFormOpen);
  const setEditingLaptopId = useAppStore((s) => s.setEditingLaptopId);

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (tabId === "add") {
        setEditingLaptopId(null);
        setIsFormOpen(true);
        return;
      }
      setActiveTab(tabId);
    },
    [setActiveTab, setIsFormOpen, setEditingLaptopId]
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
            {activeTab === "settings" && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation — Frosted glass effect */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        {/* Gradient top border */}
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60" />

        <div className="bg-background/90 backdrop-blur-2xl">
          <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              const isAdd = tab.id === "add";
              const Icon = tab.icon;

              if (isAdd) {
                return (
                  <motion.button
                    key={tab.id}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.1 }}
                    onClick={() => handleTabClick(tab.id)}
                    className="relative -mt-7"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 flex items-center justify-center shadow-xl shadow-emerald-600/40 transition-all duration-200">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </motion.button>
                );
              }

              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.1 }}
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
                  {isActive && (
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
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background/90" />
      </nav>

      {/* Sheets */}
      <LaptopDetailSheet />
      <LaptopFormSheet />
      <AdCreatorSheet />
      <AdPreviewSheet />
    </div>
  );
}
