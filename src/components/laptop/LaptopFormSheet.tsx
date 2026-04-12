"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import type { LaptopFormData, Laptop } from "@/lib/types";
import {
  defaultLaptopForm,
  POPULAR_BRANDS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  CONDITIONS,
  BATTERY_HEALTH,
} from "@/lib/types";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function LaptopFormSheet() {
  const isFormOpen = useAppStore((s) => s.isFormOpen);
  const setIsFormOpen = useAppStore((s) => s.setIsFormOpen);
  const editingLaptopId = useAppStore((s) => s.editingLaptopId);
  const setEditingLaptopId = useAppStore((s) => s.setEditingLaptopId);
  const setLaptops = useAppStore((s) => s.setLaptops);
  const laptops = useAppStore((s) => s.laptops);

  const [formData, setFormData] = useState<LaptopFormData>(defaultLaptopForm);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLaptop, setFetchingLaptop] = useState(false);

  const isEditing = !!editingLaptopId;

  // Fetch laptop data when editing
  const fetchLaptop = useCallback(async () => {
    if (!editingLaptopId) return;
    setFetchingLaptop(true);
    try {
      const res = await fetch(`/api/laptops/${editingLaptopId}`);
      if (!res.ok) throw new Error("Failed to fetch laptop");
      const laptop: Laptop = await res.json();

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
        try {
          const parsed = JSON.parse(laptop.photos);
          if (Array.isArray(parsed)) setPhotos(parsed);
        } catch {
          setPhotos([]);
        }
      }
    } catch {
      toast.error("Failed to load laptop data");
    } finally {
      setFetchingLaptop(false);
    }
  }, [editingLaptopId]);

  useEffect(() => {
    if (isFormOpen) {
      if (editingLaptopId) {
        fetchLaptop();
      } else {
        setFormData(defaultLaptopForm);
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

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handlePhotoRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const refreshLaptops = useCallback(async () => {
    try {
      const res = await fetch("/api/laptops");
      if (res.ok) {
        const data = await res.json();
        setLaptops(data);
      }
    } catch {
      // Silently fail
    }
  }, [setLaptops]);

  const handleSubmit = async () => {
    if (!formData.brand.trim() || !formData.model.trim()) {
      toast.error("Brand and model are required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : 0,
        askingPrice: formData.askingPrice ? Number(formData.askingPrice) : 0,
        year: formData.year ? Number(formData.year) : null,
        photos: JSON.stringify(photos),
      };

      const url = isEditing
        ? `/api/laptops/${editingLaptopId}`
        : "/api/laptops";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save laptop");

      toast.success(
        isEditing ? "Laptop updated successfully" : "Laptop added successfully"
      );

      setIsFormOpen(false);
      setEditingLaptopId(null);
      setFormData(defaultLaptopForm);
      setPhotos([]);
      await refreshLaptops();
    } catch {
      toast.error("Failed to save laptop. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isFormOpen} onOpenChange={(open) => {
      if (!open) {
        setIsFormOpen(false);
        setEditingLaptopId(null);
      }
    }}>
      <SheetContent side="bottom" className="max-h-[92vh] rounded-t-2xl overflow-hidden">
        <SheetHeader className="pb-2 border-b border-border/50">
          <SheetTitle className="text-lg">
            {isEditing ? "Edit Laptop" : "Add New Laptop"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the laptop details below"
              : "Fill in the details of the laptop you want to flip"}
          </SheetDescription>
        </SheetHeader>

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
          <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 pb-4 space-y-6 pt-4">
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
                    onChange={(e) => updateField("brand", e.target.value)}
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

            {/* Photos */}
            <FormSection icon={Image} title="Photos">
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
        )}

        {/* Submit button - sticky at bottom */}
        <div className="pt-3 border-t border-border/50 mt-auto">
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
      </SheetContent>
    </Sheet>
  );
}
