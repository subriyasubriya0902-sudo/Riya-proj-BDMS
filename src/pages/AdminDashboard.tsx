import { useState, useEffect, useCallback } from 'react';
import {
  Users, Droplet, Heart, AlertTriangle, Search, Plus, Phone, MapPin, Send, X,
  CheckCircle2, Shield, Activity, Building2, Filter, Bell, Clock, Zap, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import {
  supabase, Profile, BloodRequest, Donation, BLOOD_GROUPS, BloodGroup,
  distanceKm, CAN_RECEIVE_FROM, UrgencyLevel,
} from '../lib/supabase';
import { StatCard, BloodDrop, AvailabilityBadge, EmptyState, Modal } from '../components/ui';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';

type Tab = 'overview' | 'analytics' | 'donors' | 'requests' | 'create';

const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical — Immediate', color: 'text-red-600' },
  { value: 'urgent', label: 'Urgent — Within hours', color: 'text-amber-600' },
  { value: 'normal', label: 'Normal — Scheduled', color: 'text-green-600' },
];

export function AdminDashboard() {
  const { profile } = useAuth();
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [donors, setDonors] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);

  // Donor filters
  const [search, setSearch] = useState('');
  const [bloodFilter, setBloodFilter] = useState<BloodGroup | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [availFilter, setAvailFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // Request approval workflow
  const [reqStatusFilter, setReqStatusFilter] = useState<'pending' | 'open' | 'fulfilled' | 'cancelled' | 'all'>('all');
  const [rejectTarget, setRejectTarget] = useState<BloodRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create request form
  const [createOpen, setCreateOpen] = useState(false);
  const [newReq, setNewReq] = useState({
    blood_group: 'O+' as BloodGroup,
    hospital_name: '',
    hospital_location: '',
    contact_name: '',
    contact_phone: '',
    units_required: 1,
    urgency_level: 'urgent' as UrgencyLevel,
    radius_km: 10,
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    const [dRes, rRes, donRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('blood_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('donations').select('*').order('donation_date', { ascending: false }),
    ]);
    if (dRes.data) setDonors(dRes.data as Profile[]);
    if (rRes.data) setRequests(rRes.data as BloodRequest[]);
    if (donRes.data) setDonations(donRes.data as Donation[]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!profile) return null;

  // --- Filters ---
  const filteredDonors = donors.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      d.full_name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      (d.address ?? '').toLowerCase().includes(q);
    const matchBlood = bloodFilter === 'all' || d.blood_group === bloodFilter;
    const matchLoc = !locationFilter || (d.address ?? '').toLowerCase().includes(locationFilter.toLowerCase());
    const matchAvail = availFilter === 'all' ||
      (availFilter === 'available' ? d.is_available : !d.is_available);
    return matchSearch && matchBlood && matchLoc && matchAvail;
  });

  // --- Stats ---
  const availableDonors = donors.filter((d) => d.is_available).length;
  const openRequests = requests.filter((r) => r.status === 'open').length;
  const pendingRequests = requests.filter((r) => r.status === 'pending').length;
  const criticalRequests = requests.filter((r) => r.status === 'open' && r.urgency_level === 'critical').length;
  const totalUnits = donations.reduce((s, d) => s + Number(d.units), 0);
  const totalDonations = donations.length;
  const fulfilledRequests = requests.filter((r) => r.status === 'fulfilled').length;

  // --- Location detect ---
  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewReq((r) => ({ ...r, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        notify('Hospital location detected', 'success');
      },
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Location permission denied. Enter hospital coordinates manually.'
          : 'Could not detect location. Enter hospital coordinates manually.';
        notify(msg, 'error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const applyManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) { notify('Enter valid coordinates', 'error'); return; }
    setNewReq((r) => ({ ...r, latitude: lat, longitude: lon }));
    notify('Hospital location set', 'success');
  };

  // --- Create request + notify matching donors ---
  const createRequest = async () => {
    if (!newReq.hospital_name || !newReq.contact_name || !newReq.contact_phone) {
      notify('Fill all required fields', 'error');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from('blood_requests')
      .insert({
        requester_id: profile.id,
        blood_group: newReq.blood_group,
        hospital_name: newReq.hospital_name,
        hospital_location: newReq.hospital_location || null,
        contact_name: newReq.contact_name,
        contact_phone: newReq.contact_phone,
        units_required: newReq.units_required,
        urgency_level: newReq.urgency_level,
        radius_km: newReq.radius_km,
        latitude: newReq.latitude,
        longitude: newReq.longitude,
        status: 'open',
      })
      .select()
      .single();

    if (error || !data) {
      setCreating(false);
      notify('Could not create request', 'error');
      return;
    }

    // Find matching donors: compatible blood group, available, within radius
    const canDonate = CAN_RECEIVE_FROM[newReq.blood_group];
    let candidates = donors.filter((d) =>
      canDonate.includes(d.blood_group) && d.is_available && d.id !== profile.id
    );
    if (newReq.latitude && newReq.longitude) {
      candidates = candidates.filter((d) =>
        d.latitude && d.longitude &&
        distanceKm(newReq.latitude!, newReq.longitude!, d.latitude, d.longitude) <= newReq.radius_km
      );
    }

    if (candidates.length > 0) {
      const urgencyPrefix = newReq.urgency_level === 'critical' ? 'CRITICAL' : newReq.urgency_level === 'urgent' ? 'URGENT' : 'BLOOD NEEDED';
      const notifs = candidates.map((d) => ({
        recipient_id: d.id,
        request_id: data.id,
        title: `${urgencyPrefix}: ${newReq.blood_group} needed`,
        message: `${newReq.urgency_level === 'critical' ? 'CRITICAL — ' : ''}${newReq.units_required} unit(s) of ${newReq.blood_group} at ${newReq.hospital_name}. Contact: ${newReq.contact_name} — ${newReq.contact_phone}`,
        type: 'request' as const,
      }));
      await supabase.from('notifications').insert(notifs);
    }

    setCreating(false);
    setCreateOpen(false);
    setNewReq({
      ...newReq, hospital_name: '', hospital_location: '', contact_name: '', contact_phone: '',
      units_required: 1, urgency_level: 'urgent' as UrgencyLevel,
      latitude: null, longitude: null,
    });
    setManualLat(''); setManualLon('');
    notify(`Request created — ${candidates.length} matching donors notified`, 'success');
    loadData();
    setTab('requests');
  };

  const approveRequest = async (req: BloodRequest) => {
    if (actionLoading) return;
    setActionLoading(req.id);
    const { error } = await supabase.from('blood_requests').update({
      status: 'open',
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile!.id,
      rejection_reason: null,
    }).eq('id', req.id);
    setActionLoading(null);
    if (error) { notify('Could not approve request', 'error'); return; }
    // Notify matching donors
    const canDonate = CAN_RECEIVE_FROM[req.blood_group];
    let candidates = donors.filter((d) =>
      canDonate.includes(d.blood_group) && d.is_available && d.id !== profile!.id
    );
    if (req.latitude && req.longitude) {
      candidates = candidates.filter((d) =>
        d.latitude && d.longitude &&
        distanceKm(req.latitude!, req.longitude!, d.latitude, d.longitude) <= req.radius_km
      );
    }
    if (candidates.length > 0) {
      const urgencyPrefix = req.urgency_level === 'critical' ? 'CRITICAL' : req.urgency_level === 'urgent' ? 'URGENT' : 'BLOOD NEEDED';
      await supabase.from('notifications').insert(candidates.map((d) => ({
        recipient_id: d.id,
        request_id: req.id,
        title: `${urgencyPrefix}: ${req.blood_group} needed`,
        message: `${req.units_required} unit(s) of ${req.blood_group} at ${req.hospital_name}. Contact: ${req.contact_name} — ${req.contact_phone}`,
        type: 'request' as const,
      })));
    }
    notify(`Request approved — ${candidates.length} donors notified`, 'success');
    loadData();
  };

  const rejectRequest = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    const { error } = await supabase.from('blood_requests').update({
      status: 'cancelled',
      rejection_reason: rejectReason.trim() || 'No reason provided',
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile!.id,
    }).eq('id', rejectTarget.id);
    setActionLoading(null);
    if (error) { notify('Could not reject request', 'error'); return; }
    // Notify requester if they exist
    if (rejectTarget.requester_id) {
      await supabase.from('notifications').insert({
        recipient_id: rejectTarget.requester_id,
        request_id: rejectTarget.id,
        title: `Blood request rejected`,
        message: `Your request for ${rejectTarget.blood_group} at ${rejectTarget.hospital_name} was rejected. Reason: ${rejectReason.trim() || 'No reason provided'}`,
        type: 'system' as const,
      });
    }
    setRejectTarget(null);
    setRejectReason('');
    notify('Request rejected', 'success');
    loadData();
  };

  const fulfillRequest = async (id: string) => {
    if (actionLoading) return;
    setActionLoading(id);
    const { error } = await supabase.from('blood_requests').update({ status: 'fulfilled' }).eq('id', id);
    setActionLoading(null);
    if (error) { notify('Could not update request', 'error'); return; }
    notify('Request marked fulfilled', 'success');
    loadData();
  };

  // Manually re-notify matching donors for an existing request
  const renotifyDonors = async (req: BloodRequest) => {
    const canDonate = CAN_RECEIVE_FROM[req.blood_group];
    let candidates = donors.filter((d) =>
      canDonate.includes(d.blood_group) && d.is_available && d.id !== profile.id
    );
    if (req.latitude && req.longitude) {
      candidates = candidates.filter((d) =>
        d.latitude && d.longitude &&
        distanceKm(req.latitude!, req.longitude!, d.latitude, d.longitude) <= req.radius_km
      );
    }
    if (candidates.length === 0) {
      notify('No matching available donors found', 'error');
      return;
    }
    const urgencyPrefix = req.urgency_level === 'critical' ? 'CRITICAL' : req.urgency_level === 'urgent' ? 'URGENT' : 'BLOOD NEEDED';
    const notifs = candidates.map((d) => ({
      recipient_id: d.id,
      request_id: req.id,
      title: `${urgencyPrefix}: ${req.blood_group} needed`,
      message: `${req.urgency_level === 'critical' ? 'CRITICAL — ' : ''}${req.units_required} unit(s) of ${req.blood_group} at ${req.hospital_name}. Contact: ${req.contact_name} — ${req.contact_phone}`,
      type: 'request' as const,
    }));
    const { error } = await supabase.from('notifications').insert(notifs);
    if (error) {
      notify('Failed to send notifications', 'error');
    } else {
      notify(`${candidates.length} matching donors notified`, 'success');
    }
  };

  const urgencyBadge = (level: UrgencyLevel) => {
    const styles: Record<UrgencyLevel, string> = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      urgent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      normal: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    };
    return <span className={`badge ${styles[level]}`}>{level}</span>;
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'donors', label: 'Donors', icon: <Users className="h-4 w-4" /> },
    { id: 'requests', label: 'Blood Requests', icon: <Heart className="h-4 w-4" />, badge: requests.filter((r) => r.status === 'pending').length },
    { id: 'create', label: 'Create Request', icon: <Plus className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blood-500 to-blood-700 text-white shadow-lg">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-sm text-gray-500">Manage donors, blood requests & notifications</p>
          </div>
        </div>
        <button onClick={() => { setCreateOpen(true); setTab('create'); }} className="btn-primary">
          <Plus className="h-4 w-4" /> Create Blood Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => t.id === 'create' ? setCreateOpen(true) : setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-blood-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            {t.icon} {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-yellow-500 px-1 text-xs font-bold text-white">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* === ANALYTICS TAB === */}
      {tab === 'analytics' && (
        <AnalyticsDashboard donors={donors} requests={requests} donations={donations} />
      )}

      {/* === OVERVIEW TAB === */}
      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Donors" value={donors.length} icon={<Users className="h-6 w-6" />} accent="blood" />
            <StatCard label="Available Now" value={availableDonors} icon={<Heart className="h-6 w-6" />} accent="green" />
            <StatCard label="Open Requests" value={openRequests} icon={<AlertTriangle className="h-6 w-6" />} accent="amber" />
            <StatCard label="Pending Review" value={pendingRequests} icon={<Clock className="h-6 w-6" />} accent="blood" />
            <StatCard label="Units Collected" value={totalUnits} icon={<Droplet className="h-6 w-6" />} accent="blue" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Critical Requests" value={criticalRequests} icon={<Zap className="h-6 w-6" />} accent="blood" />
            <StatCard label="Total Donations" value={totalDonations} icon={<TrendingUp className="h-6 w-6" />} accent="blue" />
            <StatCard label="Fulfilled Requests" value={fulfilledRequests} icon={<CheckCircle2 className="h-6 w-6" />} accent="green" />
          </div>

          {/* Blood group distribution */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Donors by Blood Group</h2>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {BLOOD_GROUPS.map((g) => {
                const count = donors.filter((d) => d.blood_group === g).length;
                const avail = donors.filter((d) => d.blood_group === g && d.is_available).length;
                return (
                  <div key={g} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-800">
                    <BloodDrop group={g} size="sm" />
                    <p className="mt-2 font-display text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                    <p className="text-xs text-green-600">{avail} avail</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent requests */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Recent Blood Requests</h2>
              <button onClick={() => setTab('requests')} className="text-sm font-medium text-blood-600 hover:text-blood-700">View all</button>
            </div>
            {requests.length === 0 ? (
              <EmptyState icon={<Heart className="h-6 w-6" />} title="No requests yet" subtitle="Create a blood request to notify matching donors." />
            ) : (
              <div className="space-y-2">
                {requests.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <BloodDrop group={r.blood_group} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{r.hospital_name}</p>
                        <p className="text-xs text-gray-500">{r.units_required} units · {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {urgencyBadge(r.urgency_level)}
                      <span className={`badge ${
                        r.status === 'open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                        r.status === 'fulfilled' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === DONORS TAB === */}
      {tab === 'donors' && (
        <div className="card p-6 animate-fade-in">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Donor Directory</h2>
              <span className="ml-auto text-sm text-gray-500">{filteredDonors.length} of {donors.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email…"
                  className="input pl-9"
                />
              </div>
              <select value={bloodFilter} onChange={(e) => setBloodFilter(e.target.value as any)} className="input w-32">
                <option value="all">All Blood</option>
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Filter by location…"
                  className="input pl-9 w-44"
                />
              </div>
              <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value as any)} className="input w-36">
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          {filteredDonors.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="No donors found" subtitle="Try adjusting your filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500">
                    <th className="pb-2 font-medium">Donor</th>
                    <th className="pb-2 font-medium">Blood</th>
                    <th className="pb-2 font-medium">Contact</th>
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonors.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{d.full_name}</p>
                        <p className="text-xs text-gray-500">{d.email}</p>
                      </td>
                      <td className="py-3"><BloodDrop group={d.blood_group} size="sm" /></td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {d.phone}</p>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">
                        <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.address ?? '—'}</p>
                      </td>
                      <td className="py-3"><AvailabilityBadge available={d.is_available} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* === REQUESTS TAB === */}
      {tab === 'requests' && (() => {
        const STATUS_FILTERS: { value: typeof reqStatusFilter; label: string; color: string }[] = [
          { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
          { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
          { value: 'open', label: 'Approved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
          { value: 'fulfilled', label: 'Fulfilled', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
          { value: 'cancelled', label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
        ];
        const pendingCount = requests.filter((r) => r.status === 'pending').length;
        const filtered = reqStatusFilter === 'all' ? requests : requests.filter((r) => r.status === reqStatusFilter);
        const statusBadge = (r: BloodRequest) => {
          if (r.status === 'pending') return <span className="badge bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">Pending Review</span>;
          if (r.status === 'open') return <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Approved</span>;
          if (r.status === 'fulfilled') return <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Fulfilled</span>;
          return <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Rejected</span>;
        };
        return (
          <div className="space-y-4 animate-fade-in">
            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((sf) => (
                <button
                  key={sf.value}
                  onClick={() => setReqStatusFilter(sf.value)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all border-2 ${
                    reqStatusFilter === sf.value
                      ? 'border-blood-500 ' + sf.color
                      : 'border-transparent ' + sf.color + ' opacity-60 hover:opacity-100'
                  }`}
                >
                  {sf.label}
                  {sf.value === 'pending' && pendingCount > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-yellow-500 px-1 text-xs font-bold text-white">{pendingCount}</span>
                  )}
                </button>
              ))}
              <span className="ml-auto self-center text-sm text-gray-500">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {filtered.length === 0 ? (
              <div className="card p-6">
                <EmptyState icon={<Heart className="h-6 w-6" />} title="No requests" subtitle="No requests match the selected filter." />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((r) => (
                  <div key={r.id} className={`rounded-xl border p-4 dark:border-gray-800 ${
                    r.status === 'pending' ? 'border-yellow-200 bg-yellow-50/40 dark:bg-yellow-900/10' : 'border-gray-100 bg-white dark:bg-gray-900'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <BloodDrop group={r.blood_group} size="md" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            {r.hospital_name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(r.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {urgencyBadge(r.urgency_level)}
                        {statusBadge(r)}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p><span className="text-gray-500">Contact:</span> {r.contact_name} — {r.contact_phone}</p>
                      <p><span className="text-gray-500">Units:</span> {r.units_fulfilled} / {r.units_required}</p>
                      <p><span className="text-gray-500">Radius:</span> {r.radius_km} km</p>
                      {r.hospital_location && <p><span className="text-gray-500">Address:</span> {r.hospital_location}</p>}
                      {r.latitude && <p><span className="text-gray-500">Coordinates:</span> {r.latitude.toFixed(3)}, {r.longitude?.toFixed(3)}</p>}
                      {r.status === 'cancelled' && r.rejection_reason && (
                        <p className="mt-2 rounded-lg bg-red-50 p-2 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          <span className="font-medium">Rejection reason:</span> {r.rejection_reason}
                        </p>
                      )}
                      {r.reviewed_at && (
                        <p className="text-xs text-gray-400">Reviewed: {new Date(r.reviewed_at).toLocaleString()}</p>
                      )}
                    </div>

                    {/* Pending: Approve + Reject */}
                    {r.status === 'pending' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => approveRequest(r)}
                          disabled={actionLoading === r.id}
                          className="btn-primary text-xs flex-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {actionLoading === r.id ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => { setRejectTarget(r); setRejectReason(''); }}
                          disabled={actionLoading === r.id}
                          className="btn-ghost text-xs flex-1 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    )}

                    {/* Open (approved): Notify + Fulfill + Reject */}
                    {r.status === 'open' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => renotifyDonors(r)} className="btn-secondary text-xs">
                          <Bell className="h-3.5 w-3.5" /> Notify Donors
                        </button>
                        <button onClick={() => fulfillRequest(r.id)} disabled={actionLoading === r.id} className="btn-secondary text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Fulfill
                        </button>
                        <button
                          onClick={() => { setRejectTarget(r); setRejectReason(''); }}
                          className="btn-ghost text-xs border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Reject modal */}
      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(''); }} title="Reject Blood Request" size="sm">
        {rejectTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
              <BloodDrop group={rejectTarget.blood_group} size="sm" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{rejectTarget.hospital_name}</p>
                <p className="text-xs text-gray-500">{rejectTarget.blood_group} · {rejectTarget.units_required} unit(s)</p>
              </div>
            </div>
            <div>
              <label className="label">Rejection Reason <span className="text-gray-400">(optional)</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Insufficient stock, duplicate request, incorrect information…"
                rows={3}
                className="input resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={rejectRequest}
                disabled={!!actionLoading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* === CREATE REQUEST MODAL === */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Blood Request" size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Blood Group Needed</label>
            <select value={newReq.blood_group} onChange={(e) => setNewReq({ ...newReq, blood_group: e.target.value as BloodGroup })} className="input">
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Units Required</label>
            <input type="number" min="1" value={newReq.units_required} onChange={(e) => setNewReq({ ...newReq, units_required: parseInt(e.target.value) || 1 })} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Urgency Level</label>
            <div className="grid grid-cols-3 gap-2">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewReq({ ...newReq, urgency_level: opt.value })}
                  className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition-all ${
                    newReq.urgency_level === opt.value
                      ? 'border-blood-500 bg-blood-50 dark:bg-blood-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <span className={opt.color}>{opt.label.split(' — ')[0]}</span>
                  <p className="mt-0.5 text-xs text-gray-500">{opt.label.split(' — ')[1]}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Hospital Name</label>
            <input value={newReq.hospital_name} onChange={(e) => setNewReq({ ...newReq, hospital_name: e.target.value })} className="input" placeholder="City General Hospital" />
          </div>
          <div>
            <label className="label">Hospital Address</label>
            <input value={newReq.hospital_location} onChange={(e) => setNewReq({ ...newReq, hospital_location: e.target.value })} className="input" placeholder="123 Main St, City" />
          </div>
          <div>
            <label className="label">Contact Name</label>
            <input value={newReq.contact_name} onChange={(e) => setNewReq({ ...newReq, contact_name: e.target.value })} className="input" placeholder="Dr. Smith" />
          </div>
          <div>
            <label className="label">Contact Number</label>
            <input value={newReq.contact_phone} onChange={(e) => setNewReq({ ...newReq, contact_phone: e.target.value })} className="input" placeholder="+1 555 0100" />
          </div>
          <div>
            <label className="label">Search Radius (km)</label>
            <select value={newReq.radius_km} onChange={(e) => setNewReq({ ...newReq, radius_km: parseInt(e.target.value) })} className="input">
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>
          <div>
            <label className="label">Hospital Location</label>
            <div className="flex flex-wrap gap-2">
              <input readOnly value={newReq.latitude ? `${newReq.latitude.toFixed(3)}, ${newReq.longitude?.toFixed(3)}` : 'Not set'} className="input flex-1 min-w-[120px]" />
              <button type="button" onClick={detectLocation} className="btn-secondary"><MapPin className="h-4 w-4" /> Detect</button>
            </div>
            <div className="mt-2 flex gap-2">
              <input type="number" step="any" placeholder="Lat" className="input w-24" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
              <input type="number" step="any" placeholder="Lon" className="input w-24" value={manualLon} onChange={(e) => setManualLon(e.target.value)} />
              <button type="button" onClick={applyManualLocation} className="btn-secondary text-xs">Set</button>
            </div>
          </div>
          <div className="sm:col-span-2 rounded-xl bg-blood-50 p-3 dark:bg-blood-900/20">
            <p className="text-xs text-blood-700 dark:text-blood-300 flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" /> Matching available donors (compatible blood group, within radius) will be automatically notified.
            </p>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={() => setCreateOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={createRequest} disabled={creating} className="btn-primary flex-1">
              {creating ? 'Creating…' : <>Create & Notify <Send className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
