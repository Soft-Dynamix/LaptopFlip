"use client";

import { motion } from "framer-motion";
import {
  Camera,
  Sparkles,
  CircleDot,
  BookOpen,
  ImageIcon,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { photoSteps, prepTips } from "@/lib/photo-steps";

// Pro tips for each photo category
const proTips = [
  {
    category: "Main Shots",
    icon: "🎯",
    tips: [
      "Always shoot from directly above for the cleanest angle",
      "Make sure the laptop fills about 80% of the frame",
      "Consistent background and lighting across all shots builds trust",
    ],
  },
  {
    category: "Screen Shots",
    icon: "🖥️",
    tips: [
      "Avoid glare by angling away from windows",
      "Show a clean desktop or bright wallpaper",
      "Take the screen shot last so you don't drain battery",
    ],
  },
  {
    category: "Detail Shots",
    icon: "🔍",
    tips: [
      "Get close enough that the detail fills the frame",
      "Use natural light for the most accurate color representation",
      "Be honest about damage — it reduces returns and builds credibility",
    ],
  },
  {
    category: "Accessories",
    icon: "🔋",
    tips: [
      "Arrange everything neatly on the same surface",
      "Original box and charger can add R500-R1500 to perceived value",
      "Include any manuals, recovery drives, or original packaging",
    ],
  },
];

const commonMistakes = [
  { icon: "🚫", text: "Dark or blurry photos" },
  { icon: "🚫", text: "Cluttered background" },
  { icon: "🚫", text: "Only one angle" },
  { icon: "🚫", text: "Hiding damage" },
  { icon: "🚫", text: "Screen reflections" },
  { icon: "🚫", text: "Low resolution photos" },
];

const bestPractices = [
  { icon: "✅", text: "Clean laptop before every shot" },
  { icon: "✅", text: "Consistent white/plain background" },
  { icon: "✅", text: "Natural light near a window" },
  { icon: "✅", text: "At least 6-8 different angles" },
  { icon: "✅", text: "Show honest condition" },
  { icon: "✅", text: "Include charger & accessories" },
];

export function PhotoGuide() {
  const setIsFormOpen = useAppStore((s) => s.setIsFormOpen);
  const setEditingLaptopId = useAppStore((s) => s.setEditingLaptopId);

  const handleStartAdding = () => {
    setEditingLaptopId(null);
    setIsFormOpen(true);
    toast.success("Starting photo-guided laptop entry!");
  };

  const requiredSteps = photoSteps.filter((s) => s.required);
  const optionalSteps = photoSteps.filter((s) => !s.required);

  return (
    <div className="space-y-6 p-4 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
          📸 Photo Guide
        </h1>
        <p className="text-sm text-muted-foreground">
          Learn how to take the best listing photos to sell laptops faster
        </p>
      </motion.div>

      {/* CTA - Start adding */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20">
          <div className="flex items-start gap-3 mb-3">
            <div className="size-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Ready to add a laptop?</h2>
              <p className="text-sm text-emerald-100 mt-0.5">
                Tap below to start — we&apos;ll guide you through every photo step
              </p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleStartAdding}
              className="w-full bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl h-12 text-base font-bold gap-2 shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <Camera className="size-5" />
              Start Adding Laptop
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
          How it works
        </h2>
        <Card className="rounded-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Tap &quot;+&quot; or &quot;Start Adding Laptop&quot;</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Opens the guided photo session
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Take photos step-by-step</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Camera opens for each shot — take, retake, or skip
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Fill in laptop details</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Brand, model, specs, pricing — your photos are auto-attached
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Before you start */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <CircleDot className="size-4 text-amber-500" />
          Before you start
        </h2>
        <Card className="rounded-xl overflow-hidden">
          <CardContent className="p-3">
            <div className="space-y-2">
              {prepTips.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 dark:bg-muted/20 hover:bg-muted/70 dark:hover:bg-muted/30 transition-colors"
                >
                  <span className="text-lg shrink-0">{tip.emoji}</span>
                  <span className="text-sm leading-snug">{tip.text}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
          <div className="h-0.5 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 dark:from-amber-700 dark:via-amber-500 dark:to-amber-700 opacity-40" />
        </Card>
      </motion.div>

      {/* Required photo steps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Camera className="size-4 text-emerald-600 dark:text-emerald-400" />
          Required Photos
        </h2>
        <div className="space-y-2">
          {requiredSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-xl border bg-card"
            >
              <span className="text-xl shrink-0">{step.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{step.label}</span>
                  <Badge className="text-[9px] bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                    Required
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {step.instruction}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  💡 {step.tip}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Optional photo steps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <ImageIcon className="size-4 text-muted-foreground" />
          Optional Photos
          <Badge variant="secondary" className="text-[10px]">
            Skip if N/A
          </Badge>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {optionalSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.03 }}
              className="flex items-center gap-2 p-2.5 rounded-lg border bg-card"
            >
              <span className="text-base">{step.icon}</span>
              <div className="min-w-0">
                <span className="text-xs font-medium block truncate">
                  {step.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Pro Tips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-500" />
          Pro Tips
        </h2>
        <div className="space-y-3">
          {proTips.map((section, index) => (
            <motion.div
              key={section.category}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + index * 0.05 }}
            >
              <Card className="rounded-xl">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{section.icon}</span>
                    <span className="text-sm font-semibold">{section.category}</span>
                  </div>
                  {section.tips.map((tip, ti) => (
                    <p
                      key={ti}
                      className="text-xs text-muted-foreground pl-7 leading-relaxed"
                    >
                      • {tip}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Dos and Don'ts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          Do&apos;s &amp; Don&apos;ts
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Do's */}
          <Card className="rounded-xl border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-3 space-y-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Do&apos;s
              </span>
              {bestPractices.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs shrink-0">{item.icon}</span>
                  <span className="text-xs">{item.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Don'ts */}
          <Card className="rounded-xl border-red-200 dark:border-red-800">
            <CardContent className="p-3 space-y-2">
              <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                Don&apos;ts
              </span>
              {commonMistakes.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs shrink-0">{item.icon}</span>
                  <span className="text-xs">{item.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="pt-2"
      >
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleStartAdding}
            size="lg"
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl h-14 text-base font-bold gap-2 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30 transition-all duration-200"
          >
            <Sparkles className="size-5" />
            Start Adding a Laptop
            <ArrowRight className="size-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
