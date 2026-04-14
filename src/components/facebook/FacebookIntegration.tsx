'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Facebook,
  CheckCircle2,
  Eye,
  Users,
  Store,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Unplug,
  ExternalLink,
  Shield,
  Loader2,
  AlertCircle,
  Globe,
  Image as ImageIcon,
  LogIn,
  WifiOff,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isLocalMode } from '@/lib/api';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ─── Types ────────────────────────────────────────

interface FacebookConnectionStatus {
  connected: boolean;
  user?: {
    id: string;
    name: string;
    pictureUrl?: string;
    connectedAt: string;
  };
  connection?: {
    id: string;
    facebookUserId: string;
    facebookName: string;
    facebookEmail: string;
    profilePicUrl: string;
    tokenExpiresAt: string;
    connectedAt: string;
    isTokenValid: boolean;
    stats?: {
      uniquePages: number;
      uniqueGroups: number;
      totalPosts: number;
    };
  };
}

interface FacebookPage {
  id: string;
  name: string;
  category: string;
  pictureUrl?: string;
  accessToken?: string;
}

interface FacebookGroup {
  id: string;
  name: string;
  privacy: string;
  memberCount: number;
  pictureUrl?: string;
}

interface FacebookQuickStats {
  totalPosts: number;
  totalReach: number;
  totalImpressions: number;
}

type ConnectState = 'idle' | 'connecting' | 'success' | 'error';

// ─── Animation variants ───────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Feature list for connect card ────────────────

const FEATURES = [
  {
    icon: Store,
    title: 'Post to Facebook Pages',
    desc: 'Publish ads directly to your business pages',
  },
  {
    icon: Users,
    title: 'Share to Groups',
    desc: 'Instantly share listings in relevant groups',
  },
  {
    icon: Globe,
    title: 'Facebook Marketplace',
    desc: 'List items on the largest social marketplace',
  },
  {
    icon: BarChart3,
    title: 'Track Performance',
    desc: 'Monitor reach, impressions & engagement',
  },
];

const TOKEN_STEPS = [
  'Go to developers.facebook.com/tools/explorer/',
  'Select your app or create a test app',
  'Select "User access token"',
  'Add permissions: pages_manage_posts, pages_read_engagement, publish_to_groups, groups_access_member_info',
  'Generate token and paste it below',
];

// ─── Component ────────────────────────────────────

export function FacebookIntegration({ onConnectedChange }: { onConnectedChange?: (connected: boolean) => void }) {
  const [status, setStatus] = useState<FacebookConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [connectState, setConnectState] = useState<ConnectState>('idle');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showTokenGuide, setShowTokenGuide] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [quickStats, setQuickStats] = useState<FacebookQuickStats | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [nextAuthConnecting, setNextAuthConnecting] = useState(false);

  const isOffline = typeof window !== 'undefined' && isLocalMode();

  // Check if Facebook App is properly configured (not placeholder)
  const isFacebookAppConfigured =
    typeof window !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID &&
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID !== 'your_facebook_app_id_here';

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    try {
      // In local mode (APK), check localStorage for saved connection
      if (isLocalMode()) {
        try {
          const saved = localStorage.getItem('laptopflip_fb_connection');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.accessToken) {
              setStatus({
                connected: true,
                user: {
                  id: parsed.facebookUserId || '',
                  name: parsed.facebookName || 'Facebook User',
                  pictureUrl: parsed.profilePicUrl || '',
                  connectedAt: parsed.connectedAt || new Date().toISOString(),
                },
              });
              setLoading(false);
              return;
            }
          }
        } catch {
          // localStorage not available or corrupt data
        }
        setStatus({ connected: false });
        setLoading(false);
        return;
      }

      const res = await fetch('/api/facebook/status');
      if (res.ok) {
        const data = await res.json();
        // Map API response to component interface
        if (data.connected && data.connection) {
          setStatus({
            connected: true,
            user: {
              id: data.connection.facebookUserId || data.connection.id || '',
              name: data.connection.facebookName || 'Facebook User',
              pictureUrl: data.connection.profilePicUrl || '',
              connectedAt: data.connection.connectedAt || data.connection.createdAt || '',
            },
          });
        } else {
          setStatus({ connected: false });
        }
      } else {
        setStatus({ connected: false });
      }
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  // Notify parent of connection status changes
  useEffect(() => {
    if (onConnectedChange && !loading) {
      onConnectedChange(status?.connected ?? false);
    }
  }, [status?.connected, loading, onConnectedChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Fetch pages when connected
  const fetchPages = useCallback(async () => {
    if (isLocalMode()) return; // No server in local mode
    setPagesLoading(true);
    try {
      const res = await fetch('/api/facebook/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Failed to fetch Facebook Pages');
    } finally {
      setPagesLoading(false);
    }
  }, []);

  // Fetch groups when connected
  const fetchGroups = useCallback(async () => {
    if (isLocalMode()) return; // No server in local mode
    setGroupsLoading(true);
    try {
      const res = await fetch('/api/facebook/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Failed to fetch Facebook Groups');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  // Fetch quick stats
  const fetchStats = useCallback(async () => {
    if (isLocalMode()) return; // No server in local mode
    try {
      const res = await fetch('/api/facebook/insights');
      if (res.ok) {
        const data = await res.json();
        setQuickStats(data);
      }
    } catch {
      // silently fail for stats
    }
  }, []);

  // When connected, load pages, groups, stats
  useEffect(() => {
    if (status?.connected) {
      fetchPages();
      fetchGroups();
      fetchStats();
    }
  }, [status?.connected, fetchPages, fetchGroups, fetchStats]);

  // NextAuth Facebook Sign-In
  const handleNextAuthSignIn = () => {
    if (!isFacebookAppConfigured) {
      toast.error('Facebook App not configured', {
        description: 'Set NEXT_PUBLIC_FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env to enable OAuth login. Use manual token entry below.',
        duration: 6000,
      });
      return;
    }
    setNextAuthConnecting(true);
    try {
      sessionStorage.setItem('fb_connect_pending', '1');
    } catch {
      // sessionStorage may not be available
    }
    window.location.href = `/api/auth/signin/facebook?callbackUrl=${encodeURIComponent(window.location.origin + '/?fb_callback=1')}`;
  };

  // ─── Connect with manual token (MAIN FIX) ───────
  const handleConnect = async () => {
    const trimmedToken = tokenInput.trim();

    // Validate token before sending
    if (!trimmedToken) {
      setConnectError('Please enter an access token');
      return;
    }

    // Basic validation: Facebook tokens are long strings (no spaces)
    if (trimmedToken.includes(' ')) {
      setConnectError('Token should not contain spaces. Make sure you copied the full token without any extra characters.');
      return;
    }

    if (trimmedToken.length < 20) {
      setConnectError('Token seems too short. Facebook access tokens are typically 100+ characters long.');
      return;
    }

    setConnectState('connecting');
    setConnectError(null);

    try {
      // In local mode (APK), save token to localStorage directly
      if (isLocalMode()) {
        // Simulate a brief delay for UX feedback
        await new Promise((r) => setTimeout(r, 800));

        const connectionData = {
          accessToken: trimmedToken,
          facebookUserId: 'local_user',
          facebookName: 'Local User',
          facebookEmail: '',
          profilePicUrl: '',
          isTokenValid: true,
          connectedAt: new Date().toISOString(),
          isLocalMode: true,
        };
        localStorage.setItem('laptopflip_fb_connection', JSON.stringify(connectionData));
        setStatus({
          connected: true,
          user: {
            id: connectionData.facebookUserId,
            name: connectionData.facebookName,
            pictureUrl: connectionData.profilePicUrl,
            connectedAt: connectionData.connectedAt,
          },
        });
        setTokenInput('');
        setConnectState('success');
        toast.success('Facebook token saved locally!', {
          description: 'Token stored on this device.',
          duration: 5000,
        });
        // Reset state after showing success
        setTimeout(() => setConnectState('idle'), 2000);
        return;
      }

      // Server mode: call API with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/facebook/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: trimmedToken }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        setTokenInput('');
        setConnectState('success');

        if (data.isLongLived) {
          toast.success('Facebook connected! Token valid for 60 days.', {
            description: `Connected as ${data.connection?.facebookName || 'Facebook User'}`,
            duration: 5000,
          });
        } else {
          toast.success('Facebook connected!', {
            description: 'Short-lived token saved (~2 hours). Configure App Secret for 60-day tokens.',
            duration: 7000,
          });
        }

        await fetchStatus();
        setTimeout(() => setConnectState('idle'), 2000);
      } else {
        // Parse error from server
        let errorMsg = 'Failed to connect';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;

          // Provide more helpful error messages
          if (res.status === 401) {
            errorMsg = 'Invalid or expired token. Please generate a fresh token from Facebook Graph Explorer.';
          }
        } catch {
          errorMsg = `Server error (${res.status}). Please try again.`;
        }

        setConnectError(errorMsg);
        setConnectState('error');
        toast.error('Connection failed', {
          description: errorMsg,
          duration: 8000,
        });
        // Keep error visible, user can dismiss by typing a new token
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setConnectError('Connection timed out. Check your internet connection and try again.');
        toast.error('Connection timed out', { duration: 5000 });
      } else {
        setConnectError('Network error. Please check your connection and try again.');
        toast.error('Network error', { duration: 5000 });
      }
      setConnectState('error');
    } finally {
      // Don't reset to idle on error — keep the error state visible
      if (connectState !== 'error') {
        // Will be reset by success timeout
      }
    }
  };

  // Clear error when user types a new token
  const handleTokenChange = (value: string) => {
    setTokenInput(value);
    if (connectState === 'error') {
      setConnectState('idle');
      setConnectError(null);
    }
  };

  // Retry handler
  const handleRetry = () => {
    setConnectState('idle');
    setConnectError(null);
  };

  // Disconnect
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      // In local mode, clear localStorage
      if (isLocalMode()) {
        localStorage.removeItem('laptopflip_fb_connection');
        toast.success('Facebook token removed from this device');
        setStatus({ connected: false });
        if (onConnectedChange) onConnectedChange(false);
        setPages([]);
        setGroups([]);
        setQuickStats(null);
        setDisconnecting(false);
        setShowDisconnectDialog(false);
        return;
      }

      const res = await fetch('/api/facebook/disconnect', { method: 'POST' });
      if (res.ok) {
        toast.success('Facebook account disconnected');
        setStatus({ connected: false });
        if (onConnectedChange) onConnectedChange(false);
        setPages([]);
        setGroups([]);
        setQuickStats(null);
      } else {
        toast.error('Failed to disconnect');
      }
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  // ─── Loading state ─────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  // ─── Not Connected ─────────────────────────────
  if (!status?.connected) {
    const isConnecting = connectState === 'connecting';
    const isSuccess = connectState === 'success';
    const isError = connectState === 'error';

    return (
      <motion.div variants={container} initial="hidden" animate="show">
        {/* Connect Card */}
        <motion.div variants={item}>
          <Card className="rounded-xl border shadow-sm overflow-hidden">
            {/* Facebook gradient header */}
            <div className="bg-gradient-to-br from-[#1877F2] to-[#0C5DC7] px-5 py-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Facebook className="size-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Connect Your Facebook Account</h3>
                  <p className="text-sm text-blue-100 mt-0.5">
                    Supercharge your laptop sales
                  </p>
                </div>
              </div>

              {/* Features grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {FEATURES.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <motion.div
                      key={feat.title}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-start gap-2.5"
                    >
                      <Icon className="size-4 mt-0.5 text-blue-200 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold leading-tight">{feat.title}</p>
                        <p className="text-[10px] text-blue-200 mt-0.5 leading-snug">
                          {feat.desc}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Offline mode banner */}
              {isOffline && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <WifiOff className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Offline mode — token will be saved locally on this device
                  </p>
                </div>
              )}

              {/* Primary: NextAuth Facebook Login */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <LogIn className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Facebook Login</p>
                </div>

                <Button
                  onClick={handleNextAuthSignIn}
                  disabled={nextAuthConnecting || isConnecting}
                  className={cn(
                    'w-full h-11 rounded-lg gap-2.5 text-sm font-semibold shadow-md',
                    isFacebookAppConfigured
                      ? 'bg-[#1877F2] hover:bg-[#1565D8] text-white shadow-[#1877F2]/20'
                      : 'bg-muted text-muted-foreground shadow-none border border-dashed border-muted-foreground/30 cursor-pointer'
                  )}
                >
                  {nextAuthConnecting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      {isFacebookAppConfigured ? 'Sign in with Facebook' : 'Sign in with Facebook'}
                    </>
                  )}
                </Button>
                <p className={cn(
                  'text-[10px] text-center leading-relaxed',
                  isFacebookAppConfigured
                    ? 'text-muted-foreground'
                    : 'text-amber-600 dark:text-amber-400'
                )}>
                  {isFacebookAppConfigured
                    ? 'Uses secure OAuth. Your credentials never touch our servers.'
                    : '⚠ Facebook App not configured. Click for setup instructions.'
                  }
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">or</span>
                <Separator className="flex-1" />
              </div>

              {/* Manual Token Entry (fallback) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Manual Token Entry</p>
                </div>

                {/* Token input + Connect button */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Paste your access token..."
                      className={cn(
                        'rounded-lg text-sm h-11 pr-8',
                        isError && 'border-red-300 dark:border-red-700 focus-visible:ring-red-300',
                        isSuccess && 'border-emerald-300 dark:border-emerald-700 focus-visible:ring-emerald-300'
                      )}
                      value={tokenInput}
                      onChange={(e) => handleTokenChange(e.target.value)}
                      type="password"
                      disabled={isConnecting}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isConnecting && tokenInput.trim()) {
                          handleConnect();
                        }
                      }}
                    />
                    {/* Clear button */}
                    {tokenInput && !isConnecting && (
                      <button
                        onClick={() => {
                          setTokenInput('');
                          setConnectState('idle');
                          setConnectError(null);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-full bg-muted hover:bg-muted-foreground/10 flex items-center justify-center transition-colors"
                      >
                        <X className="size-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={isError ? handleRetry : handleConnect}
                    disabled={isConnecting || (!tokenInput.trim() && !isError)}
                    className={cn(
                      'h-11 rounded-lg text-white px-5 text-sm font-semibold transition-all duration-300 min-w-[90px]',
                      isConnecting
                        ? 'bg-[#1877F2]/80 cursor-wait'
                        : isSuccess
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : isError
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-[#1877F2] hover:bg-[#1565D8]'
                    )}
                  >
                    {isConnecting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="size-4" />
                      </motion.div>
                    ) : isSuccess ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <Check className="size-5" />
                      </motion.div>
                    ) : isError ? (
                      'Retry'
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>

                {/* Inline error message */}
                <AnimatePresence>
                  {connectError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                        <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed flex-1">
                          {connectError}
                        </p>
                        <button
                          onClick={() => {
                            setConnectError(null);
                            setConnectState('idle');
                          }}
                          className="shrink-0 mt-0.5"
                        >
                          <X className="size-3.5 text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success message */}
                <AnimatePresence>
                  {isSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5">
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                          Connected successfully!
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Token guide */}
                <Collapsible open={showTokenGuide} onOpenChange={setShowTokenGuide}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs text-[#1877F2] hover:underline">
                      {showTokenGuide ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                      How to get your access token
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 bg-muted/50 rounded-lg p-3 space-y-2"
                    >
                      {TOKEN_STEPS.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="size-5 rounded-full bg-[#1877F2] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step}
                          </p>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          window.open(
                            'https://developers.facebook.com/tools/explorer/',
                            '_blank'
                          );
                        }}
                        className="flex items-center gap-1.5 text-xs text-[#1877F2] hover:underline mt-1"
                      >
                        <ExternalLink className="size-3" />
                        Open Facebook Graph Explorer
                      </button>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // ─── Connected State ───────────────────────────
  const user = status.user;
  const connectedDate = user?.connectedAt
    ? new Date(user.connectedAt).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* Connected Account Card */}
      <motion.div variants={item}>
        <Card className="rounded-xl border shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#1877F2] via-[#42A5F5] to-[#1877F2]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 ring-2 ring-[#1877F2]/20">
                  <AvatarImage src={user?.pictureUrl} alt={user?.name} />
                  <AvatarFallback className="bg-[#1877F2]/10 text-[#1877F2] font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{user?.name || 'Facebook User'}</p>
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] gap-1">
                      <CheckCircle2 className="size-3" />
                      Connected
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ID: {user?.id || 'N/A'} · Connected on {connectedDate}
                  </p>
                </div>
              </div>
              <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 px-2"
                  >
                    <Unplug className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Facebook?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your Facebook connection. You won&apos;t be able to post
                      ads or track performance until you reconnect.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      {quickStats && (
        <motion.div variants={item}>
          <div className="grid grid-cols-3 gap-2">
            <StatMiniCard
              icon={ImageIcon}
              label="Posts"
              value={quickStats.totalPosts.toString()}
              color="text-[#1877F2]"
              bg="bg-[#1877F2]/10"
            />
            <StatMiniCard
              icon={Eye}
              label="Reach"
              value={formatCompactNumber(quickStats.totalReach)}
              color="text-emerald-600 dark:text-emerald-400"
              bg="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <StatMiniCard
              icon={BarChart3}
              label="Views"
              value={formatCompactNumber(quickStats.totalImpressions)}
              color="text-violet-600 dark:text-violet-400"
              bg="bg-violet-100 dark:bg-violet-900/30"
            />
          </div>
        </motion.div>
      )}

      {/* Connected Pages */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Store className="size-4 text-[#1877F2]" />
            Pages
            <Badge variant="secondary" className="text-[10px]">
              {pages.length}
            </Badge>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={fetchPages}
            disabled={pagesLoading}
          >
            <RefreshCw className={`size-3 ${pagesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {pagesLoading && pages.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : pages.length === 0 ? (
          <Card className="rounded-lg border-dashed">
            <CardContent className="p-4 text-center">
              <Store className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No pages found</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Make sure you have pages_manage_posts permission
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {pages.map((page) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="rounded-lg border hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={page.pictureUrl} alt={page.name} />
                        <AvatarFallback className="bg-[#1877F2]/10 text-[#1877F2] text-xs font-bold">
                          {page.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{page.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {page.category}
                        </p>
                      </div>
                      <Badge className="bg-[#1877F2]/10 text-[#1877F2] border-0 text-[10px] shrink-0">
                        Post Here
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Connected Groups */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="size-4 text-[#1877F2]" />
            Groups
            <Badge variant="secondary" className="text-[10px]">
              {groups.length}
            </Badge>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={fetchGroups}
            disabled={groupsLoading}
          >
            <RefreshCw className={`size-3 ${groupsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {groupsLoading && groups.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : groups.length === 0 ? (
          <Card className="rounded-lg border-dashed">
            <CardContent className="p-4 text-center">
              <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No groups found</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Make sure you have publish_to_groups permission
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {groups.map((group) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="rounded-lg border hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={group.pictureUrl} alt={group.name} />
                        <AvatarFallback className="bg-[#1877F2]/10 text-[#1877F2] text-xs font-bold">
                          {group.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5"
                          >
                            {group.privacy}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {group.memberCount.toLocaleString()} members
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-components ──────────────────────────────

function StatMiniCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <Card className="rounded-lg border">
      <CardContent className="p-3 text-center">
        <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-1.5`}>
          <Icon className={`size-4 ${color}`} />
        </div>
        <p className="text-base font-bold tracking-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}
