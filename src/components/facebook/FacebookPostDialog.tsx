'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  ClipboardCopy,
  ShoppingBag,
  Zap,
  Send,
  ImageIcon,
  ImageOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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

type TargetType = 'page' | 'group' | 'marketplace' | 'share' | 'everywhere';

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
  photos?: string[];
  laptopId?: string;
  listingId?: string;
  defaultTarget?: TargetType;
}

interface PostResult {
  targetId: string;
  label: string;
  type: 'page' | 'group';
  status: 'pending' | 'posting' | 'done' | 'error';
  error?: string;
}

// ─── Helpers ──────────────────────────────────────

function openSystemUrl(url: string) {
  const win = window as Record<string, unknown>;
  if (win.Capacitor) {
    window.open(url, '_system');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

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

function base64ToFiles(photos: string[]): File[] {
  return photos
    .map((b64, idx) => {
      try {
        const matches = b64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches) return null;
        const mime = matches[1];
        const data = atob(matches[2]);
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
        return new File([bytes], `laptop-${idx + 1}.jpg`, { type: mime });
      } catch {
        return null;
      }
    })
    .filter((f): f is File => f !== null);
}

function canShareFiles(): boolean {
  return !!(navigator.share && typeof navigator.canShare === 'function');
}

async function shareWithImages(
  title: string,
  text: string,
  files: File[]
): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    if (files.length > 0 && canShareFiles()) {
      if (navigator.canShare({ files })) {
        await navigator.share({ title, text, files });
        return true;
      }
    }
    await navigator.share({ title, text });
    return true;
  } catch (err) {
    if ((err as DOMException).name === 'AbortError') return true;
    return false;
  }
}

/** Get the stored Facebook access token from localStorage (fallback for APK) */
function getStoredToken(): string {
  try {
    const saved = localStorage.getItem('laptopflip_fb_connection');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed?.accessToken || '';
    }
  } catch {}
  return '';
}

/** Append localStorage token to URL if available */
function withToken(url: string): string {
  const token = getStoredToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

// ─── Component ────────────────────────────────────

export function FacebookPostDialog({
  open,
  onClose,
  adTitle,
  adBody,
  adPrice,
  photos = [],
  laptopId,
  listingId,
  defaultTarget,
}: FacebookPostDialogProps) {
  const [targetType, setTargetType] = useState<TargetType>(defaultTarget || 'share');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [posting, setPosting] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Multi-post state (Post Everywhere)
  const [multiPosting, setMultiPosting] = useState(false);
  const [multiDone, setMultiDone] = useState(false);
  const [multiResults, setMultiResults] = useState<PostResult[]>([]);
  const abortRef = useRef(false);

  const shareText = adPrice
    ? `${adTitle}\n${adPrice}\n\n${adBody}`
    : `${adTitle}\n\n${adBody}`;

  const imageFiles = photos.length > 0 ? base64ToFiles(photos) : [];
  const hasImages = imageFiles.length > 0;
  const supportsFileShare = canShareFiles() && hasImages;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMultiPosting(false);
      setMultiDone(false);
      setMultiResults([]);
      setPosting(false);
      abortRef.current = false;
      setTargetType(defaultTarget || 'share');
    }
  }, [open, defaultTarget]);

  // Fetch connection status and targets — ALWAYS try API first
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingTargets(true);
      try {
        // Always try the API first (works in both web and APK with local server)
        const [statusRes, pagesRes, groupsRes] = await Promise.all([
          fetch(withToken('/api/facebook/status')).catch(() => null),
          fetch(withToken('/api/facebook/pages')).catch(() => null),
          fetch(withToken('/api/facebook/groups')).catch(() => null),
        ]);

        if (statusRes?.ok) {
          const data = await statusRes.json();
          setIsConnected(data.connected);
        }

        if (pagesRes?.ok) {
          const data = await pagesRes.json();
          const pagesArr = Array.isArray(data?.pages)
            ? data.pages.map((p: Record<string, unknown>) => ({
                id: String(p.id),
                name: String(p.name || ''),
                category: String(p.category || ''),
                pictureUrl: String(p.picture || p.pictureUrl || ''),
                accessToken: String(p.access_token || ''),
              }))
            : [];
          setPages(pagesArr);
          if (pagesArr.length > 0 && !selectedPageId) {
            setSelectedPageId(pagesArr[0].id);
          }
        }

        if (groupsRes?.ok) {
          const data = await groupsRes.json();
          const groupsArr = Array.isArray(data)
            ? data.map((g: Record<string, unknown>) => ({
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
        // Fallback: check localStorage
        try {
          const saved = localStorage.getItem('laptopflip_fb_connection');
          if (saved) setIsConnected(!!JSON.parse(saved)?.accessToken);
        } catch { /* ignore */ }
      } finally {
        setLoadingTargets(false);
      }
    };

    fetchData();
  }, [open]);

  // ─── Close handler — ALWAYS closes immediately ───
  const handleClose = useCallback(() => {
    abortRef.current = true;
    onClose();
  }, [onClose]);

  // ─── Share Methods ───────────────────────────────

  const handleNativeShare = useCallback(async () => {
    const shared = await shareWithImages(adTitle, shareText, imageFiles);
    if (shared) {
      toast.success('Shared!');
    } else {
      // Fallback: copy + open FB
      const copied = await copyToClipboard(shareText);
      openSystemUrl(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`);
      toast.info(copied ? 'Text copied & Facebook opened!' : 'Facebook opened!');
    }
    onClose();
  }, [adTitle, shareText, imageFiles, onClose]);

  const handleMarketplace = useCallback(async () => {
    if (supportsFileShare) {
      const shared = await shareWithImages(adTitle, shareText, imageFiles);
      if (shared) {
        toast.success('Shared!');
        onClose();
        return;
      }
    }
    const copied = await copyToClipboard(shareText);
    openSystemUrl('https://www.facebook.com/marketplace/create/');
    toast.success(copied ? 'Copied & Marketplace opened!' : 'Marketplace opened!', {
      description: copied ? 'Paste the ad text into the description.' : 'Copy your ad text and paste it.',
      duration: 6000,
    });
    onClose();
  }, [shareText, imageFiles, supportsFileShare, adTitle, onClose]);

  // API post for single page/group
  const handlePost = async () => {
    if (targetType === 'page' && !selectedPageId) { toast.error('Select a page'); return; }
    if (targetType === 'group' && !selectedGroupId) { toast.error('Select a group'); return; }

    setPosting(true);
    try {
      const selectedPage = pages.find((p) => p.id === selectedPageId);
      const userToken = getStoredToken();
      const body: Record<string, unknown> = {
        targetType,
        targetId: targetType === 'page' ? selectedPageId : selectedGroupId,
        message: adBody,
        ...(targetType === 'page' && selectedPage?.accessToken ? { accessToken: selectedPage.accessToken } : {}),
        ...(targetType === 'group' && userToken ? { userAccessToken: userToken } : {}),
        ...(laptopId && { laptopId }),
        ...(listingId && { listingId }),
      };

      const res = await fetch('/api/facebook/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success('Posted!');
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to post.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setPosting(false);
    }
  };

  // ─── Post Everywhere — API only, NO share sheets ───

  const startPostEverywhere = async () => {
    const targets: { id: string; type: 'page' | 'group'; label: string; accessToken?: string }[] = [
      ...pages.map((p) => ({ id: p.id, type: 'page' as const, label: p.name, accessToken: p.accessToken })),
      ...groups.map((g) => ({ id: g.id, type: 'group' as const, label: g.name })),
    ];

    if (targets.length === 0) {
      toast.error('Connect your Facebook account first to post automatically.', {
        description: 'Go to Settings → Connect Facebook',
        duration: 5000,
      });
      return;
    }

    setMultiPosting(true);
    setMultiDone(false);
    abortRef.current = false;
    setMultiResults(
      targets.map((t) => ({
        targetId: t.id,
        label: t.label,
        type: t.type,
        status: 'pending' as const,
      }))
    );

    const userToken = getStoredToken();

    // Post to ALL targets in parallel — fast, non-blocking
    const results = await Promise.allSettled(
      targets.map(async (target, idx) => {
        if (abortRef.current) return false;

        // Mark as posting
        setMultiResults((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, status: 'posting' as const } : r))
        );

        try {
          const res = await fetch('/api/facebook/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetType: target.type,
              targetId: target.id,
              message: adBody,
              ...(target.accessToken ? { accessToken: target.accessToken } : {}),
              ...(userToken && target.type === 'group' ? { userAccessToken: userToken } : {}),
              ...(laptopId ? { laptopId } : {}),
              ...(listingId ? { listingId } : {}),
            }),
          });

          if (abortRef.current) return false;

          if (res.ok) {
            setMultiResults((prev) =>
              prev.map((r, i) => (i === idx ? { ...r, status: 'done' as const } : r))
            );
            return true;
          } else {
            const data = await res.json().catch(() => ({}));
            setMultiResults((prev) =>
              prev.map((r, i) => (i === idx ? { ...r, status: 'error' as const, error: data.error || 'Failed' } : r))
            );
            return false;
          }
        } catch {
          if (abortRef.current) return false;
          setMultiResults((prev) =>
            prev.map((r, i) => (i === idx ? { ...r, status: 'error' as const, error: 'Network error' } : r))
          );
          return false;
        }
      })
    );

    if (abortRef.current) return;

    setMultiPosting(false);
    setMultiDone(true);
    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    toast.success(`Posted to ${succeeded}/${targets.length} targets!`, { duration: 4000 });
  };

  const handleAction = () => {
    switch (targetType) {
      case 'share':
        handleNativeShare();
        break;
      case 'marketplace':
        handleMarketplace();
        break;
      case 'page':
      case 'group':
        handlePost();
        break;
      case 'everywhere':
        startPostEverywhere();
        break;
    }
  };

  const getButtonLabel = () => {
    if (posting) return 'Posting...';
    if (multiPosting) return 'Posting...';
    switch (targetType) {
      case 'share': return hasImages ? 'Share with Photos' : 'Share...';
      case 'marketplace': return hasImages ? 'Share to Marketplace' : 'Open Marketplace';
      case 'page': return 'Post to Page';
      case 'group': return 'Post to Group';
      case 'everywhere': return isConnected && (pages.length > 0 || groups.length > 0) ? 'Post Everywhere' : 'Connect First';
      default: return 'Share';
    }
  };

  const getButtonIcon = () => {
    if (posting || multiPosting) return <Loader2 className="size-4 animate-spin" />;
    switch (targetType) {
      case 'share': return <Share2 className="size-4" />;
      case 'marketplace': return <ShoppingBag className="size-4" />;
      case 'page': case 'group': return <Facebook className="size-4" />;
      case 'everywhere': return <Send className="size-4" />;
      default: return <Share2 className="size-4" />;
    }
  };

  const targetOptions: {
    type: TargetType;
    label: string;
    icon: React.ElementType;
    desc: string;
    available: boolean;
    badge?: string;
  }[] = [
    { type: 'everywhere', label: 'Everywhere', icon: Send, desc: 'Auto-post to all', available: true, badge: 'Auto' },
    { type: 'share', label: 'Share', icon: Share2, desc: 'Direct to any app', available: true, badge: 'Best' },
    { type: 'marketplace', label: 'Marketplace', icon: ShoppingBag, desc: 'List on FB', available: true },
    { type: 'page', label: 'My Page', icon: Store, desc: 'Auto-post', available: isConnected && pages.length > 0 },
    { type: 'group', label: 'Group', icon: Users, desc: 'Auto-post', available: isConnected && groups.length > 0 },
  ];

  const availableTargets = targetOptions.filter((t) => t.available);
  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const autoTargetsCount = pages.length + groups.length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
              <Facebook className="size-4 text-white" />
            </div>
            {multiPosting || multiDone ? 'Post Everywhere' : 'Share to Facebook'}
          </DialogTitle>
          <DialogDescription>
            {multiPosting
              ? 'Posting your ad to all platforms...'
              : multiDone
              ? 'Posting complete!'
              : 'Choose how to share your ad'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {/* Photo indicator */}
          {hasImages && !multiPosting && !multiDone && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
              <ImageIcon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {imageFiles.length} photo(s) ready to share
              </p>
            </div>
          )}

          {!hasImages && photos.length > 0 && !multiPosting && !multiDone && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              <ImageOff className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Photos couldn&apos;t be loaded
              </p>
            </div>
          )}

          {/* ─── Multi-post results view ─── */}
          {(multiPosting || multiDone) && (
            <div className="space-y-3">
              {multiResults.map((result, idx) => (
                <motion.div
                  key={result.targetId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={cn(
                      'size-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                      result.status === 'done' && 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                      result.status === 'posting' && 'bg-[#1877F2] text-white',
                      result.status === 'error' && 'bg-red-100 dark:bg-red-900/40 text-red-500',
                      result.status === 'pending' && 'bg-muted text-muted-foreground/50'
                    )}
                  >
                    {result.status === 'done' ? (
                      <Check className="size-4" />
                    ) : result.status === 'posting' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : result.status === 'error' ? (
                      <AlertCircle className="size-4" />
                    ) : (
                      <div className="size-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        result.status === 'error' && 'text-red-600 dark:text-red-400',
                        result.status === 'pending' && 'text-muted-foreground/60'
                      )}
                    >
                      {result.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {result.status === 'done' && 'Posted successfully'}
                      {result.status === 'posting' && 'Posting...'}
                      {result.status === 'error' && result.error}
                      {result.status === 'pending' && 'Waiting...'}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[9px] h-4 shrink-0',
                      result.status === 'done' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                      result.status === 'error' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    )}
                  >
                    {result.type}
                  </Badge>
                </motion.div>
              ))}

              {/* Done actions */}
              {multiDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pt-2"
                >
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Check className="size-5 text-emerald-500" />
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      All done! Ad posted to {multiResults.filter(r => r.status === 'done').length}/{multiResults.length} targets
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="w-full h-10 rounded-xl gap-2"
                  >
                    <X className="size-4" />
                    Close
                  </Button>

                  <Button
                    variant="outline"
                    onClick={async () => {
                      const shared = await shareWithImages(adTitle, shareText, imageFiles);
                      if (!shared) {
                        const copied = await copyToClipboard(shareText);
                        toast.info(copied ? 'Text copied!' : 'Share cancelled');
                      }
                    }}
                    className="w-full h-10 rounded-xl gap-2"
                  >
                    <Share2 className="size-4" />
                    Share manually too
                  </Button>
                </motion.div>
              )}

              {/* Cancel during posting */}
              {multiPosting && (
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="w-full h-10 rounded-xl gap-2"
                >
                  <X className="size-4" />
                  Close (posting continues in background)
                </Button>
              )}
            </div>
          )}

          {/* ─── Normal view (target selection) ─── */}
          {!multiPosting && !multiDone && (
            <div className="space-y-4">
              {/* Target Selection */}
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
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200',
                          isSelected
                            ? opt.type === 'everywhere'
                              ? 'border-emerald-500 bg-emerald-500/5 shadow-sm'
                              : 'border-[#1877F2] bg-[#1877F2]/5 shadow-sm'
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4 transition-colors',
                            isSelected
                              ? opt.type === 'everywhere'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[#1877F2]'
                              : 'text-muted-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[11px] font-medium text-center leading-tight transition-colors',
                            isSelected
                              ? opt.type === 'everywhere'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[#1877F2]'
                              : 'text-muted-foreground'
                          )}
                        >
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            className={cn(
                              'absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none',
                              opt.badge === 'Best' ? 'bg-emerald-500' : opt.badge === 'Auto' ? 'bg-violet-500' : 'bg-amber-500'
                            )}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <motion.div
                            layoutId="postTargetCheck"
                            className={cn(
                              'absolute -top-1 -right-1 size-4 rounded-full flex items-center justify-center',
                              opt.type === 'everywhere' ? 'bg-emerald-500' : 'bg-[#1877F2]'
                            )}
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

              {/* Info cards */}
              <AnimatePresence mode="wait">
                {targetType === 'share' && (
                  <motion.div
                    key="share-info"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={cn(
                        'rounded-lg',
                        hasImages
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-[#1877F2]/5 border-[#1877F2]/20'
                      )}
                    >
                      <CardContent className="p-3 flex items-start gap-2">
                        {hasImages ? (
                          <>
                            <Zap className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                                Share with photos — no copy/paste!
                              </p>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                                Your {imageFiles.length} photo(s) + ad text go directly into the app you pick.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Share2 className="size-4 text-[#1877F2] mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium">Direct share to any app</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Opens share sheet. Pick Facebook, WhatsApp, or any app.
                              </p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {targetType === 'everywhere' && (
                  <motion.div
                    key="everywhere-info"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isConnected && autoTargetsCount > 0 ? (
                      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <Send className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                                Auto-post to {autoTargetsCount} target{autoTargetsCount > 1 ? 's' : ''}
                              </p>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                                Posts instantly to your pages and groups via API
                              </p>
                            </div>
                          </div>
                          <div className="ml-6 space-y-1">
                            {pages.map((p) => (
                              <div key={p.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Check className="size-3 text-emerald-500" />
                                <span>{p.name} (Page)</span>
                              </div>
                            ))}
                            {groups.map((g) => (
                              <div key={g.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Check className="size-3 text-emerald-500" />
                                <span>{g.name} (Group)</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 rounded-lg">
                        <CardContent className="p-3 flex items-start gap-2">
                          <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                              Connect Facebook first
                            </p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                              Go to Settings and connect your Facebook account to auto-post to pages and groups.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )}

                {targetType === 'marketplace' && (
                  <motion.div
                    key="marketplace-info"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={cn(
                        'rounded-lg',
                        hasImages
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      )}
                    >
                      <CardContent className="p-3 flex items-start gap-2">
                        <ShoppingBag
                          className={cn(
                            'size-4 mt-0.5 shrink-0',
                            hasImages ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          )}
                        />
                        <div>
                          <p
                            className={cn(
                              'text-xs font-medium',
                              hasImages ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                            )}
                          >
                            {hasImages ? 'Photos attached — share directly!' : 'Marketplace needs manual paste'}
                          </p>
                          <p
                            className={cn(
                              'text-[10px] mt-0.5',
                              hasImages ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                            )}
                          >
                            {hasImages
                              ? `${imageFiles.length} photo(s) will be sent. Select Marketplace in the share sheet.`
                              : 'Your ad will be copied to clipboard. Paste it into the Marketplace description.'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {targetType === 'page' && (
                  <motion.div
                    key="page-selector"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    <p className="text-xs font-medium text-muted-foreground">Select Page</p>
                    {loadingTargets ? (
                      <Skeleton className="h-10 rounded-lg w-full" />
                    ) : pages.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No pages found.</p>
                    ) : (
                      <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Choose a page" />
                        </SelectTrigger>
                        <SelectContent>
                          {pages.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </motion.div>
                )}

                {targetType === 'group' && (
                  <motion.div
                    key="group-selector"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    <p className="text-xs font-medium text-muted-foreground">Select Group</p>
                    {loadingTargets ? (
                      <Skeleton className="h-10 rounded-lg w-full" />
                    ) : groups.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No groups found.</p>
                    ) : (
                      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger className="rounded-lg">
                          <SelectValue placeholder="Choose a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <Separator />

              {/* Preview */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Preview
                </p>
                <Card className="rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      'px-3 py-2 flex items-center gap-2',
                      targetType === 'everywhere' ? 'bg-emerald-600' : 'bg-[#1877F2]'
                    )}
                  >
                    <Facebook className="size-3.5 text-white" />
                    <span className="text-white text-[11px] font-semibold">
                      {targetType === 'share'
                        ? 'Share'
                        : targetType === 'everywhere'
                        ? `Multi-Post (${autoTargetsCount})`
                        : targetType === 'page' && selectedPage
                        ? selectedPage.name
                        : targetType === 'group' && selectedGroup
                        ? selectedGroup.name
                        : 'Marketplace'}
                    </span>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold truncate">{adTitle}</p>
                    {adPrice && (
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {adPrice}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                      {adBody}
                    </p>
                    {hasImages && (
                      <div className="flex gap-1.5 mt-2">
                        {imageFiles.slice(0, 4).map((_, i) => (
                          <div
                            key={i}
                            className="size-8 rounded bg-muted/50 flex items-center justify-center"
                          >
                            <ImageIcon className="size-3.5 text-muted-foreground/50" />
                          </div>
                        ))}
                        {imageFiles.length > 4 && (
                          <div className="size-8 rounded bg-muted/50 flex items-center justify-center">
                            <span className="text-[9px] text-muted-foreground">
                              +{imageFiles.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleAction}
                disabled={
                  posting ||
                  loadingTargets ||
                  (targetType === 'page' && !selectedPageId) ||
                  (targetType === 'group' && !selectedGroupId)
                }
                className={cn(
                  'w-full h-11 rounded-xl text-white font-semibold gap-2 transition-all',
                  targetType === 'everywhere'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : targetType === 'share' && hasImages
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#1877F2] hover:bg-[#1565D8]'
                )}
              >
                {getButtonIcon()}
                {getButtonLabel()}
              </Button>

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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
