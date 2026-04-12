"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import type { AppNotification, Laptop } from "@/lib/types";

function getNotificationIcon(type: AppNotification["type"]) {
  switch (type) {
    case "stale_listing":
      return <Clock className="size-4 text-amber-500" />;
    case "price_suggestion":
      return <TrendingDown className="size-4 text-rose-500" />;
    case "welcome_back":
      return <Sparkles className="size-4 text-emerald-500" />;
    case "tip":
      return <AlertTriangle className="size-4 text-sky-500" />;
    default:
      return <Bell className="size-4 text-muted-foreground" />;
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function computeNotifications(laptops: Laptop[]): AppNotification[] {
  const notifications: AppNotification[] = [];
  let counter = 0;

  // Welcome back notification
  notifications.push({
    id: `notif-welcome-${counter++}`,
    type: "welcome_back",
    title: "Welcome back! 👋",
    message: "Here's a quick summary of your laptop inventory.",
    timestamp: new Date().toISOString(),
    dismissed: false,
  });

  // Stale listing notifications (listed > 7 days, draft or active)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  laptops.forEach((laptop) => {
    if (
      (laptop.status === "draft" || laptop.status === "active") &&
      new Date(laptop.createdAt).getTime() < sevenDaysAgo
    ) {
      notifications.push({
        id: `notif-stale-${counter++}`,
        type: "stale_listing",
        title: "Stale listing",
        message: `${laptop.brand} ${laptop.model} has been listed for over 7 days without selling. Consider updating the price.`,
        laptopId: laptop.id,
        timestamp: laptop.createdAt,
        dismissed: false,
      });
    }
  });

  // Price suggestion notifications (asking price < purchase price)
  laptops.forEach((laptop) => {
    if (
      laptop.purchasePrice > 0 &&
      laptop.askingPrice < laptop.purchasePrice &&
      laptop.status !== "sold" &&
      laptop.status !== "archived"
    ) {
      notifications.push({
        id: `notif-price-${counter++}`,
        type: "price_suggestion",
        title: "Priced below cost",
        message: `${laptop.brand} ${laptop.model} is listed below your purchase price. You're taking a loss.`,
        laptopId: laptop.id,
        timestamp: new Date().toISOString(),
        dismissed: false,
      });
    }
  });

  return notifications;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const laptops = useAppStore((s) => s.laptops);
  const notifications = useAppStore((s) => s.notifications);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const dismissNotification = useAppStore((s) => s.dismissNotification);
  const clearNotifications = useAppStore((s) => s.clearNotifications);

  const activeCount = notifications.filter((n) => !n.dismissed).length;

  // Compute notifications when laptops change
  useEffect(() => {
    const computed = computeNotifications(laptops);
    // Preserve dismissed state for existing notifications
    const dismissedIds = new Set(
      notifications.filter((n) => n.dismissed).map((n) => n.id)
    );
    const merged = computed.map((n) =>
      dismissedIds.has(n.id) ? { ...n, dismissed: true } : n
    );
    setNotifications(merged);
    // Only recompute when laptops change
  }, [laptops.length, setNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-white hover:bg-white/20 hover:text-white"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {activeCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-emerald-600"
          >
            {activeCount > 9 ? "9+" : activeCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold">Notifications</span>
                {activeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-0"
                  >
                    {activeCount}
                  </Badge>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Notifications list */}
            <ScrollArea className="max-h-64">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="size-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No notifications
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.map((notif, idx) => (
                    <div key={notif.id}>
                      {idx > 0 && <Separator className="opacity-50" />}
                      <div
                        className={`flex items-start gap-3 p-3 transition-colors hover:bg-muted/30 ${
                          notif.dismissed ? "opacity-40" : ""
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatTimeAgo(notif.timestamp)}
                          </p>
                        </div>
                        {!notif.dismissed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notif.id);
                            }}
                            className="shrink-0 mt-0.5 p-1 rounded-md hover:bg-muted transition-colors"
                          >
                            <X className="size-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
