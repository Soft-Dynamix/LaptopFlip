'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Facebook,
  Loader2,
  Store,
  Users,
  Globe,
  ExternalLink,
  Check,
  AlertCircle,
  Share2,
  WifiOff,
  ClipboardCopy,
  ShoppingBag,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { isLocalMode } from '@/lib/api';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────

type TargetType = 'page' | 'group' | 'marketplace' | 'share' | 'fb_share';

interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  pictureUrl?: string;
  accessToken?: string;
}

interface FacebookGroup {
  id: string;
  name: string;
  privacy?: string;
  pictureUrl?: string;
}

interface FacebookPostDialogProps {
  open: boolean;
  onClose: () => void;
  adTitle: string;
  adBody: string;
  adPrice?: string;
  laptopId?: string;
  listingId?: string;
  defaultTarget?: TargetType;
}

// ─── Helpers ──────────────────────────────────────

/**
 * Open a URL in the system browser.
 * In Capacitor APK, window.open with _system opens the system browser.
 * On web, window.open with _blank works normally.
 */
function openSystemUrl(url: string) {
  const win = window as Record<string, unknown>;
  if (win.Capacitor) {
    // @ts-expect-error — Capacitor _system target
    window.open(url, '_system');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Copy text to clipboard with fallback.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  } catch {
    return false;
  }
}

// ─── Component ────────────────────────────────────

export function FacebookPostDialog({
  open,
  onClose,
  adTitle,
  adBody,
  adPrice,
  laptopId,
  listingId,
  defaultTarget,
}: FacebookPostDialogProps) {
  const [targetType, setTargetType] = useState<TargetType>(defaultTarget || 'share');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [posting, setPosting] = useState(false);
  const [postingStatus, setPostingStatus] = useState<'idle' | 'success'>('idle');
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const offline = typeof window !== 'undefined' && isLocalMode();

  // Build the full share text once
  const shareText = adPrice
    ? `${adTitle}\n${adPrice}\n\n${adBody}`
    : `${adTitle}\n\n${adBody}`;

  // Check connection and fetch targets when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingTargets(true);
      try {
        if (isLocalMode()) {
          try {
            const saved = localStorage.getItem('laptopflip_fb_connection');
            if (saved) {
              const parsed = JSON.parse(saved);
              setIsConnected(!!parsed?.accessToken);
            }
          } catch { /* ignore */ }
          setLoadingTargets(false);
          return;
        }

        const statusRes = await fetch('/api/facebook/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsConnected(statusData.connected);
        }

        const pagesRes = await fetch('/api/facebook/pages');
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          const pagesArr = Array.isArray(pagesData?.pages)
            ? pagesData.pages.map((p: Record<string, unknown>) => ({
                id: String(p.id),
                name: String(p.name || ''),
                category: String(p.category || ''),
                pictureUrl: String(p.picture || p.pictureUrl || ''),
                accessToken: String(p.access_token || ''),
              }))
            : Array.isArray(pagesData)
            ? pagesData.map((p: Record<string, unknown>) => ({
                id: String(p.id),
                name: String(p.name || ''),
                category: String(p.category || ''),
                pictureUrl: String(p.pictureUrl || ''),
                accessToken: String(p.accessToken || ''),
              }))
            : [];
          setPages(pagesArr);
          if (pagesArr.length > 0 && !selectedPageId) {
            setSelectedPageId(pagesArr[0].id);
          }
        }

        const groupsRes = await fetch('/api/facebook/groups');
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const groupsArr = Array.isArray(groupsData)
            ? groupsData.map((g: Record<string, unknown>) => ({
                id: String(g.id),
                name: String(g.name || ''),
                privacy: String(g.privacy || ''),
                pictureUrl: String(g.pictureUrl || ''),
              }))
            : [];
          setGroups(groupsArr);
          if (groupsArr.length > 0 && !selectedGroupId) {
            setSelectedGroupId(groupsArr[0].id);
          }
        }
      } catch {
        setIsConnected(false);
      } finally {
        setLoadingTargets(false);
      }
    };

    fetchData();
  }, [open, selectedPageId, selectedGroupId]);

  useEffect(() => {
    if (defaultTarget) setTargetType(defaultTarget);
  }, [defaultTarget]);

  // ─── Share Methods ───────────────────────────────

  /**
   * Method 1: Native Share API — truly direct, no copy-paste!
   * Opens the Android/iOS share sheet. Pick Facebook, WhatsApp, etc.
   * The text goes DIRECTLY into the chosen app.
   */
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: adTitle,
          text: shareText,
        });
        toast.success('Shared!');
        onClose();
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
    }
    // No native share on this device — fall back to Facebook sharer URL
    handleFacebookSharer();
  }, [adTitle, shareText, onClose]);

  /**
   * Method 2: Facebook Sharer — direct, pre-filled text, just tap "Post"
   * Uses Facebook's own share dialog with the text already filled in.
   */
  const handleFacebookSharer = useCallback(() => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`;
    openSystemUrl(fbUrl);
    toast.success('Facebook opened!', {
      description: 'Your ad text is pre-filled. Just tap "Post".',
      duration: 4000,
    });
    onClose();
  }, [shareText, onClose]);

  /**
   * Method 3: Marketplace — opens Facebook Marketplace new listing page.
   * Unfortunately Facebook doesn't allow pre-filling Marketplace listing fields via URL.
   * We copy the text to clipboard so you can paste it into the description.
   */
  const handleMarketplace = useCallback(async () => {
    const copied = await copyToClipboard(shareText);
    openSystemUrl('https://www.facebook.com/marketplace/create/');
    toast.success(copied ? 'Copied & Marketplace opened!' : 'Marketplace opened!', {
      description: copied
        ? 'Tap the description field and paste your ad text.'
        : 'Copy the ad text from your laptop and paste it in.',
      duration: 6000,
    });
    onClose();
  }, [shareText, onClose]);

  // API-based posting for Page/Group (server mode only)
  const handlePost = async () => {
    if (targetType === 'page' && !selectedPageId) {
      toast.error('Please select a page');
      return;
    }
    if (targetType === 'group' && !selectedGroupId) {
      toast.error('Please select a group');
      return;
    }

    setPosting(true);
    try {
      const selectedPage = pages.find((p) => p.id === selectedPageId);
      const body: Record<string, unknown> = {
        targetType,
        targetId: targetType === 'page' ? selectedPageId : targetType === 'group' ? selectedGroupId : 'marketplace',
        message: adBody,
        ...(targetType === 'page' && selectedPage?.accessToken ? { accessToken: selectedPage.accessToken } : {}),
        ...(laptopId && { laptopId }),
        ...(listingId && { listingId }),
      };

      const res = await fetch('/api/facebook/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Ad posted!', {
          description: data.postUrl ? (
            <a href={data.postUrl} target="_blank" rel="noopener noreferrer" className="text-[#1877F2] underline flex items-center gap-1">
              View post <ExternalLink className="size-3" />
            </a>
          ) : undefined,
          duration: 6000,
        });
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to post. Try again.');
      }
    } catch {
      toast.error('Network error. Check connection and try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    if (!posting) onClose();
  };

  const handleAction = () => {
    switch (targetType) {
      case 'share': handleNativeShare(); break;
      case 'fb_share': handleFacebookSharer(); break;
      case 'marketplace': handleMarketplace(); break;
      case 'page':
      case 'group': handlePost(); break;
    }
  };

  const getButtonLabel = () => {
    if (posting) return 'Posting...';
    if (postingStatus === 'success') return 'Done!';
    switch (targetType) {
      case 'share': return 'Share...';
      case 'fb_share': return 'Open Facebook';
      case 'marketplace': return 'Open Marketplace';
      case 'page': return 'Post to Page';
      case 'group': return 'Post to Group';
      default: return 'Share';
    }
  };

  const getButtonIcon = () => {
    if (posting) return <Loader2 className="size-4 animate-spin" />;
    if (postingStatus === 'success') return <Check className="size-4" />;
    switch (targetType) {
      case 'share': return <Share2 className="size-4" />;
      case 'fb_share': return <Facebook className="size-4" />;
      case 'marketplace': return <ShoppingBag className="size-4" />;
      case 'page':
      case 'group': return <Facebook className="size-4" />;
      default: return <Share2 className="size-4" />;
    }
  };

  const targetOptions: { type: TargetType; label: string; icon: React.ElementType; desc: string; available: boolean; badge?: string }[] = [
    { type: 'share', label: 'Share', icon: Zap, desc: 'Direct to any app — no copy/paste', available: true, badge: 'Best' },
    { type: 'fb_share', label: 'Facebook', icon: Facebook, desc: 'Pre-filled post — just tap Post', available: true },
    { type: 'marketplace', label: 'Marketplace', icon: ShoppingBag, desc: 'List on Marketplace', available: true },
    { type: 'page', label: 'My Page', icon: Store, desc: 'Post to a Page', available: isConnected && !offline },
    { type: 'group', label: 'Group', icon: Users, desc: 'Share to a Group', available: isConnected && !offline },
  ];

  const availableTargets = targetOptions.filter((t) => t.available);
  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
              <Facebook className="size-4 text-white" />
            </div>
            Share to Facebook
          </DialogTitle>
          <DialogDescription>Choose how to share your ad</DialogDescription>
        </DialogHeader>

        {offline && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <WifiOff className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Offline mode — sharing opens external apps
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Target Type Selection */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Share method
            </p>
            <div className="grid grid-cols-3 gap-2">
              {availableTargets.map((opt) => {
                const Icon = opt.icon;
                const isSelected = targetType === opt.type;
                return (
                  <motion.button
                    key={opt.type}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setTargetType(opt.type)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-[#1877F2] bg-[#1877F2]/5 shadow-sm'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Icon className={`size-4 transition-colors ${isSelected ? 'text-[#1877F2]' : 'text-muted-foreground'}`} />
                    <span className={`text-[11px] font-medium text-center leading-tight transition-colors ${isSelected ? 'text-[#1877F2]' : 'text-muted-foreground'}`}>
                      {opt.label}
                    </span>
                    {opt.badge && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <motion.div
                        layoutId="postTargetCheck"
                        className="absolute -top-1 -right-1 size-4 rounded-full bg-[#1877F2] flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        <Check className="size-2.5 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Target info cards */}
          <AnimatePresence mode="wait">
            {targetType === 'share' && (
              <motion.div key="share-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <CardContent className="p-3 flex items-start gap-2">
                    <Zap className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Direct share — no copy & paste!</p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Opens your phone&apos;s share sheet. Pick Facebook, WhatsApp, or any app.
                        Your ad text goes directly into the app.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {targetType === 'fb_share' && (
              <motion.div key="fb-share-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <Card className="bg-[#1877F2]/5 border-[#1877F2]/20 rounded-lg">
                  <CardContent className="p-3 flex items-start gap-2">
                    <MessageSquare className="size-4 text-[#1877F2] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Pre-filled Facebook post</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Opens Facebook with your ad text already filled in. Just tap &quot;Post&quot; — no typing needed.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {targetType === 'marketplace' && (
              <motion.div key="marketplace-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 rounded-lg">
                  <CardContent className="p-3 flex items-start gap-2">
                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Marketplace needs manual paste</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Your ad will be copied to clipboard. Open Marketplace → tap &quot;Sell&quot; → paste into the description.
                        Facebook doesn&apos;t allow pre-filling Marketplace listings.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {targetType === 'page' && (
              <motion.div key="page-selector" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Select Page</p>
                {loadingTargets ? <Skeleton className="h-10 rounded-lg w-full" /> : pages.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No pages found.</p>
                ) : (
                  <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Choose a page" /></SelectTrigger>
                    <SelectContent>
                      {pages.map((page) => (<SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </motion.div>
            )}

            {targetType === 'group' && (
              <motion.div key="group-selector" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Select Group</p>
                {loadingTargets ? <Skeleton className="h-10 rounded-lg w-full" /> : groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No groups found.</p>
                ) : (
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Choose a group" /></SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (<SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Separator />

          {/* Ad Preview */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
            <Card className="rounded-lg overflow-hidden">
              <div className="bg-[#1877F2] px-3 py-2 flex items-center gap-2">
                <Facebook className="size-3.5 text-white" />
                <span className="text-white text-[11px] font-semibold">
                  {targetType === 'share' ? 'Share' : targetType === 'fb_share' ? 'Facebook Post' : targetType === 'page' && selectedPage ? selectedPage.name : targetType === 'group' && selectedGroup ? selectedGroup.name : 'Marketplace'}
                </span>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-semibold truncate">{adTitle}</p>
                {adPrice && <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{adPrice}</p>}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">{adBody}</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleAction}
            disabled={posting || loadingTargets || (targetType === 'page' && !selectedPageId) || (targetType === 'group' && !selectedGroupId)}
            className={cn(
              'w-full h-11 rounded-xl text-white font-semibold gap-2 transition-all',
              targetType === 'share' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#1877F2] hover:bg-[#1565D8]'
            )}
          >
            {getButtonIcon()}
            {getButtonLabel()}
          </Button>

          {/* Copy fallback */}
          <Button
            variant="outline"
            onClick={async () => {
              const copied = await copyToClipboard(shareText);
              if (copied) toast.success('Ad copied to clipboard!');
            }}
            className="w-full h-9 rounded-lg text-xs gap-1.5"
          >
            <ClipboardCopy className="size-3.5" />
            Copy ad text only
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
