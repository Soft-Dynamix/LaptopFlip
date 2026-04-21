"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Share2,
  Copy,
  Download,
  MessageCircle,
  Check,
  X,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { formatPrice, getAppCurrency } from "@/lib/types";
import type { Laptop } from "@/lib/types";

function getConditionColor(condition: string) {
  switch (condition) {
    case "Mint":
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "Excellent":
      return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "Good":
      return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "Fair":
      return "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    case "Poor":
      return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  }
}

function parsePhotos(photos: string | string[]): string[] {
  if (Array.isArray(photos)) return photos;
  if (!photos) return [];
  try {
    const parsed = JSON.parse(photos);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

function getBrandIcon(brand: string): string {
  const lower = brand.toLowerCase();
  if (lower.includes("apple") || lower.includes("mac")) return "🍎";
  if (lower.includes("dell")) return "💻";
  if (lower.includes("hp")) return "🖥️";
  if (lower.includes("lenovo")) return "📋";
  if (lower.includes("asus")) return "🎮";
  if (lower.includes("acer")) return "💠";
  if (lower.includes("msi")) return "🐉";
  if (lower.includes("samsung")) return "📱";
  if (lower.includes("razer")) return "🐍";
  if (lower.includes("microsoft")) return "🪟";
  return "💻";
}

export function ShareCardSheet() {
  const selectedLaptop = useAppStore((s) => s.selectedLaptop);
  const setIsDetailOpen = useAppStore((s) => s.setIsDetailOpen);
  const setSelectedLaptop = useAppStore((s) => s.setSelectedLaptop);
  const isShareCardOpen = useAppStore((s) => s.isShareCardOpen);
  const setIsShareCardOpen = useAppStore((s) => s.setIsShareCardOpen);

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const laptop = selectedLaptop;
  const photos = laptop ? parsePhotos(laptop.photos) : [];
  const thumbnail = photos[0] || null;

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsShareCardOpen(false);
      }
    },
    [setIsShareCardOpen]
  );

  const shareText = laptop
    ? `*${laptop.brand} ${laptop.model}*\n${laptop.cpu ? laptop.cpu + " · " : ""}${laptop.ram} · ${laptop.storage}\nCondition: ${laptop.condition}\nPrice: ${formatPrice(laptop.askingPrice)}\n\nReply if interested!`
    : "";

  const handleShareWhatsApp = useCallback(() => {
    if (!laptop) return;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }, [laptop, shareText]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!laptop) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [laptop, shareText]);

  const handleSaveAsImage = useCallback(async () => {
    if (!cardRef.current || !laptop) return;
    setSaving(true);
    try {
      // Dynamic import of html2canvas to avoid SSR issues
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = `${laptop.brand}-${laptop.model}-share-card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Image saved!");
    } catch {
      toast.error("Failed to save image. Try taking a screenshot instead.");
    } finally {
      setSaving(false);
    }
  }, [laptop]);

  if (!laptop) return null;

  return (
    <Sheet open={isShareCardOpen} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-2xl overflow-hidden flex flex-col"
      >
        <SheetHeader className="pb-2 border-b border-border/50 shrink-0">
          <SheetTitle className="text-lg flex items-center gap-2">
            <Share2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            Share Card
          </SheetTitle>
          <SheetDescription>
            Generate a beautiful shareable card for your listing
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 pb-4 space-y-4 pt-4">
          {/* Shareable Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              ref={cardRef}
              className="rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-xl relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-white/5" />
              <div className="absolute top-1/2 right-4 size-16 rounded-full bg-white/5" />

              <div className="relative space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                  {/* Thumbnail or brand icon */}
                  <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden border border-white/20">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={`${laptop.brand} ${laptop.model}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">{getBrandIcon(laptop.brand)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold leading-tight">
                      {laptop.brand} {laptop.model}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-white/20 rounded-full px-2.5 py-0.5">
                        {laptop.condition}
                      </span>
                      {laptop.stockId && (
                        <span className="text-xs font-mono text-emerald-100">
                          #{laptop.stockId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/20" />

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {laptop.cpu && (
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                      <Cpu className="size-3.5 text-emerald-200" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-emerald-200/70">Processor</p>
                        <p className="text-xs font-medium truncate">{laptop.cpu}</p>
                      </div>
                    </div>
                  )}
                  {laptop.ram && (
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                      <MemoryStick className="size-3.5 text-emerald-200" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-emerald-200/70">Memory</p>
                        <p className="text-xs font-medium truncate">{laptop.ram}</p>
                      </div>
                    </div>
                  )}
                  {laptop.storage && (
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                      <HardDrive className="size-3.5 text-emerald-200" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-emerald-200/70">Storage</p>
                        <p className="text-xs font-medium truncate">{laptop.storage}</p>
                      </div>
                    </div>
                  )}
                  {laptop.gpu && (
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                      <Monitor className="size-3.5 text-emerald-200" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-emerald-200/70">Graphics</p>
                        <p className="text-xs font-medium truncate">{laptop.gpu}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
                  <p className="text-xs text-emerald-100 font-medium mb-1">Asking Price</p>
                  <p className="text-3xl font-black tracking-tight">
                    {formatPrice(laptop.askingPrice)}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-emerald-200/60">
                  <span>LaptopFlip</span>
                  <span>{new Date().toLocaleDateString("en-ZA")}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-2"
          >
            {/* WhatsApp */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleShareWhatsApp}
                className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold gap-2 text-sm"
              >
                <MessageCircle className="size-5" />
                Share to WhatsApp
              </Button>
            </motion.div>

            {/* Copy & Save row */}
            <div className="grid grid-cols-2 gap-2">
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleCopyToClipboard}
                  variant="outline"
                  className="w-full h-11 rounded-xl gap-2 text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="size-4 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy Text
                    </>
                  )}
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleSaveAsImage}
                  variant="outline"
                  disabled={saving}
                  className="w-full h-11 rounded-xl gap-2 text-sm"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <div className="size-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                      </motion.div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      Save Image
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Share text preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Share text preview</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="h-6 text-[10px] gap-1 px-2"
                >
                  <Copy className="size-3" />
                  Copy
                </Button>
              </div>
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                {shareText}
              </pre>
            </div>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
