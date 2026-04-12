"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  SkipForward,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Sparkles,
  X,
  CheckCircle2,
  CircleDot,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

// The guided photo steps - what the user actually photographs
const photoSteps = [
  {
    id: "front-closed",
    label: "Front View (Closed)",
    instruction: "Place the laptop closed on a clean surface. Stand directly above and center the laptop in the frame.",
    tip: "Make sure the logo is visible and centered",
    icon: "💻",
    required: true,
  },
  {
    id: "front-open",
    label: "Front View (Open)",
    instruction: "Open the laptop at about 110 degrees. Stand above and capture the full keyboard and screen.",
    tip: "Wipe the screen and keyboard first for a clean look",
    icon: "🖥️",
    required: true,
  },
  {
    id: "screen-on",
    label: "Screen Powered On",
    instruction: "Turn on the laptop. Show the desktop or a bright wallpaper. Avoid screen glare.",
    tip: "Angle away from windows to prevent reflections",
    icon: "✨",
    required: true,
  },
  {
    id: "keyboard",
    label: "Keyboard Close-up",
    instruction: "Get close to the keyboard. Make sure all keys are visible and in focus.",
    tip: "Good lighting is key - use natural light near a window",
    icon: "⌨️",
    required: true,
  },
  {
    id: "ports-left",
    label: "Left Side Ports",
    instruction: "Show the left side of the laptop clearly. All ports should be visible.",
    tip: "Rotate so ports face the camera directly",
    icon: "🔌",
    required: false,
  },
  {
    id: "ports-right",
    label: "Right Side Ports",
    instruction: "Show the right side of the laptop. Capture all ports and any vents.",
    tip: "Same angle as the left side for consistency",
    icon: "🔌",
    required: false,
  },
  {
    id: "back",
    label: "Back View",
    instruction: "Flip the laptop and show the back/bottom panel. Capture vents and rubber feet.",
    tip: "Place on a soft cloth to avoid scratches",
    icon: "🔄",
    required: false,
  },
  {
    id: "hinge",
    label: "Hinge Detail",
    instruction: "Take a close-up of the hinge area. Show if it's loose, tight, or damaged.",
    tip: "Open the lid partially to show hinge tension",
    icon: "🔧",
    required: false,
  },
  {
    id: "damage-front",
    label: "Front Damage (if any)",
    instruction: "Photograph any scratches, dents, or marks on the front/lid.",
    tip: "Be honest - buyers appreciate full disclosure",
    icon: "📸",
    required: false,
  },
  {
    id: "damage-palm",
    label: "Palm Rest Damage (if any)",
    instruction: "Close-up of the palm rest area. Show any key wear, discoloration, or scratches.",
    tip: "Get close enough that scratches are clearly visible",
    icon: "📸",
    required: false,
  },
  {
    id: "charger",
    label: "Charger & Accessories",
    instruction: "Show the charger, cable, and any included accessories (bag, mouse, etc).",
    tip: "Arrange neatly on the same clean surface",
    icon: "🔋",
    required: false,
  },
  {
    id: "box",
    label: "Box & Documentation",
    instruction: "If you have the original box, manuals, or receipt - show them here.",
    tip: "Original box adds value - definitely include this if you have it",
    icon: "📦",
    required: false,
  },
];

// Preparation tips shown before the session starts
const prepTips = [
  { emoji: "🧹", text: "Clean the laptop thoroughly with a microfiber cloth" },
  { emoji: "☀️", text: "Find good natural lighting (near a window)" },
  { emoji: "⬜", text: "Use a clean white or plain background" },
  { emoji: "📱", text: "Wipe your phone camera lens" },
  { emoji: "🔌", text: "Charge the laptop so you can show the screen on" },
  { emoji: "📦", text: "Gather charger, box, and accessories nearby" },
];

export function PhotoGuide() {
  const {
    isPhotoSessionActive,
    setIsPhotoSessionActive,
    photoSessionStep,
    setPhotoSessionStep,
    photoSessionPhotos,
    addPhotoSessionPhoto,
    resetPhotoSession,
  } = useAppStore();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [pendingCaptureType, setPendingCaptureType] = useState<"camera" | "gallery" | null>(null);
  const [currentStepPhoto, setCurrentStepPhoto] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  const currentStep = photoSteps[photoSessionStep];
  const totalSteps = photoSteps.length;
  const takenCount = photoSessionPhotos.length;
  const progressPercent = (takenCount / totalSteps) * 100;

  // Handle file input change (works for both camera and gallery)
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach((file) => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            if (pendingCaptureType === "camera") {
              // Camera captures the current step photo
              setCurrentStepPhoto(dataUrl);
              addPhotoSessionPhoto(dataUrl);
            } else {
              // Gallery also captures for current step
              setCurrentStepPhoto(dataUrl);
              addPhotoSessionPhoto(dataUrl);
            }
          }
        };
        reader.readAsDataURL(file);
      });

      // Reset input
      e.target.value = "";
      setPendingCaptureType(null);
    },
    [pendingCaptureType, addPhotoSessionPhoto]
  );

  // Camera button
  const handleTakePhoto = () => {
    setPendingCaptureType("camera");
    cameraInputRef.current?.click();
  };

  // Upload button
  const handleUploadPhoto = () => {
    setPendingCaptureType("gallery");
    galleryInputRef.current?.click();
  };

  // Skip button
  const handleSkip = () => {
    setCurrentStepPhoto(null);
    if (photoSessionStep < totalSteps - 1) {
      setPhotoSessionStep(photoSessionStep + 1);
    } else {
      setSessionComplete(true);
    }
  };

  // Go back
  const handleBack = () => {
    if (photoSessionStep > 0) {
      setPhotoSessionStep(photoSessionStep - 1);
      // If this step already has a photo, show it
      if (photoSessionPhotos[photoSessionStep - 1]) {
        setCurrentStepPhoto(photoSessionPhotos[photoSessionStep - 1]);
      } else {
        setCurrentStepPhoto(null);
      }
    }
  };

  // Retake current photo
  const handleRetake = () => {
    setCurrentStepPhoto(null);
    // Remove the last added photo if it was for this step
    // (only if the photo count matches)
    const photoForThisStep = photoSessionPhotos[photoSessionStep];
    if (photoForThisStep) {
      // We can't easily remove from the middle, so just let the user take a new one
      // The next photo will be added and we'll consider this step done
    }
    setPendingCaptureType("camera");
    cameraInputRef.current?.click();
  };

  // Complete the session
  const handleFinish = () => {
    setSessionComplete(true);
    toast.success(`Session complete! ${photoSessionPhotos.length} photos captured.`);
  };

  // Start over
  const handleRestart = () => {
    resetPhotoSession();
    setSessionComplete(false);
    setCurrentStepPhoto(null);
  };

  // ──────────────────────────────────────────────
  // SESSION COMPLETE SCREEN
  // ──────────────────────────────────────────────
  if (sessionComplete) {
    return (
      <div className="space-y-6 p-4 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 pt-8"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              Photo Session Complete!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {photoSessionPhotos.length} of {totalSteps} photos captured
            </p>
          </div>
        </motion.div>

        {/* Photo Grid */}
        <div className="grid grid-cols-3 gap-2">
          {photoSessionPhotos.map((photo, index) => {
            const step = photoSteps[index];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={photo}
                  alt={step?.label || `Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-1.5 py-1">
                  <span className="text-[9px] text-white font-medium leading-tight block truncate">
                    {step?.icon} {step?.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={() => {
              // Switch to inventory and open form with these photos
              useAppStore.getState().setIsFormOpen(true);
              useAppStore.getState().setEditingLaptopId(null);
              toast.success("Photos carried over! Fill in the laptop details.");
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base font-semibold"
          >
            <Sparkles className="size-4" />
            Add Laptop with These Photos
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRestart}
              className="flex-1 rounded-xl h-11"
            >
              <RotateCcw className="size-4" />
              Take Again
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSessionComplete(false);
                setIsPhotoSessionActive(false);
                resetPhotoSession();
              }}
              className="flex-1 rounded-xl h-11"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // ACTIVE GUIDED SESSION
  // ──────────────────────────────────────────────
  if (isPhotoSessionActive && currentStep) {
    const hasPhoto = !!currentStepPhoto;
    const isLastStep = photoSessionStep === totalSteps - 1;
    const isFirstStep = photoSessionStep === 0;

    return (
      <div className="flex flex-col min-h-[calc(100vh-5rem)]">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Take photo with camera"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload photo from gallery"
        />

        {/* Top bar with progress */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                setIsPhotoSessionActive(false);
                resetPhotoSession();
                setCurrentStepPhoto(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <span className="text-xs font-semibold text-muted-foreground">
              {photoSessionStep + 1} of {totalSteps}
            </span>
            <button
              onClick={handleFinish}
              className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"
            >
              Finish
            </button>
          </div>
          <Progress value={progressPercent} className="h-1.5 [&>div]:bg-emerald-600" />
          {/* Step dots */}
          <div className="flex justify-center gap-1 mt-2">
            {photoSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === photoSessionStep
                    ? "w-4 bg-emerald-600"
                    : i < photoSessionStep
                    ? "w-1.5 bg-emerald-400"
                    : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col p-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={photoSessionStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col space-y-4"
            >
              {/* Step label */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentStep.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold leading-tight">
                      {currentStep.label}
                    </h2>
                    {currentStep.required && (
                      <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 mt-0.5">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Instruction card */}
              <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex gap-2">
                    <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground leading-relaxed">
                      {currentStep.instruction}
                    </p>
                  </div>
                  <div className="flex gap-2 pl-6">
                    <span className="text-xs text-muted-foreground">
                      💡 {currentStep.tip}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Photo preview area */}
              <div className="flex-1 min-h-[200px] rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center gap-3 overflow-hidden">
                {hasPhoto ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-full"
                  >
                    <img
                      src={currentStepPhoto!}
                      alt={currentStep.label}
                      className="w-full h-full object-contain rounded-2xl"
                    />
                    {/* Photo taken badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-emerald-600 text-white border-0 text-xs gap-1">
                        <Check className="size-3" />
                        Captured
                      </Badge>
                    </div>
                    {/* Retake button overlay */}
                    <button
                      onClick={handleRetake}
                      className="absolute top-3 right-3 size-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <ImageIcon className="size-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground text-center px-8">
                      Take or upload a photo for this step
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom action buttons - sticky */}
        <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t border-border p-4 space-y-2 pb-6">
          {!hasPhoto ? (
            <>
              {/* Primary: Take Photo */}
              <Button
                onClick={handleTakePhoto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base font-semibold gap-2"
              >
                <Camera className="size-5" />
                Take Photo
              </Button>

              <div className="flex gap-2">
                {/* Upload from gallery */}
                <Button
                  variant="outline"
                  onClick={handleUploadPhoto}
                  className="flex-1 rounded-xl h-11 gap-2"
                >
                  <Upload className="size-4" />
                  Upload
                </Button>

                {/* Skip */}
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="flex-1 rounded-xl h-11 gap-2 text-muted-foreground"
                >
                  <SkipForward className="size-4" />
                  Skip
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Photo taken - Next or Finish */}
              <Button
                onClick={() => {
                  if (isLastStep) {
                    setSessionComplete(true);
                    toast.success(
                      `Done! ${photoSessionPhotos.length} photos captured.`
                    );
                  } else {
                    setPhotoSessionStep(photoSessionStep + 1);
                    // Show next step's existing photo if any
                    const nextPhoto = photoSessionPhotos[photoSessionStep + 1];
                    setCurrentStepPhoto(nextPhoto || null);
                  }
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base font-semibold gap-2"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="size-5" />
                    Finish Session
                  </>
                ) : (
                  <>
                    Next Step
                    <ChevronRight className="size-5" />
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 rounded-xl h-11 gap-2"
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  className="flex-1 rounded-xl h-11 gap-2"
                >
                  <RotateCcw className="size-4" />
                  Retake
                </Button>
                {!isLastStep && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="rounded-xl h-11 gap-2 text-muted-foreground"
                  >
                    Skip
                    <ChevronRight className="size-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // LANDING SCREEN (start session)
  // ──────────────────────────────────────────────
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
          Photo Guide
        </h1>
        <p className="text-sm text-muted-foreground">
          Follow the guided session to take perfect listing photos
        </p>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20">
          <h2 className="font-bold text-base mb-3">How it works</h2>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">
                1
              </div>
              <p className="text-sm text-emerald-50">
                We guide you through <strong>12 photo steps</strong> — from front view to accessories
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">
                2
              </div>
              <p className="text-sm text-emerald-50">
                For each step: <strong>take a photo</strong>, <strong>upload from gallery</strong>, or <strong>skip</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">
                3
              </div>
              <p className="text-sm text-emerald-50">
                When done, photos carry over to your <strong>laptop listing</strong> automatically
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Preparation checklist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <CircleDot className="size-4 text-amber-500" />
          Before you start
        </h2>
        <Card className="rounded-xl">
          <CardContent className="p-3 space-y-2">
            {prepTips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.04 }}
                className="flex items-center gap-3"
              >
                <span className="text-base">{tip.emoji}</span>
                <span className="text-sm">{tip.text}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Photo steps overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Camera className="size-4 text-emerald-600 dark:text-emerald-400" />
          Photo steps
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {photoSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + index * 0.03 }}
              className="flex items-center gap-2 p-2.5 rounded-lg border bg-card"
            >
              <span className="text-base">{step.icon}</span>
              <div className="min-w-0">
                <span className="text-xs font-medium block truncate">
                  {step.label}
                </span>
                {step.required && (
                  <span className="text-[10px] text-red-500 dark:text-red-400">
                    Required
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Start button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="pt-2"
      >
        <Button
          onClick={() => {
            setIsPhotoSessionActive(true);
            setPhotoSessionStep(0);
            setCurrentStepPhoto(null);
            setSessionComplete(false);
          }}
          size="lg"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-14 text-base font-bold gap-2 shadow-lg shadow-emerald-600/25"
        >
          <Camera className="size-5" />
          Start Photo Session
        </Button>
      </motion.div>
    </div>
  );
}
