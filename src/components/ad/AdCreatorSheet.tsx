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
  Download,
  Wifi,
  WifiOff,
  Cpu,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import { apiFetchLaptop, apiGenerateAd, isLocalMode } from "@/lib/api";
import type { Laptop, AdPreview, Platform } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";
import {
  loadModel,
  onModelProgress,
  getModelStatus,
  type ModelProgress,
} from "@/lib/on-device-llm";

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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
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
  source,
}: {
  ad: AdPreview;
  onPreview: () => void;
  onCopy: () => void;
  source: "ai" | "template";
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
            <div className="flex items-center gap-1.5">
              {source === "ai" && (
                <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0 text-[10px] px-1.5 py-0">
                  <Cpu className="size-2.5 mr-0.5" />
                  AI
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {ad.title.length > 30 ? ad.title.slice(0, 30) + "..." : ad.title}
              </Badge>
            </div>
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

function ModelDownloadCard({
  modelProgress,
  onLoadModel,
}: {
  modelProgress: ModelProgress;
  onLoadModel: () => void;
}) {
  const status = modelProgress.status;

  // Don't show if idle or ready
  if (status === "idle" || status === "ready") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
    >
      <Card className="p-4 border-2 border-dashed border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Cpu className="size-4 text-purple-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">On-Device AI Model</h4>
                <p className="text-[11px] text-muted-foreground">
                  Qwen3-0.6B · ~350MB · Runs locally
                </p>
              </div>
            </div>
            {status === "error" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                onClick={onLoadModel}
              >
                <RefreshCw className="size-3" />
                Retry
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {(status === "downloading" || status === "loading") && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {status === "downloading"
                    ? "Downloading model..."
                    : "Loading into memory..."}
                </span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {modelProgress.progress}%
                </span>
              </div>
              <Progress value={modelProgress.progress} className="h-2" />
              {modelProgress.loadedBytes && modelProgress.totalBytes && (
                <p className="text-[11px] text-muted-foreground text-center">
                  {formatBytes(modelProgress.loadedBytes)} / {formatBytes(modelProgress.totalBytes)}
                </p>
              )}
            </div>
          )}

          {/* Generating indicator */}
          {status === "generating" && (
            <div className="flex items-center gap-2 py-1">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="size-4 text-purple-600" />
              </motion.div>
              <span className="text-xs text-muted-foreground">
                Generating ad with on-device AI...
              </span>
            </div>
          )}

          {/* Error message */}
          {status === "error" && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 rounded-lg p-2.5">
              <Info className="size-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">
                {modelProgress.errorMessage || "Failed to load AI model. Ads will use smart templates."}
              </p>
            </div>
          )}
        </div>
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
  // Initialize from actual model state (handles remount when model is already loaded)
  const [modelProgress, setModelProgressState] = useState<ModelProgress>(() => getModelStatus());
  const [adSources, setAdSources] = useState<Record<string, "ai" | "template">>({});
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);

  // Subscribe to model progress
  useEffect(() => {
    const unsub = onModelProgress((progress) => {
      setModelProgressState(progress);
    });
    return unsub;
  }, []);

  // Reset ads when sheet opens/closes
  useEffect(() => {
    if (isAdCreatorOpen) {
      setAdPreviews([]);
      setAdSources({});
    }
  }, [isAdCreatorOpen, setAdPreviews]);

  // Find the laptop from store
  useEffect(() => {
    if (adCreatorLaptopId && isAdCreatorOpen) {
      const found = laptops.find((l) => l.id === adCreatorLaptopId);
      if (found) {
        setLaptop(found);
      } else {
        apiFetchLaptop(adCreatorLaptopId)
          .then((data) => {
            if (data) setLaptop(data);
            else toast.error("Failed to load laptop data");
          })
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
    setAdSources({});

    try {
      const data = await apiGenerateAd(adCreatorLaptopId, selectedPlatforms);
      setAdPreviews(data);

      // Determine ad sources based on model status
      const sources: Record<string, "ai" | "template"> = {};
      const status = getModelStatus().status;
      const useLocal = isLocalMode();

      if (useLocal && status === "ready") {
        // On-device LLM generated these
        data.forEach((ad) => { sources[ad.platform] = "ai"; });
      } else if (useLocal) {
        // Template-based
        data.forEach((ad) => { sources[ad.platform] = "template"; });
      }
      // Server AI ads — don't tag them specifically
      setAdSources(sources);

      toast.success("Ads generated successfully!");
    } catch {
      toast.error("Failed to generate ads. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadModel = async () => {
    setIsDownloadingModel(true);
    const success = await loadModel();
    setIsDownloadingModel(false);
    if (success) {
      toast.success("AI model loaded! Generate ads for AI-powered copy.");
    } else {
      toast.error("Failed to load model. Using templates instead.");
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
    void handleGenerate();
  };

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      setIsAdCreatorOpen(false);
    }
  };

  const isOffline = isLocalMode();
  // Derive from React state to stay in sync with UI (not module-level variable)
  const modelReady = modelProgress.status === "ready";

  return (
    <Sheet open={isAdCreatorOpen} onOpenChange={handleSheetClose}>
      <SheetContent side="bottom" className="max-h-[92vh] rounded-t-2xl overflow-hidden">
        <SheetHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-600" />
              AI Ad Creator
            </SheetTitle>
            <div className="flex items-center gap-1.5">
              {isOffline ? (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <WifiOff className="size-3" />
                  Offline
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Wifi className="size-3" />
                  Online
                </Badge>
              )}
              {modelReady && (
                <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0 text-[10px] gap-1">
                  <Cpu className="size-3" />
                  On-Device AI
                </Badge>
              )}
            </div>
          </div>
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

          {/* Gradient divider between laptop info and platform selector */}
          {laptop && !isOffline && (
            <div className="h-1 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 dark:from-emerald-600 dark:via-teal-600 dark:to-emerald-700 opacity-50" />
          )}

          {/* On-device LLM download card (only in offline mode) */}
          {isOffline && (
            <AnimatePresence>
              <ModelDownloadCard
                modelProgress={modelProgress}
                onLoadModel={handleDownloadModel}
              />
            </AnimatePresence>
          )}

          {/* Download AI model button (when offline and model not loaded) */}
          {isOffline && modelProgress.status === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                variant="outline"
                onClick={handleDownloadModel}
                disabled={isDownloadingModel}
                className="w-full h-10 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-800/50 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300"
              >
                {isDownloadingModel ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Preparing download...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Download On-Device AI Model (~350MB)
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                Runs entirely on your phone — no internet needed for AI ads
              </p>
            </motion.div>
          )}

          {/* Model ready banner */}
          {isOffline && modelReady && modelProgress.status !== "generating" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-3 border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                    <Cpu className="size-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      On-Device AI Ready
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Ads will be generated with AI — fully offline
                    </p>
                  </div>
                  <Check className="size-5 text-purple-600" />
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
                  <motion.div
                    key={platform.id}
                    role="button"
                    tabIndex={0}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => togglePlatform(platform.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePlatform(platform.id); } }}
                    className={`relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left cursor-pointer select-none ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`size-4 rounded-[4px] border-2 shrink-0 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-600"
                        : "border-muted-foreground/40"
                    }`}>
                      {isSelected && (
                        <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div
                      className="size-7 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: platform.color }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <span className="text-sm font-medium">{platform.name}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          {!isGenerating && adPreviews.length === 0 && (
            <Button
              onClick={handleGenerate}
              disabled={selectedPlatforms.length === 0 || modelProgress.status === "downloading" || modelProgress.status === "loading"}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-xl font-semibold"
            >
              <Sparkles className="size-4" />
              {isOffline && modelReady
                ? "Generate with On-Device AI"
                : isOffline
                  ? "Generate Ads (Templates)"
                  : "Generate Ads with AI"}
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
                  {modelProgress.status === "generating"
                    ? "Generating with on-device AI..."
                    : isOffline
                      ? "Generating ads..."
                      : "Generating ads with AI..."}
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
                    source={adSources[ad.platform] || "ai"}
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
