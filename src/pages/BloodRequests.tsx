import { useState, useEffect, useCallback } from 'react';
import { Heart, Droplet, Phone, MapPin, Calendar, CheckCircle2, Plus, Clock, X, Send } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase, BloodRequest, Donation, BLOOD_GROUPS, BloodGroup } from '../lib/supabase';
import { BloodDrop, EmptyState, Modal } from '../components/ui';

export function BloodRequests() {
  const { profile } = useAuth();
  const { notify } = useToast();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [pledgeOpen, setPledgeOpen] = useState<BloodRequest | null>(null);
  const [pledgeUnits, setPledgeUnits] = useState(1);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newReq, setNewReq] = useState({
    blood_group: 'A+' as BloodGroup,
    hospital_name: '',
    contact_name: '',
    contact_phone: '',
    units_required: 1,
  });

  const load = useCallback(async () => {
    const { data } = await supabase.from('blood_requests').select('*').order('created_at', { ascending: false });
    setRequests((data as BloodRequest[]) ?? []);
    if (profile) {
      const { data: dons } = await supabase.from('donations').select('*').eq('donor_id', profile.id);
      setDonations((dons as Donation[]) ?? []);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (!profile) return null;

  const openRequests = requests.filter((r) => r.status === 'open');
  const myRequests = requests.filter((r) => r.requester_id === profile.id);

  const pledgeDonation = async () => {
    if (!pledgeOpen) return;

    // Fetch the current units_fulfilled from the DB to avoid stale-state races
    const { data: fresh, error: fetchErr } = await supabase
      .from('blood_requests')
      .select('units_fulfilled, units_required')
      .eq('id', pledgeOpen.id)
      .single();
    if (fetchErr || !fresh) {
      notify('Could not verify request status', 'error');
      return;
    }

    const { error: donErr } = await supabase.from('donations').insert({
      donor_id: profile.id,
      request_id: pledgeOpen.id,
      units: pledgeUnits,
      donation_date: new Date().toISOString().slice(0, 10),
      hospital_name: pledgeOpen.hospital_name,
    });
    if (donErr) {
      notify('Could not record donation', 'error');
      return;
    }

    const newFulfilled = fresh.units_fulfilled + pledgeUnits;
    const status = newFulfilled >= fresh.units_required ? 'fulfilled' : 'open';
    const { error: reqErr } = await supabase
      .from('blood_requests')
      .update({ units_fulfilled: newFulfilled, status })
      .eq('id', pledgeOpen.id);
    if (reqErr) {
      notify('Donation recorded but could not update request status', 'error');
    }

    await supabase
      .from('profiles')
      .update({ last_donation_date: new Date().toISOString().slice(0, 10) })
      .eq('id', profile.id);

    notify('Donation recorded. Thank you for saving a life!', 'success');
    setPledgeOpen(null);
    setPledgeUnits(1);
    load();
  };

  const submitRequest = async () => {
    if (!newReq.hospital_name || !newReq.contact_name || !newReq.contact_phone) {
      notify('Fill all required fields', 'error');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('blood_requests').insert({
      requester_id: profile.id,
      blood_group: newReq.blood_group,
      hospital_name: newReq.hospital_name,
      contact_name: newReq.contact_name,
      contact_phone: newReq.contact_phone,
      units_required: newReq.units_required,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) { notify('Could not submit request', 'error'); return; }
    notify('Request submitted — an admin will review it shortly.', 'success');
    setSubmitOpen(false);
    setNewReq({ blood_group: 'A+', hospital_name: '', contact_name: '', contact_phone: '', units_required: 1 });
    load();
  };

  const statusBadge = (r: BloodRequest) => {
    if (r.status === 'pending') return <span className="badge bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"><Clock className="h-3 w-3" /> Pending Review</span>;
    if (r.status === 'open') return <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Approved</span>;
    if (r.status === 'fulfilled') return <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> Fulfilled</span>;
    return <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"><X className="h-3 w-3" /> Rejected</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Blood Requests</h1>
          <p className="text-sm text-gray-500">Active emergency requests — pledge a donation to help</p>
        </div>
        <button onClick={() => setSubmitOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Submit Request
        </button>
      </div>

      {/* Open requests */}
      <div>
        <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Heart className="h-5 w-5 text-blood-600" /> Active Requests ({openRequests.length})
        </h2>
        {openRequests.length === 0 ? (
          <div className="card p-6">
            <EmptyState icon={<Heart className="h-6 w-6" />} title="No active requests" subtitle="Approved blood requests will appear here." />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {openRequests.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <BloodDrop group={r.blood_group} size="md" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{r.hospital_name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {r.urgency_level === 'critical' && (
                      <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Critical</span>
                    )}
                    {r.urgency_level === 'urgent' && (
                      <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Urgent</span>
                    )}
                    {r.urgency_level === 'normal' && (
                      <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Normal</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {r.contact_name} — {r.contact_phone}</p>
                  {r.hospital_location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> {r.hospital_location}</p>}
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> Search radius: {r.radius_km} km</p>
                  <div className="flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-blood-500 rounded-full" style={{ width: `${Math.min(100, (r.units_fulfilled / r.units_required) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.units_fulfilled}/{r.units_required} units</span>
                  </div>
                </div>
                <button onClick={() => { setPledgeOpen(r); setPledgeUnits(1); }} className="btn-primary w-full mt-4">
                  <Plus className="h-4 w-4" /> Pledge Donation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My submitted requests */}
      {myRequests.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Send className="h-5 w-5 text-gray-500" /> My Submitted Requests ({myRequests.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {myRequests.map((r) => (
              <div key={r.id} className={`rounded-xl border p-4 dark:border-gray-800 ${
                r.status === 'pending' ? 'border-yellow-200 bg-yellow-50/40 dark:bg-yellow-900/10' :
                r.status === 'cancelled' ? 'border-red-100 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-100 bg-white dark:bg-gray-900'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <BloodDrop group={r.blood_group} size="sm" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{r.hospital_name}</p>
                      <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {statusBadge(r)}
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>{r.contact_name} — {r.contact_phone}</p>
                  <p>{r.units_required} unit(s) of {r.blood_group}</p>
                  {r.status === 'pending' && (
                    <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-400">Awaiting admin review.</p>
                  )}
                  {r.status === 'cancelled' && r.rejection_reason && (
                    <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                      <span className="font-medium">Reason:</span> {r.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My donations */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">My Pledged Donations</h2>
        {donations.length === 0 ? (
          <EmptyState icon={<Droplet className="h-6 w-6" />} title="No donations yet" subtitle="Pledge to an active request to start your life-saving journey." />
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
                    <td className="py-3"><span className="badge bg-blood-50 text-blood-700 dark:bg-blood-900/30 dark:text-blood-300">{d.units}</span></td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{d.hospital_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pledge modal */}
      <Modal open={!!pledgeOpen} onClose={() => setPledgeOpen(null)} title="Pledge a Donation" size="sm">
        {pledgeOpen && (
          <div>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-blood-50 p-4 dark:bg-blood-900/20">
              <BloodDrop group={pledgeOpen.blood_group} size="md" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{pledgeOpen.hospital_name}</p>
                <p className="text-xs text-gray-500">{pledgeOpen.units_fulfilled}/{pledgeOpen.units_required} units fulfilled</p>
              </div>
            </div>
            <label className="label">Units to pledge</label>
            <input type="number" min="1" max={pledgeOpen.units_required - pledgeOpen.units_fulfilled} value={pledgeUnits} onChange={(e) => setPledgeUnits(Math.max(1, parseInt(e.target.value) || 1))} className="input mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setPledgeOpen(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={pledgeDonation} className="btn-primary flex-1"><CheckCircle2 className="h-4 w-4" /> Confirm</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit request modal */}
      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit a Blood Request" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Your request will be reviewed by an admin before being made active.</p>
          <div>
            <label className="label">Blood Group *</label>
            <select value={newReq.blood_group} onChange={(e) => setNewReq((p) => ({ ...p, blood_group: e.target.value as BloodGroup }))} className="input">
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Hospital / Location *</label>
            <input value={newReq.hospital_name} onChange={(e) => setNewReq((p) => ({ ...p, hospital_name: e.target.value }))} placeholder="City Hospital" className="input" />
          </div>
          <div>
            <label className="label">Contact Name *</label>
            <input value={newReq.contact_name} onChange={(e) => setNewReq((p) => ({ ...p, contact_name: e.target.value }))} placeholder="John Doe" className="input" />
          </div>
          <div>
            <label className="label">Contact Phone *</label>
            <input value={newReq.contact_phone} onChange={(e) => setNewReq((p) => ({ ...p, contact_phone: e.target.value }))} placeholder="+1 555-0100" className="input" />
          </div>
          <div>
            <label className="label">Units Required</label>
            <input type="number" min="1" value={newReq.units_required} onChange={(e) => setNewReq((p) => ({ ...p, units_required: Math.max(1, parseInt(e.target.value) || 1) }))} className="input" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setSubmitOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submitRequest} disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Submitting…' : <><Send className="h-4 w-4" /> Submit</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
