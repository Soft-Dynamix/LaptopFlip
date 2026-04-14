"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Trash2,
  MessageSquare,
  UserPlus,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import type { BuyerContact } from "@/lib/types";
import { CONTACT_STATUSES, CONTACT_PLATFORMS } from "@/lib/types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ─── Helpers ──────────────────────────────────────────────

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

function getStatusBadge(status: BuyerContact["status"]) {
  const found = CONTACT_STATUSES.find((s) => s.value === status);
  return found || CONTACT_STATUSES[0];
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "whatsapp":
      return "💬";
    case "facebook":
      return "📘";
    case "gumtree":
      return "🌿";
    case "olx":
      return "🟠";
    default:
      return "📞";
  }
}

// ─── Contact Card ─────────────────────────────────────────

function ContactCard({
  contact,
  onStatusChange,
  onDelete,
}: {
  contact: BuyerContact;
  onStatusChange: (id: string, status: BuyerContact["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const statusBadge = getStatusBadge(contact.status);
  const platformIcon = getPlatformIcon(contact.platform);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="rounded-xl border-border/60">
        <CardContent className="p-4 space-y-3">
          {/* Top row: name, platform, status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base shrink-0" title={contact.platform}>
                {platformIcon}
              </span>
              <span className="font-semibold text-sm truncate">
                {contact.name}
              </span>
            </div>
            <Badge
              variant="secondary"
              className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border-0 font-medium ${statusBadge.color}`}
            >
              {statusBadge.label}
            </Badge>
          </div>

          {/* Phone */}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
            >
              <Phone className="size-3.5 shrink-0" />
              <span className="truncate group-hover:underline">
                {contact.phone}
              </span>
            </a>
          )}

          {/* Email */}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
            >
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate group-hover:underline">
                {contact.email}
              </span>
            </a>
          )}

          {/* Message preview */}
          {contact.message && (
            <div className="flex items-start gap-2">
              <MessageSquare className="size-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                {contact.message}
              </p>
            </div>
          )}

          {/* Bottom row: time, status select, delete */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
              <Clock className="size-3" />
              <span>{formatTimeAgo(contact.createdAt)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Select
                value={contact.status}
                onValueChange={(val) =>
                  onStatusChange(contact.id, val as BuyerContact["status"])
                }
              >
                <SelectTrigger className="h-7 w-[120px] text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(contact.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────

export function ContactsSheet() {
  // Store selectors
  const isContactsSheetOpen = useAppStore((s) => s.isContactsSheetOpen);
  const setContactsSheetOpen = useAppStore((s) => s.setContactsSheetOpen);
  const contactsSheetLaptopId = useAppStore((s) => s.contactsSheetLaptopId);
  const contacts = useAppStore((s) => s.contacts);
  const laptops = useAppStore((s) => s.laptops);
  const addContact = useAppStore((s) => s.addContact);
  const updateContact = useAppStore((s) => s.updateContact);
  const deleteContact = useAppStore((s) => s.deleteContact);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    platform: "whatsapp",
    message: "",
  });

  // Derived data
  const safeLaptops = Array.isArray(laptops) ? laptops : [];
  const laptop = useMemo(
    () => safeLaptops.find((l) => l.id === contactsSheetLaptopId),
    [safeLaptops, contactsSheetLaptopId]
  );

  const laptopContacts = useMemo(
    () =>
      contacts.filter((c) => c.laptopId === contactsSheetLaptopId),
    [contacts, contactsSheetLaptopId]
  );

  // Handlers
  const handleSheetClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setContactsSheetOpen(false);
        setFormOpen(false);
      }
    },
    [setContactsSheetOpen]
  );

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      platform: "whatsapp",
      message: "",
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!contactsSheetLaptopId) return;
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    addContact({
      laptopId: contactsSheetLaptopId,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      platform: formData.platform,
      message: formData.message.trim(),
      status: "new",
    });
    toast.success(`Added ${formData.name.trim()} as a buyer`);
    resetForm();
    setFormOpen(false);
  }, [contactsSheetLaptopId, formData, addContact, resetForm]);

  const handleStatusChange = useCallback(
    (id: string, status: BuyerContact["status"]) => {
      updateContact(id, { status });
      const contact = contacts.find((c) => c.id === id);
      const statusLabel =
        CONTACT_STATUSES.find((s) => s.value === status)?.label || status;
      if (contact) {
        toast.success(`${contact.name} → ${statusLabel}`);
      }
    },
    [updateContact, contacts]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const contact = contacts.find((c) => c.id === id);
      deleteContact(id);
      if (contact) {
        toast.success(`Removed ${contact.name}`);
      }
    },
    [deleteContact, contacts]
  );

  return (
    <Sheet open={isContactsSheetOpen} onOpenChange={handleSheetClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[90vh] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold">
                Buyer Enquiries
              </SheetTitle>
              {laptop && (
                <SheetDescription className="text-sm truncate">
                  {laptop.brand} {laptop.model}
                </SheetDescription>
              )}
            </div>
            {laptopContacts.length > 0 && (
              <Badge
                variant="secondary"
                className="shrink-0 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-0 text-xs font-semibold rounded-full px-2.5"
              >
                {laptopContacts.length}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {/* Add Contact Form (collapsible) */}
            <motion.div
              layout
              className="rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 overflow-hidden"
            >
              {/* Toggle button */}
              <button
                onClick={() => setFormOpen(!formOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  <span>Add New Contact</span>
                </div>
                <motion.div
                  animate={{ rotate: formOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="size-4" />
                </motion.div>
              </button>

              {/* Form content */}
              <AnimatePresence>
                {formOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-emerald-200/50 dark:border-emerald-800/50 pt-3">
                      {/* Name (required) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="Buyer's name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="h-9 rounded-lg text-sm"
                        />
                      </div>

                      {/* Phone & Email row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">
                            Phone
                          </label>
                          <Input
                            placeholder="+27 123 456 789"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">
                            Email
                          </label>
                          <Input
                            placeholder="email@example.com"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      {/* Platform */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Platform
                        </label>
                        <Select
                          value={formData.platform}
                          onValueChange={(val) =>
                            setFormData((prev) => ({ ...prev, platform: val }))
                          }
                        >
                          <SelectTrigger className="w-full h-9 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_PLATFORMS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Initial Message */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Initial Message
                        </label>
                        <Textarea
                          placeholder="e.g. 'Is this still available?'"
                          value={formData.message}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          className="min-h-[60px] rounded-lg text-sm resize-none"
                          rows={2}
                        />
                      </div>

                      {/* Submit button */}
                      <Button
                        onClick={handleSubmit}
                        className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2"
                      >
                        <Plus className="size-4" />
                        Add Contact
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Contacts List */}
            {laptopContacts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                  <Users className="size-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  No buyer enquiries yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Tap &quot;Add New Contact&quot; above to track buyer
                  interest
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {laptopContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="shrink-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
      </SheetContent>
    </Sheet>
  );
}
