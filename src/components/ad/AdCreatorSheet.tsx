"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Copy,
  Eye,
  Share2,
  RefreshCw,
  Loader2,
  Facebook,
  MessageCircle,
  Tag,
  ShoppingBag,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import type { Laptop, AdPreview, Platform } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const platformIcons: Record<Platform, React.ElementType> = {
  facebook: Facebook,
  whatsapp: MessageCircle,
  gumtree: Tag,
  olx: ShoppingBag,
};

function getPlatformColor(platform: Platform): string {
  const p = PLATFORMS.find((pl) => pl.id === platform);
  return p?.color || "#6b7280";
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1.5" />
            <Skeleton className="h-4 w-2/3 mb-3" />
            <Skeleton className="h-3 w-16" />
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function AdCard({
  ad,
  onPreview,
  onCopy,
}: {
  ad: AdPreview;
  onPreview: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const Icon = platformIcons[ad.platform];
  const color = getPlatformColor(ad.platform);
  const platformInfo = PLATFORMS.find((p) => p.id === ad.platform);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Card className="overflow-hidden">
        {/* Platform color accent bar */}
        <div
          className="h-1 w-full"
          style={{ backgroundColor: color }}
        />
        <CardContent className="p-4 space-y-3">
          {/* Platform header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="size-8 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: color }}
              >
                <Icon className="size-4" />
              </div>
              <span className="text-sm font-semibold">
                {platformInfo?.name || ad.platform}
              </span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {ad.title.length > 30 ? ad.title.slice(0, 30) + "..." : ad.title}
            </Badge>
          </div>

          {/* Ad title */}
          <h4 className="font-semibold text-sm leading-tight">{ad.title}</h4>

          {/* Ad body preview */}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {ad.body}
          </p>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-600">
              R {ad.price.toLocaleString()}
            </span>
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={onPreview}
            >
              <Eye className="size-3.5" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy Text
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: ad.title,
                    text: `${ad.title}\n\n${ad.body}`,
                  });
                } else {
                  handleCopy();
                  toast.success("Text copied - paste it in your sharing app");
                }
              }}
            >
              <Share2 className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AdCreatorSheet() {
  const isAdCreatorOpen = useAppStore((s) => s.isAdCreatorOpen);
  const setIsAdCreatorOpen = useAppStore((s) => s.setIsAdCreatorOpen);
  const adCreatorLaptopId = useAppStore((s) => s.adCreatorLaptopId);
  const laptops = useAppStore((s) => s.laptops);
  const selectedPlatforms = useAppStore((s) => s.selectedPlatforms);
  const setSelectedPlatforms = useAppStore((s) => s.setSelectedPlatforms);
  const adPreviews = useAppStore((s) => s.adPreviews);
  const setAdPreviews = useAppStore((s) => s.setAdPreviews);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const setIsGenerating = useAppStore((s) => s.setIsGenerating);
  const setIsPreviewOpen = useAppStore((s) => s.setIsPreviewOpen);
  const setPreviewAd = useAppStore((s) => s.setPreviewAd);
  const setPreviewPlatform = useAppStore((s) => s.setPreviewPlatform);

  const [laptop, setLaptop] = useState<Laptop | null>(null);

  // Find the laptop from store
  useEffect(() => {
    if (adCreatorLaptopId && isAdCreatorOpen) {
      const found = laptops.find((l) => l.id === adCreatorLaptopId);
      if (found) {
        setLaptop(found);
      } else {
        // Fetch from API if not in store
        fetch(`/api/laptops/${adCreatorLaptopId}`)
          .then((res) => res.json())
          .then((data) => setLaptop(data))
          .catch(() => {
            toast.error("Failed to load laptop data");
          });
      }
    } else {
      setLaptop(null);
    }
  }, [adCreatorLaptopId, isAdCreatorOpen, laptops]);

  const togglePlatform = (platform: Platform) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleGenerate = async () => {
    if (!adCreatorLaptopId || selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          laptopId: adCreatorLaptopId,
          platforms: selectedPlatforms,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate ads");

      const data = await res.json();
      setAdPreviews(data.ads || data);
      toast.success("Ads generated successfully!");
    } catch {
      toast.error("Failed to generate ads. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = async (ad: AdPreview) => {
    const fullText = `${ad.title}\n\n${ad.body}\n\nPrice: R ${ad.price.toLocaleString()}`;
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Ad text copied to clipboard");
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const handlePreview = (ad: AdPreview) => {
    setPreviewAd(ad);
    setPreviewPlatform(ad.platform);
    setIsPreviewOpen(true);
  };

  const handleRegenerate = () => {
    setAdPreviews([]);
    handleGenerate();
  };

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      setIsAdCreatorOpen(false);
    }
  };

  return (
    <Sheet open={isAdCreatorOpen} onOpenChange={handleSheetClose}>
      <SheetContent side="bottom" className="max-h-[92vh] rounded-t-2xl overflow-hidden">
        <SheetHeader className="pb-2 border-b border-border/50">
          <SheetTitle className="text-lg flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-600" />
            AI Ad Creator
          </SheetTitle>
          <SheetDescription>
            Generate optimized ads for multiple platforms
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 pb-4 space-y-5 pt-4">
          {/* Laptop info summary */}
          {laptop && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <span className="text-lg">💻</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">
                      {laptop.brand} {laptop.model}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {laptop.cpu && <>{laptop.cpu} · </>}
                      {laptop.ram && <>{laptop.ram} · </>}
                      {laptop.storage && <>{laptop.storage}</>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Condition: {laptop.condition}
                      {laptop.screenSize && <> · {laptop.screenSize}&quot;</>}
                    </p>
                    <Badge className="mt-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-0">
                      R {laptop.askingPrice?.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Platform selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Select Platforms
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((platform) => {
                const Icon = platformIcons[platform.id];
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <motion.button
                    key={platform.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => togglePlatform(platform.id)}
                    className={`relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePlatform(platform.id)}
                      className="pointer-events-none"
                    />
                    <div
                      className="size-7 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: platform.color }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <span className="text-sm font-medium">{platform.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          {!isGenerating && adPreviews.length === 0 && (
            <Button
              onClick={handleGenerate}
              disabled={selectedPlatforms.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-xl font-semibold"
            >
              <Sparkles className="size-4" />
              Generate Ads
            </Button>
          )}

          {/* Loading state */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="size-4 text-emerald-600" />
                  </motion.div>
                  Generating ads with AI...
                </div>
                <LoadingSkeleton />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated ads */}
          {!isGenerating && adPreviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Generated Ads ({adPreviews.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-600"
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="size-3.5" />
                  Generate New
                </Button>
              </div>

              <div className="space-y-3">
                {adPreviews.map((ad, index) => (
                  <AdCard
                    key={`${ad.platform}-${index}`}
                    ad={ad}
                    onPreview={() => handlePreview(ad)}
                    onCopy={() => handleCopyText(ad)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
