"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Camera,
  X,
  Loader2,
  Save,
  Laptop,
  Cpu,
  Battery,
  Tag,
  Image,
  StickyNote,
  SkipForward,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  CheckCircle2,
  BookOpen,
  CircleDot,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import {
  apiFetchLaptop,
  apiFetchLaptops,
  apiCreateLaptop,
  apiUpdateLaptop,
} from "@/lib/api";
import type { LaptopFormData, Laptop } from "@/lib/types";
import {
  defaultLaptopForm,
  POPULAR_BRANDS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  CONDITIONS,
  BATTERY_HEALTH,
  formatPrice,
} from "@/lib/types";
import { photoSteps, prepTips } from "@/lib/photo-steps";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ──────────────────────────────────────────────
// Reusable form components
// ──────────────────────────────────────────────

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        <Icon className="size-4" />
        <span>{title}</span>
      </div>
      <Separator />
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// Photo Capture Step (Step 1)
// ──────────────────────────────────────────────

function PhotoCaptureStep({
  photos,
  setPhotos,
  onSkipAll,
  onNext,
}: {
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  onSkipAll: () => void;
  onNext: () => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [captureMode, setCaptureMode] = useState<"camera" | "gallery" | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepPhotos, setStepPhotos] = useState<Record<number, string>>({});

  const totalSteps = photoSteps.length;
  const step = photoSteps[currentStep];
  const currentPhoto = stepPhotos[currentStep] || null;
  const hasPhoto = !!currentPhoto;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const takenCount = Object.keys(stepPhotos).length;
  const progressPercent = (takenCount / totalSteps) * 100;

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
            setStepPhotos((prev) => ({ ...prev, [currentStep]: dataUrl }));
          }
        };
        reader.readAsDataURL(file);
      });

      e.target.value = "";
      setCaptureMode(null);
    },
    [currentStep]
  );

  const handleTakePhoto = () => {
    setCaptureMode("camera");
    cameraInputRef.current?.click();
  };

  const handleUploadPhoto = () => {
    setCaptureMode("gallery");
    galleryInputRef.current?.click();
  };

  const handleSkip = () => {
    if (isLastStep) {
      finishSession();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRetake = () => {
    setStepPhotos((prev) => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
    setCaptureMode("camera");
    cameraInputRef.current?.click();
  };

  const handleNext = () => {
    if (isLastStep) {
      finishSession();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = () => {
    finishSession();
  };

  const finishSession = () => {
    // Collect all photos in order
    const orderedPhotos: string[] = [];
    for (let i = 0; i < totalSteps; i++) {
      if (stepPhotos[i]) {
        orderedPhotos.push(stepPhotos[i]);
      }
    }
    if (orderedPhotos.length > 0) {
      setPhotos(orderedPhotos);
      toast.success(`${orderedPhotos.length} photos captured!`);
    }
    onNext();
  };

  // ──────────────────────────────────────────────
  // PREPARATION SCREEN (before starting)
  // ──────────────────────────────────────────────
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="flex flex-col min-h-[60vh]">
        <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 space-y-5 pt-2">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
              📸 Step 1: Take Photos
            </h2>
            <p className="text-sm text-muted-foreground">
              Let&apos;s capture the best photos of your laptop to sell it faster
            </p>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20">
              <h3 className="font-bold text-base mb-3">How it works</h3>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">
                    1
                  </div>
                  <p className="text-sm text-emerald-50">
                    We guide you through <strong>12 photo steps</strong> — front,
                    screen, keyboard, ports &amp; more
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">
                    2
                  </div>
                  <p className="text-sm text-emerald-50">
                    For each step: <strong>take a photo</strong>,{" "}
                    <strong>upload from gallery</strong>, or <strong>skip</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">
                    3
                  </div>
                  <p className="text-sm text-emerald-50">
                    Photos carry over to your listing automatically
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Prep tips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <CircleDot className="size-4 text-amber-500" />
              Before you start
            </h3>
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

          {/* Quick step overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Camera className="size-4 text-emerald-600 dark:text-emerald-400" />
              Photo steps
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {photoSteps.map((s, index) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.03 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg border bg-card"
                >
                  <span className="text-base">{s.icon}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium block truncate">
                      {s.label}
                    </span>
                    {s.required && (
                      <span className="text-[10px] text-red-500 dark:text-red-400">
                        Required
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom actions */}
        <div className="pt-3 border-t border-border/50 mt-auto space-y-2">
          <Button
            onClick={() => setStarted(true)}
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-13 text-base font-bold gap-2 shadow-lg shadow-emerald-600/25"
          >
            <Camera className="size-5" />
            Start Photo Session
          </Button>
          <Button
            variant="ghost"
            onClick={onSkipAll}
            className="w-full h-10 text-sm text-muted-foreground rounded-xl"
          >
            Skip photos &amp; fill in details
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // ACTIVE PHOTO SESSION
  // ──────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[60vh]">
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
            onClick={() => setStarted(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4 inline -mt-0.5" /> Back
          </button>
          <span className="text-xs font-semibold text-muted-foreground">
            {currentStep + 1} of {totalSteps} · {takenCount} taken
          </span>
          <button
            onClick={handleFinish}
            className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"
          >
            Done
          </button>
        </div>
        <Progress
          value={progressPercent}
          className="h-1.5 [&>div]:bg-emerald-600"
        />
        {/* Step dots */}
        <div className="flex justify-center gap-1 mt-2">
          {photoSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-4 bg-emerald-600"
                  : stepPhotos[i]
                  ? "w-1.5 bg-emerald-400"
                  : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col space-y-4"
            >
              {/* Step label */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold leading-tight">
                      {step.label}
                    </h2>
                    {step.required && (
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
                      {step.instruction}
                    </p>
                  </div>
                  <div className="flex gap-2 pl-6">
                    <span className="text-xs text-muted-foreground">
                      💡 {step.tip}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Photo preview area */}
              <div className="min-h-[200px] rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center gap-3 overflow-hidden">
                {hasPhoto ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full"
                  >
                    <img
                      src={currentPhoto!}
                      alt={step.label}
                      className="w-full max-h-[280px] object-contain rounded-2xl"
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
      </div>

      {/* Bottom action buttons - sticky */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t border-border p-4 space-y-2">
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
                <ImageIcon className="size-4" />
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
              onClick={handleNext}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base font-semibold gap-2"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="size-5" />
                  Finish Photos
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
// Main LaptopFormSheet Component
// ──────────────────────────────────────────────

export function LaptopFormSheet() {
  const isFormOpen = useAppStore((s) => s.isFormOpen);
  const setIsFormOpen = useAppStore((s) => s.setIsFormOpen);
  const editingLaptopId = useAppStore((s) => s.editingLaptopId);
  const setEditingLaptopId = useAppStore((s) => s.setEditingLaptopId);
  const setLaptops = useAppStore((s) => s.setLaptops);
  const laptops = useAppStore((s) => s.laptops);
  const addActivityLog = useAppStore((s) => s.addActivityLog);

  const [formData, setFormData] = useState<LaptopFormData>(defaultLaptopForm);
  const [customBrandInput, setCustomBrandInput] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLaptop, setFetchingLaptop] = useState(false);

  // Step management: "photos" for new laptop, "details" for editing
  const [formStep, setFormStep] = useState<"photos" | "details">("photos");
  const isEditing = !!editingLaptopId;

  // Fetch laptop data when editing
  const fetchLaptop = useCallback(async () => {
    if (!editingLaptopId) return;
    setFetchingLaptop(true);
    try {
      const laptop: Laptop | null = await apiFetchLaptop(editingLaptopId);
      if (!laptop) throw new Error("Failed to fetch laptop");

      const form: LaptopFormData = {
        brand: laptop.brand || "",
        model: laptop.model || "",
        cpu: laptop.cpu || "",
        ram: laptop.ram || "",
        storage: laptop.storage || "",
        gpu: laptop.gpu || "",
        screenSize: laptop.screenSize || "",
        condition: laptop.condition || "Good",
        batteryHealth: laptop.batteryHealth || "Good",
        purchasePrice: laptop.purchasePrice?.toString() || "",
        askingPrice: laptop.askingPrice?.toString() || "",
        notes: laptop.notes || "",
        color: laptop.color || "",
        year: laptop.year?.toString() || "",
        serialNumber: laptop.serialNumber || "",
        repairs: laptop.repairs || "",
      };
      setFormData(form);
      if (laptop.photos) {
        if (Array.isArray(laptop.photos)) {
          setPhotos(laptop.photos);
        } else {
          try {
            const parsed = JSON.parse(laptop.photos);
            if (Array.isArray(parsed)) setPhotos(parsed);
          } catch {
            setPhotos([]);
          }
        }
      }
    } catch {
      toast.error("Failed to load laptop data");
    } finally {
      setFetchingLaptop(false);
    }
  }, [editingLaptopId]);

  // Initialize when form opens
  useEffect(() => {
    if (isFormOpen) {
      if (editingLaptopId) {
        // Editing: go straight to details
        setFormStep("details");
        fetchLaptop();
      } else {
        // Adding new: start with photo capture step
        setFormStep("photos");
        setFormData(defaultLaptopForm);
        setCustomBrandInput("");
        setPhotos([]);
      }
    }
  }, [isFormOpen, editingLaptopId, fetchLaptop]);

  const updateField = (field: keyof LaptopFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoAdd = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setPhotos((prev) => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handlePhotoRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const refreshLaptops = useCallback(async () => {
    try {
      const data = await apiFetchLaptops();
      setLaptops(data);
    } catch {
      // Silently fail
    }
  }, [setLaptops]);

  const handleSubmit = async () => {
    // Resolve brand: if "__custom__" selected, use the customBrandInput value
    const resolvedBrand =
      formData.brand === "__custom__" ? customBrandInput.trim() : formData.brand.trim();

    if (!resolvedBrand || !formData.model.trim()) {
      toast.error("Brand and model are required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        brand: resolvedBrand,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : 0,
        askingPrice: formData.askingPrice ? Number(formData.askingPrice) : 0,
        year: formData.year ? Number(formData.year) : null,
        photos: JSON.stringify(photos),
      };

      const savedLaptop = isEditing
        ? await apiUpdateLaptop(editingLaptopId!, payload)
        : await apiCreateLaptop(payload);

      if (!savedLaptop) throw new Error("Failed to save laptop");

      // Activity logging
      if (isEditing) {
        const existingLaptop = laptops.find((l) => l.id === editingLaptopId);
        if (existingLaptop) {
          // Check for price change
          const newAskingPrice = formData.askingPrice ? Number(formData.askingPrice) : 0;
          if (existingLaptop.askingPrice !== newAskingPrice && newAskingPrice > 0) {
            addActivityLog({
              laptopId: editingLaptopId!,
              action: "price_update",
              detail: `Price updated from ${formatPrice(existingLaptop.askingPrice)} to ${formatPrice(newAskingPrice)}`,
            });
          }
          addActivityLog({
            laptopId: editingLaptopId!,
            action: "edited",
            detail: "Laptop details updated",
          });
        }
      } else {
        addActivityLog({
          laptopId: savedLaptop.id,
          action: "created",
          detail: `${resolvedBrand} ${formData.model.trim()} created`,
        });
      }

      toast.success(
        isEditing ? "Laptop updated successfully" : "Laptop added successfully"
      );

      setIsFormOpen(false);
      setEditingLaptopId(null);
      setFormData(defaultLaptopForm);
      setCustomBrandInput("");
      setPhotos([]);
      await refreshLaptops();
    } catch {
      toast.error("Failed to save laptop. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      setIsFormOpen(false);
      setEditingLaptopId(null);
      setFormStep("photos");
    }
  };

  return (
    <Sheet open={isFormOpen} onOpenChange={handleSheetClose}>
      <SheetContent side="bottom" className="max-h-[95vh] rounded-t-2xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-2 border-b border-border/50 shrink-0">
          {/* Step indicator */}
          {!isEditing && (
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
                  formStep === "photos"
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Camera className="size-3" />
                Photos
              </div>
              <div className="w-6 h-px bg-muted-foreground/30" />
              <div
                className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
                  formStep === "details"
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Laptop className="size-3" />
                Details
              </div>
            </div>
          )}
          <SheetTitle className="text-lg">
            {isEditing
              ? "Edit Laptop"
              : formStep === "photos"
              ? "Add New Laptop — Photos"
              : "Add New Laptop — Details"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the laptop details below"
              : formStep === "photos"
              ? "Follow the guided steps to capture the best photos"
              : "Fill in the details of the laptop you want to flip"}
          </SheetDescription>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {/* ──────── STEP 1: PHOTO CAPTURE ──────── */}
          {formStep === "photos" && !isEditing && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <PhotoCaptureStep
                photos={photos}
                setPhotos={setPhotos}
                onSkipAll={() => setFormStep("details")}
                onNext={() => setFormStep("details")}
              />
            </motion.div>
          )}

          {/* ──────── STEP 2: LAPTOP DETAILS ──────── */}
          {formStep === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {fetchingLaptop ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="size-8 text-emerald-600" />
                  </motion.div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 pb-4 space-y-6 pt-4">
                    {/* Back to photos button (only for new laptops) */}
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        onClick={() => setFormStep("photos")}
                        className="h-8 text-xs text-muted-foreground gap-1 px-2"
                      >
                        <ChevronLeft className="size-3" />
                        Back to photos
                        {photos.length > 0 && (
                          <Badge className="ml-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-0">
                            {photos.length}
                          </Badge>
                        )}
                      </Button>
                    )}

                    {/* Basic Info */}
                    <FormSection icon={Laptop} title="Basic Info">
                      <FormField label="Brand *">
                        <Select
                          value={formData.brand}
                          onValueChange={(v) => updateField("brand", v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select brand..." />
                          </SelectTrigger>
                          <SelectContent>
                            {POPULAR_BRANDS.map((brand) => (
                              <SelectItem key={brand} value={brand}>
                                {brand}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">
                              Type custom brand...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.brand === "__custom__" && (
                          <Input
                            placeholder="Enter custom brand"
                            className="mt-2"
                            value={customBrandInput}
                            onChange={(e) => setCustomBrandInput(e.target.value)}
                          />
                        )}
                      </FormField>

                      <FormField label="Model *">
                        <Input
                          placeholder="e.g. ThinkPad X1 Carbon"
                          value={formData.model}
                          onChange={(e) => updateField("model", e.target.value)}
                        />
                      </FormField>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Year">
                          <Input
                            type="number"
                            placeholder="2024"
                            value={formData.year}
                            onChange={(e) => updateField("year", e.target.value)}
                          />
                        </FormField>
                        <FormField label="Color">
                          <Input
                            placeholder="Silver"
                            value={formData.color}
                            onChange={(e) => updateField("color", e.target.value)}
                          />
                        </FormField>
                      </div>
                    </FormSection>

                    {/* Specifications */}
                    <FormSection icon={Cpu} title="Specifications">
                      <FormField label="CPU">
                        <Input
                          placeholder="e.g. Intel Core i5-1240P"
                          value={formData.cpu}
                          onChange={(e) => updateField("cpu", e.target.value)}
                        />
                      </FormField>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="RAM">
                          <Select
                            value={formData.ram}
                            onValueChange={(v) => updateField("ram", v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select RAM" />
                            </SelectTrigger>
                            <SelectContent>
                              {RAM_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField label="Storage">
                          <Select
                            value={formData.storage}
                            onValueChange={(v) => updateField("storage", v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select storage" />
                            </SelectTrigger>
                            <SelectContent>
                              {STORAGE_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="GPU">
                          <Input
                            placeholder="e.g. RTX 3060"
                            value={formData.gpu}
                            onChange={(e) => updateField("gpu", e.target.value)}
                          />
                        </FormField>
                        <FormField label="Screen Size">
                          <Input
                            placeholder='15.6"'
                            value={formData.screenSize}
                            onChange={(e) => updateField("screenSize", e.target.value)}
                          />
                        </FormField>
                      </div>
                    </FormSection>

                    {/* Condition & Battery */}
                    <FormSection icon={Battery} title="Condition & Battery">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Condition">
                          <Select
                            value={formData.condition}
                            onValueChange={(v) => updateField("condition", v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITIONS.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField label="Battery Health">
                          <Select
                            value={formData.batteryHealth}
                            onValueChange={(v) => updateField("batteryHealth", v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BATTERY_HEALTH.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {b}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>

                      <FormField label="Repairs">
                        <Textarea
                          placeholder="Any repairs done?"
                          value={formData.repairs}
                          onChange={(e) => updateField("repairs", e.target.value)}
                          rows={2}
                        />
                      </FormField>
                    </FormSection>

                    {/* Pricing */}
                    <FormSection icon={Tag} title="Pricing">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Purchase Price">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              R
                            </span>
                            <Input
                              type="number"
                              placeholder="0"
                              className="pl-8"
                              value={formData.purchasePrice}
                              onChange={(e) => updateField("purchasePrice", e.target.value)}
                            />
                          </div>
                        </FormField>

                        <FormField label="Asking Price">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              R
                            </span>
                            <Input
                              type="number"
                              placeholder="0"
                              className="pl-8"
                              value={formData.askingPrice}
                              onChange={(e) => updateField("askingPrice", e.target.value)}
                            />
                          </div>
                        </FormField>
                      </div>
                    </FormSection>

                    {/* Photos (for adding more / editing) */}
                    <FormSection icon={Image} title="Photos">
                      {photos.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {photos.length} photo{photos.length !== 1 ? "s" : ""} added.
                          You can add more or remove any.
                        </p>
                      )}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={handlePhotoCapture}
                        aria-label="Add laptop photos"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted"
                          >
                            <img
                              src={photo}
                              alt={`Laptop photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handlePhotoRemove(index)}
                              className="absolute top-1 right-1 size-6 rounded-full bg-destructive/90 text-white flex items-center justify-center shadow-md hover:bg-destructive transition-colors"
                            >
                              <X className="size-3" />
                            </button>
                          </motion.div>
                        ))}
                        <button
                          type="button"
                          onClick={handlePhotoAdd}
                          className="aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                          <Camera className="size-5" />
                          <span className="text-[10px] font-medium">Add Photo</span>
                        </button>
                      </div>
                    </FormSection>

                    {/* Notes */}
                    <FormSection icon={StickyNote} title="Notes">
                      <Textarea
                        placeholder="Any extra notes about this laptop..."
                        value={formData.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                        rows={3}
                      />
                    </FormSection>
                  </div>

                  {/* Submit button - sticky at bottom */}
                  <div className="pt-3 border-t border-border/50 mt-auto shrink-0">
                    <Button
                      onClick={handleSubmit}
                      disabled={loading || fetchingLaptop}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold rounded-xl"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : isEditing ? (
                        <>
                          <Save className="size-4" />
                          Save Laptop
                        </>
                      ) : (
                        <>
                          <Plus className="size-4" />
                          Add Laptop
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
