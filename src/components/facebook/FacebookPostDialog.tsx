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
} from 'lucide-react';
import { toast } from 'sonner';

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

type TargetType = 'page' | 'group' | 'marketplace';

interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  pictureUrl?: string;
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
  const [targetType, setTargetType] = useState<TargetType>(defaultTarget || 'page');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [postToTimeline, setPostToTimeline] = useState(false);
  const [trackEngagement, setTrackEngagement] = useState(true);
  const [posting, setPosting] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check connection and fetch targets when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingTargets(true);
      try {
        // Check status
        const statusRes = await fetch('/api/facebook/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsConnected(statusData.connected);
        }

        // Fetch pages
        const pagesRes = await fetch('/api/facebook/pages');
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          const pagesArr = Array.isArray(pagesData) ? pagesData : [];
          setPages(pagesArr);
          if (pagesArr.length > 0 && !selectedPageId) {
            setSelectedPageId(pagesArr[0].id);
          }
        }

        // Fetch groups
        const groupsRes = await fetch('/api/facebook/groups');
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const groupsArr = Array.isArray(groupsData) ? groupsData : [];
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
      const body: Record<string, unknown> = {
        targetType,
        targetId: targetType === 'page' ? selectedPageId : targetType === 'group' ? selectedGroupId : 'marketplace',
        message: adBody,
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

  const targetOptions: { type: TargetType; label: string; icon: React.ElementType; desc: string }[] = [
    { type: 'page', label: 'My Page', icon: Store, desc: 'Post to a Facebook Page you manage' },
    { type: 'group', label: 'Group', icon: Users, desc: 'Share to a Facebook Group' },
    { type: 'marketplace', label: 'Marketplace', icon: Globe, desc: 'List on Facebook Marketplace' },
  ];

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
            Post to Facebook
          </DialogTitle>
          <DialogDescription>
            Choose where to publish your ad
          </DialogDescription>
        </DialogHeader>

        {!isConnected && !loadingTargets ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-dashed rounded-xl">
              <CardContent className="p-4 text-center space-y-2">
                <AlertCircle className="size-8 text-amber-500 mx-auto" />
                <p className="text-sm font-medium">Facebook Not Connected</p>
                <p className="text-xs text-muted-foreground">
                  Go to Settings → Facebook Integration to connect your account first.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Target Type Selection */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Post to
              </p>
              <div className="grid grid-cols-3 gap-2">
                {targetOptions.map((opt) => {
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
            </div>

            {/* Target Selector */}
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
                    {targetType === 'page' && selectedPage ? selectedPage.name : targetType === 'group' && selectedGroup ? selectedGroup.name : 'Facebook Marketplace'}
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

            {/* Options */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Options
              </p>

              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={postToTimeline}
                    onChange={(e) => setPostToTimeline(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="size-4 rounded border-2 border-muted-foreground/30 peer-checked:bg-[#1877F2] peer-checked:border-[#1877F2] transition-colors flex items-center justify-center">
                    <Check className="size-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Also post to my timeline</p>
                  <p className="text-[10px] text-muted-foreground">
                    Share this post on your personal profile
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={trackEngagement}
                    onChange={(e) => setTrackEngagement(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="size-4 rounded border-2 border-muted-foreground/30 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                    <Check className="size-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Track engagement</p>
                  <p className="text-[10px] text-muted-foreground">
                    Requires page insights permission
                  </p>
                </div>
              </label>
            </div>

            {/* Post Button */}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
