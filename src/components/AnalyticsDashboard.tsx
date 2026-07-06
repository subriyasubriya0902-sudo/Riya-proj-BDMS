import { useMemo } from 'react';
import { Users, Heart, CheckCircle2, Clock, Droplet, TrendingUp, Activity, BarChart2 } from 'lucide-react';
import { Profile, BloodRequest, Donation, BLOOD_GROUPS, BloodGroup } from '../lib/supabase';
import { StatCard } from './ui';

interface Props {
  donors: Profile[];
  requests: BloodRequest[];
  donations: Donation[];
}

function BarChart({
  data,
  colorClass = 'bg-blood-500',
  labelClass = 'text-gray-600 dark:text-gray-400',
}: {
  data: { label: string; value: number; subLabel?: string }[];
  colorClass?: string;
  labelClass?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{d.value}</span>
          <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${Math.max((d.value / max) * 112, d.value > 0 ? 4 : 0)}px` }}>
            <div className={`w-full h-full rounded-t-md ${colorClass} opacity-85`} />
          </div>
          <span className={`text-xs font-medium ${labelClass} truncate w-full text-center`}>{d.label}</span>
          {d.subLabel && <span className="text-xs text-green-600 dark:text-green-400">{d.subLabel}</span>}
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const innerR = 32;

  let cumAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const ix1 = cx + innerR * Math.cos(cumAngle - angle);
    const iy1 = cy + innerR * Math.sin(cumAngle - angle);
    const ix2 = cx + innerR * Math.cos(cumAngle);
    const iy2 = cy + innerR * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    return { ...seg, path, angle };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={r - innerR} />
        ) : (
          arcs.map((arc, i) =>
            arc.angle > 0.001 ? (
              <path key={i} d={arc.path} fill={arc.color} className="transition-all duration-500" />
            ) : null
          )
        )}
        <circle cx={cx} cy={cy} r={innerR - 2} className="fill-white dark:fill-gray-900" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-900 dark:fill-white" fontSize="18" fontWeight="700">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-gray-500" fontSize="9">
          total
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: seg.color }} />
            <span className="text-gray-700 dark:text-gray-300">{seg.label}</span>
            <span className="ml-auto font-semibold text-gray-900 dark:text-white tabular-nums">{seg.value}</span>
            <span className="text-gray-400 text-xs w-10 text-right">
              {total > 0 ? `${Math.round((seg.value / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyChart({ donations }: { donations: Donation[] }) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      };
    });
  }, []);

  const data = months.map((m) => {
    const count = donations.filter((d) => {
      const date = new Date(d.donation_date);
      return date.getFullYear() === m.year && date.getMonth() === m.month;
    }).length;
    return { label: m.label, value: count };
  });

  return <BarChart data={data} colorClass="bg-blue-500" />;
}

export function AnalyticsDashboard({ donors, requests, donations }: Props) {
  const totalDonors = donors.length;
  const totalRequests = requests.length;
  const approvedRequests = requests.filter((r) => r.status === 'fulfilled').length;
  const pendingRequests = requests.filter((r) => r.status === 'open').length;
  const cancelledRequests = requests.filter((r) => r.status === 'cancelled').length;
  const availableDonors = donors.filter((d) => d.is_available).length;
  const totalUnits = donations.reduce((s, d) => s + Number(d.units), 0);
  const criticalOpen = requests.filter((r) => r.status === 'open' && r.urgency_level === 'critical').length;

  const bloodStockData: { label: BloodGroup; value: number; subLabel: string }[] = BLOOD_GROUPS.map((g) => ({
    label: g,
    value: donors.filter((d) => d.blood_group === g).length,
    subLabel: `${donors.filter((d) => d.blood_group === g && d.is_available).length} avail`,
  }));

  const requestsByBlood = BLOOD_GROUPS.map((g) => ({
    label: g,
    value: requests.filter((r) => r.blood_group === g).length,
  }));

  const requestStatusSegments = [
    { label: 'Open', value: pendingRequests, color: '#f59e0b' },
    { label: 'Fulfilled', value: approvedRequests, color: '#22c55e' },
    { label: 'Cancelled', value: cancelledRequests, color: '#9ca3af' },
  ];

  const donorAvailSegments = [
    { label: 'Available', value: availableDonors, color: '#22c55e' },
    { label: 'Unavailable', value: totalDonors - availableDonors, color: '#e5e7eb' },
  ];

  const fulfillRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Donors" value={totalDonors} icon={<Users className="h-6 w-6" />} accent="blood" />
        <StatCard label="Total Requests" value={totalRequests} icon={<Heart className="h-6 w-6" />} accent="amber" />
        <StatCard label="Fulfilled Requests" value={approvedRequests} icon={<CheckCircle2 className="h-6 w-6" />} accent="green" />
        <StatCard label="Pending Requests" value={pendingRequests} icon={<Clock className="h-6 w-6" />} accent="blue" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Donors" value={availableDonors} icon={<Activity className="h-6 w-6" />} accent="green" />
        <StatCard label="Total Units Collected" value={totalUnits} icon={<Droplet className="h-6 w-6" />} accent="blue" />
        <StatCard label="Critical Open" value={criticalOpen} icon={<TrendingUp className="h-6 w-6" />} accent="blood" />
        <div className="card p-5 animate-fade-in">
          <p className="text-sm text-gray-500 dark:text-gray-400">Fulfillment Rate</p>
          <p className="mt-1 text-2xl font-bold font-display text-gray-900 dark:text-white">{fulfillRate}%</p>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700"
              style={{ width: `${fulfillRate}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">{approvedRequests} of {totalRequests} requests</p>
        </div>
      </div>

      {/* Blood stock by group */}
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blood-50 dark:bg-blood-900/30">
            <Droplet className="h-4 w-4 text-blood-600 dark:text-blood-400" />
          </div>
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Blood Stock by Blood Group</h2>
          <span className="ml-auto text-sm text-gray-500">{totalDonors} total donors</span>
        </div>
        <BarChart data={bloodStockData} colorClass="bg-blood-500" />
        <p className="mt-3 text-xs text-gray-400">Green sub-labels show currently available donors per group.</p>
      </div>

      {/* Two-column charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request status donut */}
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Heart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Request Status Breakdown</h2>
          </div>
          <DonutChart segments={requestStatusSegments} />
        </div>

        {/* Donor availability donut */}
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Donor Availability</h2>
          </div>
          <DonutChart segments={donorAvailSegments} />
        </div>
      </div>

      {/* Requests by blood group + monthly donations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <BarChart2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Requests by Blood Group</h2>
          </div>
          <BarChart data={requestsByBlood} colorClass="bg-amber-500" />
        </div>

        <div className="card p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-display text-base font-semibold text-gray-900 dark:text-white">Donations — Last 6 Months</h2>
          </div>
          <MonthlyChart donations={donations} />
        </div>
      </div>
    </div>
  );
}
