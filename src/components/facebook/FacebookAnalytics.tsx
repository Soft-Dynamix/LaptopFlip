'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Facebook,
  Eye,
  BarChart3,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Filter,
  AlertCircle,
  ArrowUpRight,
  MousePointerClick,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// ─── Types ────────────────────────────────────────

interface FacebookPost {
  id: string;
  adTitle: string;
  targetType: 'page' | 'group' | 'marketplace';
  targetName: string;
  postedAt: string;
  postUrl?: string;
  status: 'posted' | 'failed' | 'pending';
  stats: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

interface FacebookInsights {
  totalPosts: number;
  totalReach: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
}

type FilterTab = 'all' | 'page' | 'group' | 'marketplace';

// ─── Animation variants ───────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ─── Component ────────────────────────────────────

export function FacebookAnalytics() {
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [insights, setInsights] = useState<FacebookInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [postsRes, insightsRes] = await Promise.allSettled([
        fetch('/api/facebook/posts'),
        fetch('/api/facebook/insights'),
      ]);

      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        const data = await postsRes.value.json();
        setPosts(Array.isArray(data) ? data : []);
      }

      if (insightsRes.status === 'fulfilled' && insightsRes.value.ok) {
        const data = await insightsRes.value.json();
        setInsights(data);
      }
    } catch {
      toast.error('Failed to fetch Facebook analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
    toast.success('Refreshing insights...');
  };

  // Filtered posts
  const filteredPosts = posts.filter((post) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'page') return post.targetType === 'page';
    if (activeFilter === 'group') return post.targetType === 'group';
    if (activeFilter === 'marketplace') return post.targetType === 'marketplace';
    return true;
  });

  // Compute engagement rate
  const engagementRate =
    insights && insights.totalReach > 0
      ? (((insights.totalLikes + insights.totalComments + insights.totalShares) /
          insights.totalReach) *
          100).toFixed(1)
      : '0.0';

  // ─── Loading Skeletons ──────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── No Data ────────────────────────────────────
  if (!insights && posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-dashed rounded-xl">
          <CardContent className="p-8 text-center space-y-3">
            <div className="size-16 rounded-2xl bg-[#1877F2]/10 flex items-center justify-center mx-auto">
              <BarChart3 className="size-8 text-[#1877F2]/50" />
            </div>
            <div>
              <p className="text-sm font-semibold">No Facebook Data Yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your Facebook account and start posting ads to see analytics here.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── Summary Cards ──────────────────────────────

  const summaryCards = [
    {
      label: 'Total Posts',
      value: insights?.totalPosts ?? posts.length,
      icon: ImageIcon,
      color: 'text-[#1877F2]',
      bg: 'bg-[#1877F2]/10',
      gradient: 'from-[#1877F2]/20 to-[#1877F2]/5',
    },
    {
      label: 'Total Reach',
      value: insights?.totalReach ?? 0,
      icon: Eye,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      label: 'Impressions',
      value: insights?.totalImpressions ?? 0,
      icon: MousePointerClick,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/30',
      gradient: 'from-violet-500/20 to-violet-500/5',
    },
    {
      label: 'Engagement',
      value: `${engagementRate}%`,
      icon: TrendingUp,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      gradient: 'from-amber-500/20 to-amber-500/5',
    },
  ];

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'page', label: 'Pages' },
    { key: 'group', label: 'Groups' },
    { key: 'marketplace', label: 'Marketplace' },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
            <Facebook className="size-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Facebook Ad Performance</h2>
            <p className="text-[10px] text-muted-foreground">Track your social selling metrics</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item}>
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="min-w-[140px] flex-1"
                >
                  <Card className={`rounded-xl border overflow-hidden bg-gradient-to-br ${card.gradient}`}>
                    <CardContent className="p-3">
                      <div className={`size-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                        <Icon className={`size-4 ${card.color}`} />
                      </div>
                      <p className="text-lg font-bold tracking-tight">
                        {typeof card.value === 'number' ? formatCompactNumber(card.value) : card.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{card.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1" />
        </ScrollArea>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={item}>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count =
              tab.key === 'all'
                ? posts.length
                : posts.filter((p) => p.targetType === tab.key).length;

            return (
              <motion.button
                key={tab.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveFilter(tab.key)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="analyticsFilter"
                    className="absolute inset-0 bg-[#1877F2] rounded-md"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`relative z-10 text-[9px] h-4 px-1.5 ${
                      isActive ? 'bg-white/20 text-white border-0' : ''
                    }`}
                  >
                    {count}
                  </Badge>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Posts List */}
      <motion.div variants={item} className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredPosts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <Card className="border-dashed rounded-xl">
                <CardContent className="p-6 text-center">
                  <Filter className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No posts found
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeFilter !== 'all'
                      ? `No ${activeFilter} posts yet. Try a different filter.`
                      : 'Start posting ads to see performance data here.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-xl border hover:shadow-sm transition-shadow overflow-hidden">
                  <CardContent className="p-3 space-y-2.5">
                    {/* Top row: title + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{post.adTitle}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            {post.targetType === 'page' && 'Page'}
                            {post.targetType === 'group' && 'Group'}
                            {post.targetType === 'marketplace' && 'Marketplace'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {post.targetName}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={post.status} />
                    </div>

                    {/* Date */}
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(post.postedAt)}
                    </p>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-1">
                      <StatPill icon={MousePointerClick} value={formatCompactNumber(post.stats.impressions)} label="Views" />
                      <StatPill icon={Eye} value={formatCompactNumber(post.stats.reach)} label="Reach" />
                      <StatPill icon={Heart} value={formatCompactNumber(post.stats.likes)} label="Likes" />
                      <StatPill icon={MessageCircle} value={formatCompactNumber(post.stats.comments)} label="Comments" />
                    </div>

                    {/* Shares + View link */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Share2 className="size-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatCompactNumber(post.stats.shares)} shares
                        </span>
                      </div>
                      {post.postUrl && (
                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-[#1877F2] hover:underline"
                        >
                          View on Facebook
                          <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-components ──────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    posted: {
      label: 'Posted',
      className: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-0',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-0',
    },
    pending: {
      label: 'Pending',
      className: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-0',
    },
  };

  const c = config[status] || config.pending;

  return (
    <Badge className={`text-[9px] h-5 px-1.5 ${c.className}`}>
      {status === 'posted' && <CheckCircle className="size-2.5 mr-0.5" />}
      {status === 'failed' && <AlertCircle className="size-2.5 mr-0.5" />}
      {status === 'pending' && <Loader className="size-2.5 mr-0.5" />}
      {c.label}
    </Badge>
  );
}

function StatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
      <Icon className="size-3 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold leading-tight">{value}</p>
        <p className="text-[8px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function Loader({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
