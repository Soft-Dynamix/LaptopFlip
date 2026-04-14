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
  Eye,
  Check,
  AlertCircle,
  Share2,
  WifiOff,
  ClipboardCopy,
  ShoppingBag,
  MessageSquare,
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
  // Capacitor detection — use _system target to open in system browser
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
    // Fallback for older browsers / WebView
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
  const [postingStatus, setPostingStatus] = useState<'idle' | 'copying' | 'opening' | 'success' | 'error'>('idle');
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const offline = typeof window !== 'undefined' && isLocalMode();

  // Check connection and fetch targets when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingTargets(true);
      try {
        // In local mode, check localStorage
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

        // Server mode
        const statusRes = await fetch('/api/facebook/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsConnected(statusData.connected);
        }

        // Fetch pages — API returns { success, pages: [...] }
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

        // Fetch groups
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

  // Set default target when prop changes
  useEffect(() => {
    if (defaultTarget) {
      setTargetType(defaultTarget);
    }
  }, [defaultTarget]);

  // ─── Share Methods ───────────────────────────────

  /**
   * Method 1: Native Share API (works on Android, including Capacitor WebView)
   * This is the BEST option for mobile — uses the OS share sheet which includes
   * Facebook, WhatsApp, and all installed sharing apps.
   */
  const handleNativeShare = useCallback(async () => {
    const shareText = adPrice
      ? `${adTitle}\n${adPrice}\n\n${adBody}`
      : `${adTitle}\n\n${adBody}`;

    // Try native share first (Android 6+, modern iOS)
    if (navigator.share) {
      try {
        await navigator.share({
          title: adTitle,
          text: shareText,
        });
        setPostingStatus('success');
        toast.success('Shared successfully!');
        setTimeout(() => {
          setPostingStatus('idle');
          onClose();
        }, 1500);
        return;
      } catch (err) {
        // User cancelled — not an error
        if ((err as DOMException).name === 'AbortError') {
          return;
        }
        // Share failed for another reason — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard + open Facebook share URL
    setPostingStatus('copying');
    const copied = await copyToClipboard(shareText);
    setPostingStatus('opening');

    if (copied) {
      toast.success('Ad copied to clipboard!', {
        description: 'You can paste it in the Facebook window.',
        duration: 4000,
      });
    }

    // Open Facebook share dialog
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareText)}`;
    openSystemUrl(fbShareUrl);

    setPostingStatus('success');
    setTimeout(() => {
      setPostingStatus('idle');
      onClose();
    }, 2000);
  }, [adTitle, adBody, adPrice, onClose]);

  /**
   * Method 2: Share directly to Facebook (uses fb:// or facebook.com URL)
   * Opens Facebook with a pre-filled status/message.
   */
  const handleFacebookDirect = useCallback(async () => {
    const shareText = adPrice
      ? `${adTitle}\n${adPrice}\n\n${adBody}`
      : `${adTitle}\n\n${adBody}`;

    setPostingStatus('copying');

    // Always copy to clipboard first (as backup)
    const copied = await copyToClipboard(shareText);
    setPostingStatus('opening');

    if (copied) {
      toast.success('Ad copied to clipboard!', {
        description: 'Paste it in your Facebook post.',
        duration: 4000,
      });
    }

    // Try Facebook app deep link first, fall back to web
    // The fb:// protocol opens the Facebook app if installed
    const fbUrl = `https://www.facebook.com/`;
    openSystemUrl(fbUrl);

    setPostingStatus('success');
    setTimeout(() => {
      setPostingStatus('idle');
      onClose();
    }, 2000);
  }, [adTitle, adBody, adPrice, onClose]);

  /**
   * Method 3: Share to Facebook Marketplace
   * Opens Facebook Marketplace listing creation page.
   * Copies ad content to clipboard so user can paste it.
   */
  const handleMarketplaceShare = useCallback(async () => {
    const shareText = adPrice
      ? ` selling for ${adPrice}\n\n${adBody}`
      : `\n\n${adBody}`;
    const fullText = `${adTitle}${shareText}`;

    setPostingStatus('copying');
    const copied = await copyToClipboard(fullText);
    setPostingStatus('opening');

    if (copied) {
      toast.success('Ad copied to clipboard!', {
        description: 'Open Marketplace → tap "Sell" → paste the ad text in the description field.',
        duration: 8000,
      });
    } else {
      toast.info('Open Facebook Marketplace and create a new listing.', {
        description: 'You\'ll need to copy the ad text manually.',
        duration: 6000,
      });
    }

    // Open Facebook Marketplace create listing page
    const marketplaceUrl = 'https://www.facebook.com/marketplace/create/';
    openSystemUrl(marketplaceUrl);

    setPostingStatus('success');
    setTimeout(() => {
      setPostingStatus('idle');
      onClose();
    }, 2000);
  }, [adTitle, adBody, adPrice, onClose]);

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
        toast.success('Ad posted to Facebook!', {
          description: data.postUrl ? (
            <a
              href={data.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1877F2] underline flex items-center gap-1"
            >
              View post on Facebook <ExternalLink className="size-3" />
            </a>
          ) : undefined,
          duration: 6000,
        });
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to post. Please try again.');
      }
    } catch {
      toast.error('Network error. Check your connection and try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleClose = () => {
    if (!posting && postingStatus !== 'copying' && postingStatus !== 'opening') {
      onClose();
    }
  };

  const isActionPending = postingStatus === 'copying' || postingStatus === 'opening';

  const targetOptions: { type: TargetType; label: string; icon: React.ElementType; desc: string; available: boolean }[] = [
    { type: 'share', label: 'Share', icon: Share2, desc: 'Share via any app', available: true },
    { type: 'fb_share', label: 'Facebook', icon: Facebook, desc: 'Open Facebook to post', available: true },
    { type: 'marketplace', label: 'Marketplace', icon: ShoppingBag, desc: 'List on Marketplace', available: true },
    { type: 'page', label: 'My Page', icon: Store, desc: 'Post to a Page you manage', available: isConnected && !offline },
    { type: 'group', label: 'Group', icon: Users, desc: 'Share to a Group', available: isConnected && !offline },
  ];

  const availableTargets = targetOptions.filter((t) => t.available);
  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const handleAction = () => {
    switch (targetType) {
      case 'share':
        handleNativeShare();
        break;
      case 'fb_share':
        handleFacebookDirect();
        break;
      case 'marketplace':
        handleMarketplaceShare();
        break;
      case 'page':
      case 'group':
        handlePost();
        break;
    }
  };

  const getActionButtonLabel = () => {
    if (isActionPending) {
      return postingStatus === 'copying' ? 'Copying...' : 'Opening...';
    }
    if (postingStatus === 'success') {
      return 'Done!';
    }
    switch (targetType) {
      case 'share':
        return 'Share via...';
      case 'fb_share':
        return 'Open Facebook';
      case 'marketplace':
        return 'Go to Marketplace';
      case 'page':
        return 'Post to Page';
      case 'group':
        return 'Post to Group';
      default:
        return 'Share';
    }
  };

  const getActionButtonIcon = () => {
    if (isActionPending) return <Loader2 className="size-4 animate-spin" />;
    if (postingStatus === 'success') return <Check className="size-4" />;
    switch (targetType) {
      case 'share':
        return <Share2 className="size-4" />;
      case 'fb_share':
        return <Facebook className="size-4" />;
      case 'marketplace':
        return <ShoppingBag className="size-4" />;
      case 'page':
      case 'group':
        return <Facebook className="size-4" />;
      default:
        return <Share2 className="size-4" />;
    }
  };

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
          <DialogDescription>
            Choose how to share your ad
          </DialogDescription>
        </DialogHeader>

        {/* Offline mode notice */}
        {offline && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <WifiOff className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Offline mode — share opens Facebook app or browser
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
                    onClick={() => {
                      setTargetType(opt.type);
                      setPostingStatus('idle');
                    }}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-[#1877F2] bg-[#1877F2]/5 shadow-sm'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Icon
                      className={`size-4 transition-colors ${
                        isSelected ? 'text-[#1877F2]' : 'text-muted-foreground'
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium transition-colors text-center leading-tight ${
                        isSelected ? 'text-[#1877F2]' : 'text-muted-foreground'
                      }`}
                    >
                      {opt.label}
                    </span>
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
            {availableTargets.length < targetOptions.length && !offline && (
              <p className="text-[10px] text-muted-foreground text-center">
                Connect your Facebook account in Settings to unlock Page & Group posting
              </p>
            )}
          </div>

          {/* Target Selector (for page/group/marketplace) */}
          <AnimatePresence mode="wait">
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
                  <p className="text-xs text-muted-foreground py-2">
                    No pages found. Check your permissions.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Choose a page" />
                      </SelectTrigger>
                      <SelectContent>
                        {pages.map((page) => (
                          <SelectItem key={page.id} value={page.id}>
                            {page.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                      >
                        <Avatar className="size-6">
                          <AvatarImage src={selectedPage.pictureUrl} />
                          <AvatarFallback className="text-[10px] bg-[#1877F2]/10 text-[#1877F2]">
                            {selectedPage.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {selectedPage.category || 'Facebook Page'}
                        </span>
                      </motion.div>
                    )}
                  </div>
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
                  <p className="text-xs text-muted-foreground py-2">
                    No groups found. Check your permissions.
                  </p>
                ) : (
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Choose a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedGroup && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                  >
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {selectedGroup.privacy || 'Group'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {selectedGroup.name}
                    </span>
                  </motion.div>
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
                <Card className="bg-[#1877F2]/5 border-[#1877F2]/20 rounded-lg">
                  <CardContent className="p-3 flex items-start gap-2">
                    <ShoppingBag className="size-4 text-[#1877F2] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Facebook Marketplace</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Your ad will be copied to clipboard and Facebook Marketplace will open.
                        Paste it into the listing description.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {targetType === 'fb_share' && (
              <motion.div
                key="fb-share-info"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-[#1877F2]/5 border-[#1877F2]/20 rounded-lg">
                  <CardContent className="p-3 flex items-start gap-2">
                    <MessageSquare className="size-4 text-[#1877F2] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Post on Facebook</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Ad text will be copied to clipboard and Facebook will open.
                        Create a new post and paste the text.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {targetType === 'share' && (
              <motion.div
                key="share-info"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-[#1877F2]/5 border-[#1877F2]/20 rounded-lg">
                  <CardContent className="p-3 flex items-start gap-2">
                    <Share2 className="size-4 text-[#1877F2] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Share via any app</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Opens the device share sheet. Choose Facebook, WhatsApp, or any other app to share your ad.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Separator />

          {/* Ad Preview */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Preview
            </p>
            <Card className="rounded-lg overflow-hidden">
              <div className="bg-[#1877F2] px-3 py-2 flex items-center gap-2">
                <Facebook className="size-3.5 text-white" />
                <span className="text-white text-[11px] font-semibold">
                  {targetType === 'share'
                    ? 'Share'
                    : targetType === 'fb_share'
                    ? 'Facebook Post'
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
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleAction}
            disabled={posting || isActionPending || loadingTargets || (targetType === 'page' && !selectedPageId) || (targetType === 'group' && !selectedGroupId)}
            className={cn(
              'w-full h-11 rounded-xl text-white font-semibold gap-2 transition-all',
              postingStatus === 'success'
                ? 'bg-emerald-500 hover:bg-emerald-500'
                : 'bg-[#1877F2] hover:bg-[#1565D8]'
            )}
          >
            {getActionButtonIcon()}
            {getActionButtonLabel()}
          </Button>

          {/* Quick copy fallback */}
          {postingStatus === 'idle' && !posting && (
            <Button
              variant="outline"
              onClick={async () => {
                const shareText = adPrice
                  ? `${adTitle}\n${adPrice}\n\n${adBody}`
                  : `${adTitle}\n\n${adBody}`;
                const copied = await copyToClipboard(shareText);
                if (copied) {
                  toast.success('Ad copied to clipboard!');
                }
              }}
              className="w-full h-9 rounded-lg text-xs gap-1.5"
            >
              <ClipboardCopy className="size-3.5" />
              Copy ad text only
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
