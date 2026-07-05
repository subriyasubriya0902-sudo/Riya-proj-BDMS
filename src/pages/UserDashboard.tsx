import { useState, useEffect, useCallback } from 'react';
import { Droplet, Heart, Award, MapPin, Edit3, Save, X, Download, Calendar, Phone, Mail, User as UserIcon, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase, Donation, BLOOD_GROUPS, BloodGroup, Gender, distanceKm } from '../lib/supabase';
import { StatCard, BloodDrop, AvailabilityBadge, EmptyState, Modal, CompatibilityInfo } from '../components/ui';

export function UserDashboard() {
  const { profile, refreshProfile, user } = useAuth();
  const { notify } = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);

  const loadDonations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_id', user.id)
      .order('donation_date', { ascending: false });
    if (error) {
      notify('Could not load donations', 'error');
      return;
    }
    setDonations((data as Donation[]) ?? []);
  }, [user, notify]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  useEffect(() => {
    setEditForm(profile);
  }, [profile]);

  if (!profile) return null;

  const totalUnits = donations.reduce((s, d) => s + Number(d.units), 0);
  const lastDonation = donations[0]?.donation_date ?? profile.last_donation_date;

  const toggleAvailability = async () => {
    setToggling(true);
    const { error } = await supabase
      .from('profiles')
      .update({ is_available: !profile.is_available })
      .eq('id', profile.id);
    setToggling(false);
    if (error) {
      notify('Could not update availability', 'error');
    } else {
      notify(`You are now ${!profile.is_available ? 'available' : 'unavailable'} for donation`, 'success');
      refreshProfile();
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm?.full_name,
        phone: editForm?.phone,
        age: editForm?.age,
        gender: editForm?.gender,
        blood_group: editForm?.blood_group,
        address: editForm?.address,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      notify('Could not save profile', 'error');
    } else {
      notify('Profile updated', 'success');
      setEditing(false);
      refreshProfile();
    }
  };

  const sendSOS = async () => {
    if (!profile.latitude || !profile.longitude) {
      notify('Set your location to use SOS', 'error');
      return;
    }
    setSosOpen(false);
    // Find nearby donors with compatible blood (can receive from this user's group)
    const { data: donors } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', profile.id)
      .eq('is_available', true);
    const nearby = (donors ?? [])
      .filter((d: any) => d.latitude && d.longitude)
      .filter((d: any) => distanceKm(profile.latitude!, profile.longitude!, d.latitude, d.longitude) <= 20)
      .slice(0, 20);

    if (nearby.length === 0) {
      notify('No nearby donors found for SOS', 'error');
      return;
    }
    const inserts = nearby.map((d: any) => ({
      recipient_id: d.id,
      title: 'Emergency SOS',
      message: `${profile.full_name} (${profile.blood_group}) triggered an emergency SOS. Please respond if you can help.`,
      type: 'sos' as const,
    }));
    const { error } = await supabase.from('notifications').insert(inserts);
    if (error) {
      notify('Could not send SOS', 'error');
    } else {
      notify(`SOS sent to ${nearby.length} nearby donors`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Welcome, {profile.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500">Manage your donor profile and donations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleAvailability} disabled={toggling} className={profile.is_available ? 'btn-secondary' : 'btn-primary'}>
            <Heart className="h-4 w-4" />
            {profile.is_available ? 'Mark Unavailable' : 'Mark Available'}
          </button>
          <button onClick={() => setSosOpen(true)} className="btn-danger">
            <AlertTriangle className="h-4 w-4" /> SOS
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Donations" value={donations.length} icon={<Droplet className="h-6 w-6" />} accent="blood" />
        <StatCard label="Units Donated" value={totalUnits} icon={<Heart className="h-6 w-6" />} accent="green" />
        <StatCard label="Blood Group" value={profile.blood_group} icon={<Award className="h-6 w-6" />} accent="amber" />
        <StatCard label="Status" value={profile.is_available ? 'Available' : 'Unavailable'} icon={<Heart className="h-6 w-6" />} accent="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">My Profile</h2>
            {!editing ? (
              <button onClick={() => { setEditForm(profile); setEditing(true); }} className="btn-ghost">
                <Edit3 className="h-4 w-4" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={saveProfile} disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> Save</button>
                <button onClick={() => { setEditing(false); setEditForm(profile); }} className="btn-ghost"><X className="h-4 w-4" /></button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <BloodDrop group={profile.blood_group} size="lg" />
                <div>
                  <p className="font-display text-lg font-bold text-gray-900 dark:text-white">{profile.full_name}</p>
                  <AvailabilityBadge available={profile.is_available} />
                </div>
              </div>
              <div className="space-y-2.5">
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile.phone} />
                <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Age / Gender" value={`${profile.age ?? '—'} / ${profile.gender ?? '—'}`} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={profile.address ?? '—'} />
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Last Donation" value={lastDonation ? new Date(lastDonation).toLocaleDateString() : 'Never'} />
              </div>
              <div className="sm:col-span-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Can receive blood from:</p>
                <CompatibilityInfo group={profile.blood_group} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={editForm?.full_name ?? ''} onChange={(e) => setEditForm({ ...editForm!, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={editForm?.phone ?? ''} onChange={(e) => setEditForm({ ...editForm!, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Age</label>
                <input type="number" className="input" value={editForm?.age ?? ''} onChange={(e) => setEditForm({ ...editForm!, age: e.target.value ? parseInt(e.target.value) : null })} />
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input" value={editForm?.gender ?? 'male'} onChange={(e) => setEditForm({ ...editForm!, gender: e.target.value as Gender })}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select className="input" value={editForm?.blood_group ?? 'O+'} onChange={(e) => setEditForm({ ...editForm!, blood_group: e.target.value as BloodGroup })}>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input className="input" value={editForm?.address ?? ''} onChange={(e) => setEditForm({ ...editForm!, address: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        {/* Certificate / quick actions */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-3">Donor Certificate</h3>
            <p className="text-sm text-gray-500 mb-4">Generate a printable certificate for your donations.</p>
            <button onClick={() => import('../lib/certificate').then((m) => m.generateCertificate(profile, donations))} className="btn-primary w-full">
              <Download className="h-4 w-4" /> Download Certificate
            </button>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Member since</span><span className="font-medium text-gray-900 dark:text-white">{new Date(profile.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total donations</span><span className="font-medium text-gray-900 dark:text-white">{donations.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Units given</span><span className="font-medium text-gray-900 dark:text-white">{totalUnits}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Location set</span><span className="font-medium text-gray-900 dark:text-white">{profile.latitude ? 'Yes' : 'No'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Donation history */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Donation History</h2>
        {donations.length === 0 ? (
          <EmptyState icon={<Droplet className="h-6 w-6" />} title="No donations yet" subtitle="Your donation history will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Units</th>
                  <th className="pb-2 font-medium">Hospital</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="py-3 text-gray-900 dark:text-gray-200">{new Date(d.donation_date).toLocaleDateString()}</td>
                    <td className="py-3"><span className="badge bg-blood-50 text-blood-700 dark:bg-blood-900/30 dark:text-blood-300">{d.units} unit(s)</span></td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{d.hospital_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={sosOpen} onClose={() => setSosOpen(false)} title="Emergency SOS" size="sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-2">This will alert all available donors within 20 km.</p>
          <p className="text-sm text-gray-500 mb-5">Use only for genuine emergencies.</p>
          <div className="flex gap-2">
            <button onClick={() => setSosOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={sendSOS} className="btn-danger flex-1">Send SOS</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500 w-28">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-200">{value}</span>
    </div>
  );
}
