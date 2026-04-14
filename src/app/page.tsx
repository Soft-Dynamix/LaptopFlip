"use client";

import { useCallback, useState, useEffect } from "react";
// Initialize Capacitor runtime so window.Capacitor is available for native detection
import "@capacitor/core";
import {
  LayoutDashboard,
  Camera,
  Plus,
  Package,
  SettingsIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { Dashboard } from "@/components/tabs/Dashboard";
import { PhotoGuide } from "@/components/tabs/PhotoGuide";
import { Inventory } from "@/components/tabs/Inventory";
import { Settings as SettingsPage } from "@/components/tabs/Settings";
import { LaptopFormSheet } from "@/components/laptop/LaptopFormSheet";
import { AdCreatorSheet } from "@/components/ad/AdCreatorSheet";
import { AdPreviewSheet } from "@/components/ad/AdPreviewSheet";
import { LaptopDetailSheet } from "@/components/laptop/LaptopDetailSheet";
import { CompareSheet } from "@/components/laptop/CompareSheet";
import { ContactsSheet } from "@/components/contacts/ContactsSheet";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle Facebook OAuth callback — user returns from Facebook auth to /?fb_callback=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fb_callback') === '1') {
      // Clean URL without triggering navigation
      window.history.replaceState({}, '', window.location.pathname);
      // Switch to settings tab so user can see the result
      setActiveTab('settings');
      // Try to clean up the pending flag
      try { sessionStorage.removeItem('fb_connect_pending'); } catch { /* ignore */ }
      // Exchange the short-lived token for a long-lived one via our API
      fetch('/api/facebook/auth-callback', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast.success('Facebook account connected!', {
              description: data.connection?.isLongLived
                ? 'Long-lived token saved (60 days)'
                : 'Token saved. Configure your Facebook App for longer tokens.',
              duration: 5000,
            });
          } else {
            toast.error(data.error || 'Facebook connection failed', { duration: 5000 });
          }
        })
        .catch(() => {
          toast.error('Failed to complete Facebook connection', { duration: 5000 });
        });
    }
  }, [setActiveTab]);

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
      {/* Scroll-based top status bar */}
      <AnimatePresence>
        {scrolled && (
          <motion.header
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5"
          >
            <div className="max-w-lg mx-auto flex items-center justify-between h-12 px-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">💻</span>
                <h1 className="text-sm font-bold tracking-tight text-emerald-700 dark:text-emerald-400">LaptopFlip</h1>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {tabs.find((t) => t.id === activeTab)?.label}
              </span>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={cn("flex-1 pb-20 overflow-y-auto", scrolled && "pt-12")}>
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
            {activeTab === "settings" && <SettingsPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation — Frosted glass effect */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        {/* Gradient top accent — 2px emerald line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

        {/* Subtle gradient overlay above nav for content fade */}
        <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-background/90 to-transparent pointer-events-none" />

        <div className="relative bg-background/95 backdrop-blur-2xl">
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
                  <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} />
                  {tab.label && (
                    <span className={cn(
                      "text-[10px] font-medium leading-tight transition-all duration-200",
                      isActive && "bg-emerald-100 dark:bg-emerald-900/30 rounded-full px-2"
                    )}>
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
                  {/* Active badge dot indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabDot"
                      className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"
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
        <div className="h-[env(safe-area-inset-bottom)] bg-background/95" />
      </nav>

      {/* Sheets */}
      <LaptopDetailSheet />
      <CompareSheet />
      <LaptopFormSheet />
      <AdCreatorSheet />
      <AdPreviewSheet />
      <ContactsSheet />
    </div>
  );
}
