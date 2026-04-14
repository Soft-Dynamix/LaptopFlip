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
  FileEdit,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    case "draft_reminder":
      return <FileEdit className="size-4 text-violet-500" />;
    default:
      return <Bell className="size-4 text-muted-foreground" />;
  }
}

function getNotificationIconBg(type: AppNotification["type"]): string {
  switch (type) {
    case "stale_listing":
      return "bg-amber-100 dark:bg-amber-900/40";
    case "price_suggestion":
      return "bg-rose-100 dark:bg-rose-900/40";
    case "welcome_back":
      return "bg-emerald-100 dark:bg-emerald-900/40";
    case "tip":
      return "bg-sky-100 dark:bg-sky-900/40";
    case "draft_reminder":
      return "bg-violet-100 dark:bg-violet-900/40";
    default:
      return "bg-muted";
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
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
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);
  const laptops = useAppStore((s) => s.laptops);
  const notifications = useAppStore((s) => s.notifications);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const dismissNotification = useAppStore((s) => s.dismissNotification);
  const clearNotifications = useAppStore((s) => s.clearNotifications);

  const activeCount = notifications.filter((n) => !n.dismissed).length;

  // Visible notifications: show only non-dismissed ones (dismissed ones animate out and then disappear)
  const visibleNotifications = notifications
    .filter((n) => !n.dismissed)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

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

  const handleDismiss = (id: string) => {
    // Start exit animation
    setDismissingIds((prev) => new Set(prev).add(id));
    // Actually dismiss after animation completes
    setTimeout(() => {
      dismissNotification(id);
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 250);
  };

  const handleClearAll = () => {
    // Add all to dismissing set for exit animation
    const allVisibleIds = new Set(visibleNotifications.map((n) => n.id));
    setDismissingIds(allVisibleIds);
    setTimeout(() => {
      clearNotifications();
      setDismissingIds(new Set());
    }, 250);
  };

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
          <span className="absolute -top-1 -right-1">
            {/* Pulse ring animation */}
            <motion.span
              className="absolute inset-0 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Badge */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative size-5 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-emerald-600"
            >
              {activeCount > 9 ? "9+" : activeCount}
            </motion.span>
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b bg-muted/30">
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
              {activeCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {visibleNotifications.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-3"
                    >
                      <CheckCircle2 className="size-6 text-emerald-500" />
                    </motion.div>
                    <p className="text-sm font-medium text-foreground">
                      You&apos;re all caught up!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No new notifications right now
                    </p>
                  </motion.div>
                ) : (
                  visibleNotifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{
                        opacity: dismissingIds.has(notif.id) ? 0 : 1,
                        x: dismissingIds.has(notif.id) ? 24 : 0,
                        scale: dismissingIds.has(notif.id) ? 0.95 : 1,
                      }}
                      exit={{ opacity: 0, x: 24, scale: 0.95, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 border-b last:border-b-0"
                    >
                      <div className={`mt-0.5 shrink-0 size-7 rounded-lg ${getNotificationIconBg(notif.type)} flex items-center justify-center`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold leading-snug">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatTimeAgo(notif.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(notif.id);
                        }}
                        className="shrink-0 mt-0.5 p-1 rounded-md hover:bg-muted transition-colors"
                        aria-label="Dismiss notification"
                      >
                        <X className="size-3 text-muted-foreground" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Footer: View all link */}
            <div className="border-t bg-muted/20">
              <button
                onClick={() => {
                  toast.info("Full notification center coming soon");
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-muted/50 transition-colors"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
