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

type TargetType = 'page' | 'group' | 'marketplace' | 'share';

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
  laptopId?: string;
  listingId?: string;
  defaultTarget?: TargetType;
}

// ─── Component ────────────────────────────────────

export function FacebookPostDialog({
  open,
  onClose,
  adTitle,
  adBody,
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
  const [shareStatus, setShareStatus] = useState<'idle' | 'success'>('idle');

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

  // Share via Facebook URL (works everywhere, no API needed)
  const handleShareUrl = useCallback(() => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(adBody)}`;
    window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
    setShareStatus('success');
    toast.success('Facebook share dialog opened!', {
      description: 'Complete the share in the Facebook window that opened.',
      duration: 5000,
    });
    setTimeout(() => {
      setShareStatus('idle');
      onClose();
    }, 2000);
  }, [adBody, onClose]);

  // Share via Web Share API (mobile native share)
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: adTitle,
          text: adBody,
        });
        toast.success('Shared successfully!');
        onClose();
      } catch (err) {
        // User cancelled — not an error
        if ((err as DOMException).name !== 'AbortError') {
          handleShareUrl();
        }
      }
    } else {
      handleShareUrl();
    }
  }, [adTitle, adBody, onClose, handleShareUrl]);

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
    if (!posting) {
      onClose();
    }
  };

  const targetOptions: { type: TargetType; label: string; icon: React.ElementType; desc: string; available: boolean }[] = [
    { type: 'share', label: 'Share', icon: Share2, desc: 'Open Facebook share dialog', available: true },
    { type: 'page', label: 'My Page', icon: Store, desc: 'Post to a Page you manage', available: isConnected && !offline },
    { type: 'group', label: 'Group', icon: Users, desc: 'Share to a Group', available: isConnected && !offline },
    { type: 'marketplace', label: 'Marketplace', icon: Globe, desc: 'List on Marketplace', available: isConnected && !offline },
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
          <DialogDescription>
            Choose how to share your ad
          </DialogDescription>
        </DialogHeader>

        {/* Offline mode notice */}
        {offline && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <WifiOff className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Offline mode — use Share to post via Facebook app
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Target Type Selection */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Share method
            </p>
            <div className={`grid gap-2 ${availableTargets.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
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
                    <Icon
                      className={`size-4 transition-colors ${
                        isSelected ? 'text-[#1877F2]' : 'text-muted-foreground'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium transition-colors ${
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
                Connect your Facebook account in Settings to unlock Page, Group & Marketplace posting
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
                    <Globe className="size-4 text-[#1877F2] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Facebook Marketplace</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Your ad will be listed on Marketplace. Facebook may review it before
                        publishing.
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
                      <p className="text-xs font-medium">Share via Facebook</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Opens Facebook&apos;s share dialog. Works with any Facebook account — no special permissions needed.
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
                    ? 'Facebook Share'
                    : targetType === 'page' && selectedPage
                    ? selectedPage.name
                    : targetType === 'group' && selectedGroup
                    ? selectedGroup.name
                    : 'Facebook Marketplace'}
                </span>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-semibold truncate">{adTitle}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                  {adBody}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          {targetType === 'share' ? (
            <Button
              onClick={shareStatus === 'idle' ? handleNativeShare : undefined}
              disabled={shareStatus === 'success'}
              className={cn(
                'w-full h-11 rounded-xl text-white font-semibold gap-2 transition-all',
                shareStatus === 'success'
                  ? 'bg-emerald-500 hover:bg-emerald-500'
                  : 'bg-[#1877F2] hover:bg-[#1565D8]'
              )}
            >
              {shareStatus === 'success' ? (
                <>
                  <Check className="size-4" />
                  Share dialog opened!
                </>
              ) : (
                <>
                  <Share2 className="size-4" />
                  Share to Facebook
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handlePost}
              disabled={posting || loadingTargets || (targetType === 'page' && !selectedPageId) || (targetType === 'group' && !selectedGroupId)}
              className="w-full h-11 rounded-xl bg-[#1877F2] hover:bg-[#1565D8] text-white font-semibold gap-2"
            >
              {posting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Facebook className="size-4" />
                  Post to {targetType === 'page' ? 'Page' : targetType === 'group' ? 'Group' : 'Marketplace'}
                </>
              )}
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
