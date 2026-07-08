import {
  createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode,
} from 'react';
import { Heart, AlertTriangle, Info, Bell, X, CheckCheck } from 'lucide-react';
import { supabase, Notification } from './supabase';
import { useAuth } from './auth';

// ---------------------------------------------------------------------------
// Notification sound via Web Audio API — no external dependency
// ---------------------------------------------------------------------------
function playNotificationSound(urgency: 'critical' | 'normal' = 'normal') {
  try {
    const ctx = new AudioContext();
    const freqs = urgency === 'critical' ? [880, 1100, 880] : [660, 880];
    let t = ctx.currentTime;
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.18);
      t += 0.15;
    });
    // Close context after sounds finish
    setTimeout(() => ctx.close(), (freqs.length * 150) + 300);
  } catch {
    // Web Audio not available — silently skip
  }
}

// ---------------------------------------------------------------------------
// Rich notification toast displayed on arrival
// ---------------------------------------------------------------------------
interface NotifToast {
  id: string;
  notification: Notification;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  bellRef: React.RefObject<HTMLButtonElement | null>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<NotifToast[]>([]);
  const [bellAnimating, setBellAnimating] = useState(false);
  const bellRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    setNotifications((data as Notification[]) ?? []);
  }, [user]);

  // Dismiss a toast after a timeout
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle incoming real-time notification
  const onIncoming = useCallback((notif: Notification) => {
    // Add to list at top
    setNotifications((prev) => {
      const exists = prev.some((n) => n.id === notif.id);
      return exists ? prev : [notif, ...prev];
    });

    // Play sound
    const urgency = notif.type === 'sos' || notif.title.toLowerCase().includes('critical')
      ? 'critical'
      : 'normal';
    playNotificationSound(urgency);

    // Animate bell
    setBellAnimating(true);
    setTimeout(() => setBellAnimating(false), 1200);

    // Show toast popup
    const toastId = `${notif.id}-${Date.now()}`;
    setToasts((prev) => [...prev, { id: toastId, notification: notif }]);
    setTimeout(() => dismissToast(toastId), 6000);
  }, [dismissToast]);

  // Realtime subscription (Supabase Realtime uses WebSocket internally)
  useEffect(() => {
    if (!user) return;
    load();

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          onIncoming(payload.new as Notification);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load, onIncoming]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [user]);

  const remove = useCallback(async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, load, markRead, markAllRead, remove, bellRef }}
    >
      {children}

      {/* Bell animation style injected once */}
      <style>{`
        @keyframes bell-ring {
          0%  { transform: rotate(0deg); }
          15% { transform: rotate(20deg); }
          30% { transform: rotate(-18deg); }
          45% { transform: rotate(14deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(6deg); }
          90% { transform: rotate(-3deg); }
          100%{ transform: rotate(0deg); }
        }
        .bell-ring { animation: bell-ring 0.8s ease-in-out; }

        @keyframes notif-toast-in {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .notif-toast-in { animation: notif-toast-in 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>

      {/* Bell ring trigger — patches the button via ref */}
      {bellAnimating && (
        <BellRingTrigger bellRef={bellRef} />
      )}

      {/* Rich notification toasts */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '360px' }}>
        {toasts.map((t) => (
          <NotifToastCard
            key={t.id}
            toast={t}
            onDismiss={dismissToast}
            onMarkRead={markRead}
          />
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

// Forces bell icon class to animate without prop-drilling into Layout's internal DOM
function BellRingTrigger({ bellRef }: { bellRef: React.RefObject<HTMLButtonElement | null> }) {
  useEffect(() => {
    const el = bellRef.current;
    if (!el) return;
    const svg = el.querySelector('svg');
    if (!svg) return;
    svg.classList.remove('bell-ring');
    void svg.offsetWidth; // reflow to restart animation
    svg.classList.add('bell-ring');
    const tid = setTimeout(() => svg.classList.remove('bell-ring'), 1000);
    return () => clearTimeout(tid);
  }, [bellRef]);
  return null;
}

// ---------------------------------------------------------------------------
// Toast card component
// ---------------------------------------------------------------------------
function NotifToastCard({
  toast,
  onDismiss,
  onMarkRead,
}: {
  toast: NotifToast;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => Promise<void>;
}) {
  const n = toast.notification;

  const isCritical = n.type === 'sos' || n.title.toLowerCase().includes('critical');
  const isRequest = n.type === 'request';

  const borderColor = isCritical
    ? 'border-red-400 dark:border-red-600'
    : isRequest
    ? 'border-blood-300 dark:border-blood-700'
    : 'border-blue-300 dark:border-blue-700';

  const iconBg = isCritical
    ? 'bg-red-100 dark:bg-red-900/40 text-red-600'
    : isRequest
    ? 'bg-blood-100 dark:bg-blood-900/40 text-blood-600'
    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600';

  const Icon = isCritical ? AlertTriangle : isRequest ? Heart : Info;

  return (
    <div
      className={`notif-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 bg-white px-4 py-3 shadow-xl dark:bg-gray-900 ${borderColor}`}
    >
      <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Bell className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">New notification</p>
        </div>
        <p className="mt-0.5 font-semibold text-sm text-gray-900 dark:text-white leading-tight">{n.title}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
        <button
          onClick={() => { onMarkRead(n.id); onDismiss(toast.id); }}
          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-blood-600 hover:text-blood-700 dark:text-blood-400"
        >
          <CheckCheck className="h-3 w-3" /> Mark read
        </button>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
