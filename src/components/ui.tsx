import { BloodGroup, CAN_RECEIVE_FROM } from '../lib/supabase';

export function BloodDrop({ group, size = 'md' }: { group: BloodGroup; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-8 w-8 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg' }[size];
  return (
    <div
      className={`${dims} relative flex items-center justify-center rounded-full bg-gradient-to-br from-blood-500 to-blood-700 text-white font-bold shadow-md`}
    >
      {group}
    </div>
  );
}

export function AvailabilityBadge({ available }: { available: boolean }) {
  return available ? (
    <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Available
    </span>
  ) : (
    <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Unavailable
    </span>
  );
}

export function CompatibilityInfo({ group }: { group: BloodGroup }) {
  const canReceive = CAN_RECEIVE_FROM[group];
  return (
    <div className="flex flex-wrap gap-1.5">
      {canReceive.map((g) => (
        <span key={g} className="badge bg-blood-50 text-blood-700 dark:bg-blood-900/30 dark:text-blood-300">
          {g}
        </span>
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = 'blood',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'blood' | 'green' | 'blue' | 'amber';
}) {
  const colors = {
    blood: 'from-blood-500 to-blood-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
  }[accent];
  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold font-display text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colors} text-white shadow-md`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
        {icon}
      </div>
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${w} w-full card p-6 animate-fade-in max-h-[90vh] overflow-y-auto`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
