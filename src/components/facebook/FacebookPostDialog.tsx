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
  WifiOff,
  ClipboardCopy,
  ShoppingBag,
  Zap,
  Send,
  ArrowRight,
  ImageOff,
  ImageIcon,
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
  photos?: string[]; // base64 photo strings
  laptopId?: string;
  listingId?: string;
  defaultTarget?: TargetType;
}

// ─── Multi-post step ─────────────────────────────

interface PostStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: 'pending' | 'active' | 'done' | 'skipped';
  method: 'auto' | 'intent';
  note?: string;
}

// ─── Helpers ──────────────────────────────────────

function openSystemUrl(url: string) {
  const win = window as Record<string, unknown>;
  if (win.Capacitor) {
    // @ts-expect-error — Capacitor _system target
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

/**
 * Convert base64 photo strings to File objects for sharing.
 */
function base64ToFiles(photos: string[]): File[] {
  return photos
    .map((b64, idx) => {
      try {
        // Handle data:image/...;base64,... format
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

/**
 * Check if the browser/Capacitor supports sharing files.
 */
function canShareFiles(): boolean {
  return !!(navigator.share && typeof navigator.canShare === 'function');
}

/**
 * Try to share text + images via the native share sheet (Android Intent).
 * This is the "magic" that sends photos directly to Facebook Marketplace.
 * Returns true if sharing succeeded, false if unavailable.
 */
async function shareWithImages(
  title: string,
  text: string,
  files: File[]
): Promise<boolean> {
  if (!navigator.share) return false;

  try {
    // Try with files first (Android Intent with images)
    if (files.length > 0 && canShareFiles()) {
      const shareData: ShareData = { title, text };

      // Test if we can share with files
      if (navigator.canShare({ files })) {
        shareData.files = files;
        await navigator.share(shareData);
        return true;
      }
    }

    // Fallback: share text only
    await navigator.share({ title, text });
    return true;
  } catch (err) {
    if ((err as DOMException).name === 'AbortError') return true; // User cancelled
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

  // Multi-post everywhere state
  const [isMultiPost, setIsMultiPost] = useState(false);
  const [postSteps, setPostSteps] = useState<PostStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const offline = typeof window !== 'undefined' && isLocalMode();

  const shareText = adPrice
    ? `${adTitle}\n${adPrice}\n\n${adBody}`
    : `${adTitle}\n\n${adBody}`;

  // Prepare image files for sharing
  const imageFiles = photos.length > 0 ? base64ToFiles(photos) : [];
  const hasImages = imageFiles.length > 0;
  const supportsFileShare = canShareFiles() && hasImages;

  // Reset execution guard when dialog opens
  useEffect(() => {
    if (open) {
      isExecutingRef.current = false;
    }
  }, [open]);

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
            : [];
          setPages(pagesArr);
          if (pagesArr.length > 0 && !selectedPageId) setSelectedPageId(pagesArr[0].id);
        }

        const groupsRes = await fetch('/api/facebook/groups');
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const groupsArr = Array.isArray(groupsData) ? groupsData.map((g: Record<string, unknown>) => ({
            id: String(g.id), name: String(g.name || ''), privacy: String(g.privacy || ''), pictureUrl: String(g.pictureUrl || ''),
          })) : [];
          setGroups(groupsArr);
          if (groupsArr.length > 0 && !selectedGroupId) setSelectedGroupId(groupsArr[0].id);
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
   * Native Share with images — the KEY feature.
   * On Android: opens share sheet with photos attached.
   * User picks Facebook → photos go directly into post/Marketplace.
   */
  const handleNativeShare = useCallback(async () => {
    const shared = await shareWithImages(adTitle, shareText, imageFiles);
    if (shared) {
      toast.success('Shared!');
      onClose();
    } else {
      // Fallback: Facebook sharer URL
      handleFacebookSharer();
    }
  }, [adTitle, shareText, imageFiles, onClose]);

  /**
   * Facebook Sharer with pre-filled text.
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
   * Marketplace: Share images + text via intent → Facebook Marketplace
   */
  const handleMarketplace = useCallback(async () => {
    if (supportsFileShare) {
      // Try native share with images → user picks Marketplace
      const shared = await shareWithImages(adTitle, shareText, imageFiles);
      if (shared) {
        toast.success('Shared!');
        onClose();
        return;
      }
    }
    // Fallback: copy + open URL
    const copied = await copyToClipboard(shareText);
    openSystemUrl('https://www.facebook.com/marketplace/create/');
    toast.success(copied ? 'Copied & Marketplace opened!' : 'Marketplace opened!', {
      description: copied ? 'Paste the ad text into the description.' : 'Copy your ad text and paste it.',
      duration: 6000,
    });
    onClose();
  }, [shareText, imageFiles, supportsFileShare, adTitle, onClose]);

  // API posting for Page/Group
  const handlePost = async () => {
    if (targetType === 'page' && !selectedPageId) { toast.error('Select a page'); return; }
    if (targetType === 'group' && !selectedGroupId) { toast.error('Select a group'); return; }

    setPosting(true);
    try {
      const selectedPage = pages.find((p) => p.id === selectedPageId);
      const body: Record<string, unknown> = {
        targetType, targetId: targetType === 'page' ? selectedPageId : selectedGroupId,
        message: adBody,
        ...(targetType === 'page' && selectedPage?.accessToken ? { accessToken: selectedPage.accessToken } : {}),
        ...(laptopId && { laptopId }), ...(listingId && { listingId }),
      };

      const res = await fetch('/api/facebook/post', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
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

  // ─── One-Tap Multi-Post (Post Everywhere) ────────

  const startMultiPost = useCallback(() => {
    const steps: PostStep[] = [];

    // Step 1: Native share (with images if available)
    steps.push({
      id: 'share', label: 'Share to Facebook', icon: Share2,
      status: 'pending', method: 'intent',
      note: hasImages ? `${imageFiles.length} photo(s) attached` : undefined,
    });

    // Step 2: Marketplace
    steps.push({
      id: 'marketplace', label: 'List on Marketplace', icon: ShoppingBag,
      status: 'pending', method: 'intent',
      note: 'Opens Marketplace — paste or share',
    });

    // Step 3: Page posting (if connected)
    if (isConnected && pages.length > 0) {
      steps.push({
        id: 'page', label: `Post to ${pages[0].name}`, icon: Store,
        status: 'pending', method: 'auto',
        note: 'Automatic via API',
      });
    }

    // Step 4: Groups
    if (isConnected && groups.length > 0) {
      steps.push({
        id: 'group', label: `Share to ${groups[0].name}`, icon: Users,
        status: 'pending', method: 'auto',
        note: 'Automatic via API',
      });
    }

    setPostSteps(steps);
    setCurrentStep(0);
    setIsMultiPost(true);
  }, [isConnected, pages, groups, hasImages, imageFiles.length]);

  const executeNextStep = useCallback(async () => {
    if (currentStep >= postSteps.length) {
      // All done!
      isExecutingRef.current = false;
      toast.success('All done! Ad posted everywhere 🎉', { duration: 5000 });
      setIsMultiPost(false);
      onClose();
      return;
    }

    // Prevent duplicate execution
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;

    const step = postSteps[currentStep];
    setPostSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: 'active' } : s));

    switch (step.id) {
      case 'share': {
        const shared = await shareWithImages(adTitle, shareText, imageFiles);
        setPostSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: shared ? 'done' : 'skipped' } : s));
        if (!shared) {
          // If share was cancelled, don't continue
          setPostSteps(prev => prev.map((s, i) => i > currentStep ? { ...s, status: 'skipped' } : s));
          isExecutingRef.current = false;
          setTimeout(() => {
            toast.info('Multi-post stopped. You can retry individual posts.');
            setIsMultiPost(false);
          }, 500);
          return;
        }
        isExecutingRef.current = false;
        setCurrentStep(currentStep + 1);
        break;
      }

      case 'marketplace': {
        if (supportsFileShare) {
          const shared = await shareWithImages(adTitle, shareText, imageFiles);
          setPostSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: shared ? 'done' : 'skipped' } : s));
        } else {
          const copied = await copyToClipboard(shareText);
          openSystemUrl('https://www.facebook.com/marketplace/create/');
          setPostSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: copied ? 'done' : 'skipped' } : s));
          // Wait a moment for user to process
          await new Promise(r => setTimeout(r, 3000));
        }
        isExecutingRef.current = false;
        setCurrentStep(currentStep + 1);
        break;
      }

      case 'page': {
        try {
          const selectedPage = pages[0];
          const res = await fetch('/api/facebook/post', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetType: 'page', targetId: selectedPage.id, message: adBody,
              accessToken: selectedPage.accessToken, laptopId, listingId,
            }),
          });
          const ok = res.ok;
          setPostSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: ok ? 'done' : 'skipped' } : s));
        } catch {
          setPostSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: 'skipped' } : s));
        }
        isExecutingRef.current = false;
        setCurrentStep(currentStep + 1);
        break;
      }

      case 'group': {
        try {
          const selectedGroup = groups[0];
          const res = await fetch('/api/facebook/post', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetType: 'group', targetId: selectedGroup.id, message: adBody,
              laptopId, listingId,
            }),
          });
          const ok = res.ok;
          setPostSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: ok ? 'done' : 'skipped' } : s));
        } catch {
          setPostSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: 'skipped' } : s));
        }
        isExecutingRef.current = false;
        setCurrentStep(currentStep + 1);
        break;
      }
    }
  }, [currentStep, postSteps, adTitle, shareText, imageFiles, supportsFileShare, adBody, laptopId, listingId, pages, groups]);

  // Guard to prevent duplicate step execution
  const isExecutingRef = useRef(false);

  // Auto-advance multi-post steps
  useEffect(() => {
    if (!isMultiPost) return;
    if (isExecutingRef.current) return;
    if (currentStep < postSteps.length) {
      const step = postSteps[currentStep];
      if (step.status === 'pending') {
        // Small delay for UI to update, then start executing
        const timer = setTimeout(() => executeNextStep(), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isMultiPost, currentStep, postSteps, executeNextStep]);

  const handleClose = () => {
    if (isMultiPost) {
      // Allow cancelling multi-post mid-flow
      setIsMultiPost(false);
      isExecutingRef.current = false;
      setPostSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'pending' } : s));
      toast.info('Multi-post cancelled');
      return;
    }
    if (!posting) onClose();
  };

  const handleAction = () => {
    switch (targetType) {
      case 'share': handleNativeShare(); break;
      case 'fb_share': handleFacebookSharer(); break;
      case 'marketplace': handleMarketplace(); break;
      case 'page': case 'group': handlePost(); break;
      case 'everywhere': startMultiPost(); break;
    }
  };

  const getButtonLabel = () => {
    if (posting) return 'Posting...';
    if (isMultiPost) return `Step ${currentStep + 1}/${postSteps.length}...`;
    switch (targetType) {
      case 'share': return hasImages ? 'Share with Photos' : 'Share...';
      case 'fb_share': return 'Open Facebook';
      case 'marketplace': return hasImages ? 'Share to Marketplace' : 'Open Marketplace';
      case 'page': return 'Post to Page';
      case 'group': return 'Post to Group';
      case 'everywhere': return 'Post Everywhere';
      default: return 'Share';
    }
  };

  const getButtonIcon = () => {
    if (posting) return <Loader2 className="size-4 animate-spin" />;
    if (isMultiPost) return <Loader2 className="size-4 animate-spin" />;
    switch (targetType) {
      case 'share': return <Share2 className="size-4" />;
      case 'fb_share': return <Facebook className="size-4" />;
      case 'marketplace': return <ShoppingBag className="size-4" />;
      case 'page': case 'group': return <Facebook className="size-4" />;
      case 'everywhere': return <Send className="size-4" />;
      default: return <Share2 className="size-4" />;
    }
  };

  const targetOptions: { type: TargetType; label: string; icon: React.ElementType; desc: string; available: boolean; badge?: string }[] = [
    { type: 'share', label: 'Share', icon: Share2, desc: 'Direct to any app', available: true, badge: 'Best' },
    { type: 'everywhere', label: 'Everywhere', icon: Send, desc: 'Multi-post to all platforms', available: true, badge: 'New' },
    { type: 'marketplace', label: 'Marketplace', icon: ShoppingBag, desc: 'List on Marketplace', available: true },
    { type: 'page', label: 'My Page', icon: Store, desc: 'Auto-post to Page', available: isConnected && !offline },
    { type: 'group', label: 'Group', icon: Users, desc: 'Auto-post to Group', available: isConnected && !offline },
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
            {isMultiPost ? 'Post Everywhere' : 'Share to Facebook'}
          </DialogTitle>
          <DialogDescription>
            {isMultiPost ? 'Posting your ad to multiple platforms' : 'Choose how to share your ad'}
          </DialogDescription>
        </DialogHeader>

        {/* Photo indicator */}
        {hasImages && !isMultiPost && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
            <ImageIcon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              {imageFiles.length} photo(s) will be attached to your share
            </p>
          </div>
        )}

        {!hasImages && photos.length > 0 && !isMultiPost && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <ImageOff className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Photos couldn&apos;t be loaded — sharing text only
            </p>
          </div>
        )}

        {/* Multi-post progress */}
        {isMultiPost && (
          <div className="space-y-3">
            {postSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'size-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    step.status === 'done' && 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
                    step.status === 'active' && 'bg-[#1877F2] text-white',
                    step.status === 'skipped' && 'bg-muted text-muted-foreground',
                    step.status === 'pending' && 'bg-muted/50 text-muted-foreground/50',
                  )}>
                    {step.status === 'done' ? (
                      <Check className="size-4" />
                    ) : step.status === 'active' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <StepIcon className="size-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      step.status === 'skipped' && 'text-muted-foreground line-through',
                      step.status === 'pending' && 'text-muted-foreground/60',
                    )}>
                      {step.label}
                    </p>
                    {step.note && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{step.note}</p>
                    )}
                  </div>
                  {step.method === 'auto' && step.status === 'pending' && (
                    <Badge variant="secondary" className="text-[9px] h-4">Auto</Badge>
                  )}
                  {step.method === 'intent' && step.status === 'pending' && (
                    <Badge variant="secondary" className="text-[9px] h-4">Manual</Badge>
                  )}
                  {idx < postSteps.length - 1 && step.status !== 'skipped' && (
                    <ArrowRight className="size-3 text-muted-foreground/40 shrink-0" />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {!isMultiPost && (
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
                          ? 'border-[#1877F2] bg-[#1877F2]/5 shadow-sm'
                          : 'border-transparent bg-muted/50 hover:bg-muted',
                        opt.type === 'everywhere' && isSelected && 'border-emerald-500 bg-emerald-500/5',
                      )}
                    >
                      <Icon className={cn(
                        'size-4 transition-colors',
                        isSelected ? (opt.type === 'everywhere' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#1877F2]') : 'text-muted-foreground',
                      )} />
                      <span className={cn(
                        'text-[11px] font-medium text-center leading-tight transition-colors',
                        isSelected ? (opt.type === 'everywhere' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#1877F2]') : 'text-muted-foreground',
                      )}>
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span className={cn(
                          'absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none',
                          opt.badge === 'Best' ? 'bg-emerald-500' : 'bg-amber-500',
                        )}>
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <motion.div
                          layoutId="postTargetCheck"
                          className={cn(
                            'absolute -top-1 -right-1 size-4 rounded-full flex items-center justify-center',
                            opt.type === 'everywhere' ? 'bg-emerald-500' : 'bg-[#1877F2]',
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
                <motion.div key="share-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <Card className={cn(
                    'rounded-lg',
                    hasImages ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-[#1877F2]/5 border-[#1877F2]/20',
                  )}>
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
                <motion.div key="everywhere-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Send className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">One-Tap Multi-Post</p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                            Posts to multiple platforms in sequence. You&apos;ll be prompted for each one.
                          </p>
                        </div>
                      </div>
                      <div className="ml-6 space-y-1">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Check className="size-3 text-emerald-500" />
                          <span>1. Share to Facebook (with photos)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Check className="size-3 text-emerald-500" />
                          <span>2. List on Marketplace</span>
                        </div>
                        {isConnected && pages.length > 0 && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Check className="size-3 text-emerald-500" />
                            <span>3. Auto-post to {pages[0].name}</span>
                          </div>
                        )}
                        {isConnected && groups.length > 0 && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Check className="size-3 text-emerald-500" />
                            <span>4. Auto-post to {groups[0].name}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {targetType === 'marketplace' && (
                <motion.div key="marketplace-info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <Card className={cn(
                    'rounded-lg',
                    hasImages ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
                  )}>
                    <CardContent className="p-3 flex items-start gap-2">
                      <ShoppingBag className={cn(
                        'size-4 mt-0.5 shrink-0',
                        hasImages ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                      )} />
                      <div>
                        <p className={cn(
                          'text-xs font-medium',
                          hasImages ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300',
                        )}>
                          {hasImages ? 'Photos attached — share directly!' : 'Marketplace needs manual paste'}
                        </p>
                        <p className={cn(
                          'text-[10px] mt-0.5',
                          hasImages ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400',
                        )}>
                          {hasImages
                            ? `${imageFiles.length} photo(s) will be sent to Facebook. Select Marketplace in the share sheet.`
                            : 'Your ad will be copied to clipboard. Paste it into the Marketplace description.'}
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
                      <SelectContent>{pages.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
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
                      <SelectContent>{groups.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}</SelectContent>
                    </Select>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Separator />

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
              <Card className="rounded-lg overflow-hidden">
                <div className={cn(
                  'px-3 py-2 flex items-center gap-2',
                  targetType === 'everywhere' ? 'bg-emerald-600' : 'bg-[#1877F2]',
                )}>
                  <Facebook className="size-3.5 text-white" />
                  <span className="text-white text-[11px] font-semibold">
                    {targetType === 'share' ? 'Share' : targetType === 'everywhere' ? 'Multi-Post' : targetType === 'page' && selectedPage ? selectedPage.name : targetType === 'group' && selectedGroup ? selectedGroup.name : 'Marketplace'}
                  </span>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-semibold truncate">{adTitle}</p>
                  {adPrice && <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{adPrice}</p>}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">{adBody}</p>
                  {hasImages && (
                    <div className="flex gap-1.5 mt-2">
                      {imageFiles.slice(0, 4).map((_, i) => (
                        <div key={i} className="size-8 rounded bg-muted/50 flex items-center justify-center">
                          <ImageIcon className="size-3.5 text-muted-foreground/50" />
                        </div>
                      ))}
                      {imageFiles.length > 4 && (
                        <div className="size-8 rounded bg-muted/50 flex items-center justify-center">
                          <span className="text-[9px] text-muted-foreground">+{imageFiles.length - 4}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <Button
              onClick={handleAction}
              disabled={posting || loadingTargets || (targetType === 'page' && !selectedPageId) || (targetType === 'group' && !selectedGroupId)}
              className={cn(
                'w-full h-11 rounded-xl text-white font-semibold gap-2 transition-all',
                targetType === 'everywhere' ? 'bg-emerald-600 hover:bg-emerald-700' :
                targetType === 'share' && hasImages ? 'bg-emerald-600 hover:bg-emerald-700' :
                'bg-[#1877F2] hover:bg-[#1565D8]',
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
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
