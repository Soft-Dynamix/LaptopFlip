"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Share2,
  Check,
  ExternalLink,
  MessageCircle,
  Facebook,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import type { AdPreview, Platform } from "@/lib/types";
import { PLATFORMS, formatPrice } from "@/lib/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function FacebookPreview({ ad }: { ad: AdPreview }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
      {/* Blue header bar */}
      <div className="bg-[#1877F2] px-4 py-2.5 flex items-center gap-2">
        <Facebook className="size-5 text-white" />
        <span className="text-white text-sm font-semibold">Facebook Marketplace</span>
      </div>

      {/* User info */}
      <div className="px-4 py-3 flex items-center gap-2.5">
        <div className="size-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
          <span className="text-xs font-bold">U</span>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-900">User</div>
          <div className="text-[10px] text-gray-500">Just now</div>
        </div>
      </div>

      {/* Image placeholder */}
      <div className="mx-4 aspect-[4/3] rounded-lg bg-gray-100 flex items-center justify-center">
        <span className="text-4xl">💻</span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className="text-base font-semibold text-gray-900">{ad.title}</div>
        <div className="text-lg font-bold text-gray-900 mt-1">
          {formatPrice(ad.price)}
        </div>
        <p className="text-xs text-gray-700 mt-2 leading-relaxed whitespace-pre-line">
          {ad.body}
        </p>
      </div>

      {/* Action bar */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <button
          type="button"
          className="w-full bg-[#1877F2] text-white text-xs font-semibold py-2.5 rounded-lg"
        >
          Contact Seller
        </button>
      </div>
    </div>
  );
}

function WhatsAppPreview({ ad }: { ad: AdPreview }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-[#ECE5DD]">
      {/* WhatsApp header */}
      <div className="bg-[#075E54] px-4 py-2.5 flex items-center gap-2">
        <Phone className="size-4 text-white" />
        <span className="text-white text-sm font-semibold">WhatsApp</span>
      </div>

      {/* Chat area */}
      <div className="px-3 py-4 space-y-2">
        {/* Forwarded label */}
        <div className="text-center">
          <span className="text-[10px] text-gray-500 bg-white/80 px-3 py-1 rounded-lg inline-block">
            Forwarded Message
          </span>
        </div>

        {/* Chat bubble */}
        <div className="max-w-[85%] bg-white rounded-lg rounded-tl-none p-3 shadow-sm">
          {/* Bubble tail */}
          <div className="absolute left-0 top-0 w-0 h-0" />

          {/* Time and status */}
          <div className="flex justify-end mb-1">
            <span className="text-[10px] text-gray-500">10:30 AM</span>
          </div>

          <div className="text-sm font-semibold text-gray-900">{ad.title}</div>
          <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatPrice(ad.price)}
          </div>
          <Separator className="my-2" />
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
            {ad.body}
          </p>

          {/* Read receipt */}
          <div className="flex items-center justify-end gap-1 mt-1.5">
            <span className="text-[10px] text-gray-400">10:30 AM</span>
            <Check className="size-3 text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GumtreePreview({ ad }: { ad: AdPreview }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
      {/* Green header */}
      <div className="bg-[#00A650] px-4 py-2.5 flex items-center gap-2">
        <span className="text-white text-sm font-bold">G</span>
        <span className="text-white text-sm font-semibold">Gumtree</span>
      </div>

      {/* Image placeholder */}
      <div className="aspect-[16/9] bg-gray-100 flex items-center justify-center">
        <span className="text-5xl">💻</span>
      </div>

      {/* Listing content */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900 leading-tight flex-1">
            {ad.title}
          </h3>
          <div className="bg-[#00A650] text-white text-sm font-bold px-2.5 py-1 rounded shrink-0">
            {formatPrice(ad.price)}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>Classified Ad</span>
          <span>·</span>
          <span>Computers &amp; Laptops</span>
        </div>

        <Separator />

        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
          {ad.body}
        </p>

        <div className="pt-1 space-y-1.5">
          <button
            type="button"
            className="w-full bg-[#00A650] text-white text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="size-3.5" />
            Contact Seller
          </button>
          <button
            type="button"
            className="w-full border border-[#00A650] text-[#00A650] text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5"
          >
            <Phone className="size-3.5" />
            Show Phone Number
          </button>
        </div>
      </div>
    </div>
  );
}

function OLXPreview({ ad }: { ad: AdPreview }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
      {/* Orange header */}
      <div className="bg-[#F7A300] px-4 py-2.5 flex items-center gap-2">
        <span className="text-white text-lg font-black">OLX</span>
      </div>

      {/* Image placeholder */}
      <div className="aspect-[16/10] bg-gray-100 flex items-center justify-center relative">
        <span className="text-5xl">💻</span>
        <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-0.5 text-[10px] text-gray-600 font-medium">
          1/1
        </div>
      </div>

      {/* Listing content */}
      <div className="px-4 py-3 space-y-2">
        <div className="text-base font-bold text-gray-900">{ad.title}</div>

        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-gray-900">
            {formatPrice(ad.price)}
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
            Negotiable
          </span>
        </div>

        <Separator />

        {/* Structured listing details */}
        <div className="space-y-1.5">
          <div className="flex items-center text-xs text-gray-600">
            <span className="w-20 text-gray-400">Condition</span>
            <span className="font-medium">Used</span>
          </div>
        </div>

        <Separator />

        <div>
          <div className="text-xs font-semibold text-gray-900 mb-1">Description</div>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
            {ad.body}
          </p>
        </div>

        {/* Seller info */}
        <Separator />
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
            <span className="text-xs font-bold">S</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-900">Seller</div>
            <div className="text-[10px] text-gray-500">Member since 2024</div>
          </div>
        </div>

        <button
          type="button"
          className="w-full bg-[#F7A300] text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-1.5 mt-1"
        >
          <MessageCircle className="size-4" />
          Chat with Seller
        </button>
      </div>
    </div>
  );
}

function PlatformPreview({ platform, ad }: { platform: Platform; ad: AdPreview }) {
  switch (platform) {
    case "facebook":
      return <FacebookPreview ad={ad} />;
    case "whatsapp":
      return <WhatsAppPreview ad={ad} />;
    case "gumtree":
      return <GumtreePreview ad={ad} />;
    case "olx":
      return <OLXPreview ad={ad} />;
    default:
      return <FacebookPreview ad={ad} />;
  }
}

export function AdPreviewSheet() {
  const isPreviewOpen = useAppStore((s) => s.isPreviewOpen);
  const setIsPreviewOpen = useAppStore((s) => s.setIsPreviewOpen);
  const previewAd = useAppStore((s) => s.previewAd);
  const previewPlatform = useAppStore((s) => s.previewPlatform);
  const setPreviewAd = useAppStore((s) => s.setPreviewAd);
  const setPreviewPlatform = useAppStore((s) => s.setPreviewPlatform);

  const [copied, setCopied] = useState(false);

  const platformInfo = PLATFORMS.find((p) => p.id === previewPlatform);
  const platformName = platformInfo?.name || previewPlatform || "Ad";

  const handleCopyAll = useCallback(async () => {
    if (!previewAd) return;
    const fullText = `${previewAd.title}\n\n${previewAd.body}\n\nPrice: ${formatPrice(previewAd.price)}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success("Full ad copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [previewAd]);

  const handleShareWhatsApp = useCallback(() => {
    if (!previewAd) return;
    const text = encodeURIComponent(`${previewAd.title}\n\n${previewAd.body}\n\nPrice: ${formatPrice(previewAd.price)}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [previewAd]);

  const handleShareFacebook = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: previewAd?.title,
        text: previewAd?.body,
      });
    } else {
      window.open("https://www.facebook.com/marketplace/item/", "_blank");
    }
  }, [previewAd]);

  const handleShareGeneric = useCallback(async () => {
    if (!previewAd) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: previewAd.title,
          text: `${previewAd.title}\n\n${previewAd.body}`,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyAll();
    }
  }, [previewAd, handleCopyAll]);

  const handleClose = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewAd(null);
    setPreviewPlatform(null);
  }, [setIsPreviewOpen, setPreviewAd, setPreviewPlatform]);

  return (
    <Sheet open={isPreviewOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] rounded-t-2xl overflow-hidden">
        <SheetHeader className="pb-2 border-b border-border/50">
          <SheetTitle className="text-lg flex items-center gap-2">
            {platformInfo && (
              <div
                className="size-7 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: platformInfo.color }}
              >
                {previewPlatform === "facebook" && <Facebook className="size-3.5" />}
                {previewPlatform === "whatsapp" && <MessageCircle className="size-3.5" />}
                {previewPlatform === "gumtree" && <ExternalLink className="size-3.5" />}
                {previewPlatform === "olx" && <ExternalLink className="size-3.5" />}
              </div>
            )}
            {platformName} Preview
          </SheetTitle>
          <SheetDescription>
            See how your ad will look on {platformName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 pb-4 space-y-4 pt-4 dark:bg-gray-900 rounded-lg">
          {previewAd && previewPlatform && (
            <motion.div
              key={`${previewPlatform}-${previewAd.title}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <PlatformPreview platform={previewPlatform} ad={previewAd} />
            </motion.div>
          )}
        </div>

        {/* Share buttons at bottom */}
        {previewAd && (
          <div className="pt-3 border-t border-border/50 mt-auto space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-xl text-xs"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle className="size-3.5 text-[#25D366]" />
                Share to WhatsApp
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl text-xs"
                onClick={handleShareFacebook}
              >
                <Facebook className="size-3.5 text-[#1877F2]" />
                Share to Facebook
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={copied ? "default" : "outline"}
                className={`h-10 rounded-xl text-xs ${copied ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
                onClick={handleCopyAll}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy All
                  </>
                )}
              </Button>
              <Button
                className="h-10 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleShareGeneric}
              >
                <Share2 className="size-3.5" />
                Share via...
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

