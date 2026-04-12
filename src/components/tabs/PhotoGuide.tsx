"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Camera, RotateCcw, Lightbulb, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAppStore } from "@/lib/store";

const checklistSections = [
  {
    id: "preparation",
    title: "Preparation",
    icon: "🧹",
    items: [
      { key: "prep-clean", label: "Clean laptop thoroughly" },
      { key: "prep-lighting", label: "Set up good lighting" },
      { key: "prep-background", label: "Use a clean background" },
      { key: "prep-wipe-screen", label: "Wipe screen clean" },
      { key: "prep-remove-case", label: "Remove any case/cover" },
      { key: "prep-charge", label: "Ensure laptop is charged" },
    ],
  },
  {
    id: "essential",
    title: "Essential Shots",
    icon: "📸",
    items: [
      { key: "shot-front", label: "Front view (closed)" },
      { key: "shot-back", label: "Back view" },
      { key: "shot-screen-on", label: "Screen powered on" },
      { key: "shot-keyboard", label: "Keyboard close-up" },
      { key: "shot-ports", label: "All ports visible" },
      { key: "shot-open-angle", label: "Open at 45-degree angle" },
    ],
  },
  {
    id: "details",
    title: "Detail Shots",
    icon: "🔍",
    items: [
      { key: "detail-dent", label: "Dents or damage areas" },
      { key: "detail-scratch", label: "Scratches (if any)" },
      { key: "detail-sticker", label: "Stickers and branding" },
      { key: "detail-hinge", label: "Hinge condition" },
      { key: "detail-charger", label: "Charger included" },
      { key: "detail-box-accessories", label: "Box & accessories" },
    ],
  },
  {
    id: "quality",
    title: "Quality Checks",
    icon: "✅",
    items: [
      { key: "quality-focused", label: "All images are focused" },
      { key: "quality-consistent", label: "Consistent image size" },
      { key: "quality-lit", label: "Photos are well-lit" },
      { key: "quality-8plus", label: "At least 8 photos taken" },
      { key: "quality-no-glare", label: "No screen glare" },
      { key: "quality-honest", label: "Honest representation" },
    ],
  },
];

const tips = [
  {
    title: "Natural light works best",
    description: "Position near a window for soft, even lighting without harsh shadows.",
    emoji: "☀️",
  },
  {
    title: "Use a clean white surface",
    description: "A white desk or poster board makes your laptop the star of every photo.",
    emoji: "⬜",
  },
  {
    title: "Shoot from 45-degree angles",
    description: "Capture depth by photographing from angles, not just straight-on shots.",
    emoji: "📐",
  },
];

export function PhotoGuide() {
  const { photoChecklist, togglePhotoCheck, resetPhotoChecklist } =
    useAppStore();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const allKeys = checklistSections.flatMap((s) => s.items.map((i) => i.key));
  const completedCount = allKeys.filter((k) => photoChecklist[k]).length;
  const totalCount = allKeys.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = completedCount === totalCount;

  return (
    <div className="space-y-6 p-4 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
          Photo Guide
        </h1>
        <p className="text-sm text-muted-foreground">
          Take great photos to sell your laptop faster
        </p>
      </motion.div>

      {/* Progress Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="rounded-xl py-4">
          <CardContent className="p-0 px-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : (
                  <Camera className="size-5 text-emerald-600" />
                )}
                <span className="text-sm font-medium">
                  {completedCount}/{totalCount} complete
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2 [&>div]:bg-emerald-600" />
            {isComplete && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">
                🎉 All done! You&apos;re ready to take photos.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Checklist Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Accordion type="multiple" defaultValue={["preparation", "essential"]} className="space-y-2">
          {checklistSections.map((section, sectionIndex) => {
            const sectionCompleted = section.items.filter(
              (item) => photoChecklist[item.key]
            ).length;
            const sectionTotal = section.items.length;

            return (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border rounded-xl px-4 shadow-sm"
              >
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>{section.icon}</span>
                    <span>{section.title}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({sectionCompleted}/{sectionTotal})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-1">
                    {section.items.map((item, itemIndex) => (
                      <motion.label
                        key={item.key}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.15,
                          delay: sectionIndex * 0.05 + itemIndex * 0.03,
                        }}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <Checkbox
                          checked={photoChecklist[item.key]}
                          onCheckedChange={() => togglePhotoCheck(item.key)}
                          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <span
                          className={`text-sm transition-all ${
                            photoChecklist[item.key]
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {item.label}
                        </span>
                      </motion.label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </motion.div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-500" />
          <h2 className="text-base font-semibold">Pro Tips</h2>
        </div>
        <div className="space-y-2">
          {tips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.35 + index * 0.05 }}
            >
              <Card className="rounded-xl py-3 shadow-sm">
                <CardContent className="p-0 px-4">
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0">{tip.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{tip.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tip.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="space-y-2"
      >
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          aria-label="Take photos with camera"
        />
        <Button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11"
        >
          <Camera className="size-4" />
          Take Photos
        </Button>
        <Button
          variant="outline"
          onClick={resetPhotoChecklist}
          className="w-full rounded-xl h-11"
        >
          <RotateCcw className="size-4" />
          Reset Checklist
        </Button>
      </motion.div>
    </div>
  );
}
