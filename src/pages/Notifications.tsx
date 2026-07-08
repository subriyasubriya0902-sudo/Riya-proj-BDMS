import { BellOff, CheckCheck, Trash2, AlertTriangle, Heart, Info } from 'lucide-react';
import { useNotifications } from '../lib/notifications';
import { EmptyState } from '../components/ui';

export function Notifications() {
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } = useNotifications();

  const iconFor = (type: string, title: string) => {
    if (type === 'sos' || title.toLowerCase().includes('critical'))
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (type === 'request') return <Heart className="h-5 w-5 text-blood-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : "You're all caught up"}
          </p>
        </div>
        {notifications.length > 0 && (
          <button onClick={markAllRead} className="btn-secondary">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="card p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff className="h-6 w-6" />}
            title="No notifications"
            subtitle="Emergency requests and SOS alerts will appear here in real time."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                  n.is_read
                    ? 'border-gray-100 dark:border-gray-800'
                    : 'border-blood-200 bg-blood-50/50 dark:border-blood-800 dark:bg-blood-900/10'
                }`}
              >
                <div className="mt-0.5">{iconFor(n.type, n.title)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">{n.title}</p>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-blood-500 flex-shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="btn-ghost h-8 w-8 !p-0"
                      title="Mark read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    className="btn-ghost h-8 w-8 !p-0 text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
