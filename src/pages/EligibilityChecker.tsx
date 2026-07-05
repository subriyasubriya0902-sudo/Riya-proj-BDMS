import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Heart, Activity, Droplet } from 'lucide-react';
import { BLOOD_GROUPS, BloodGroup, CAN_DONATE_TO } from '../lib/supabase';
import { CompatibilityInfo } from '../components/ui';

interface CheckResult {
  eligible: boolean;
  reasons: string[];
}

export function EligibilityChecker() {
  const [form, setForm] = useState({
    age: '',
    weight: '',
    lastDonation: '',
    hasTattoo: false,
    hasPiercing: false,
    isPregnant: false,
    hasDisease: false,
    onMedication: false,
    consumedAlcohol: false,
  });
  const [result, setResult] = useState<CheckResult | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup>('O+');

  const check = () => {
    const reasons: string[] = [];
    const age = parseInt(form.age) || 0;
    const weight = parseInt(form.weight) || 0;

    if (age < 18) reasons.push('You must be at least 18 years old to donate blood.');
    if (age > 65) reasons.push('Donors over 65 may need additional medical clearance.');
    if (weight > 0 && weight < 50) reasons.push('Minimum weight of 50 kg is required to donate blood.');

    if (form.lastDonation) {
      const last = new Date(form.lastDonation);
      const daysSince = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < 56) reasons.push(`Only ${daysSince} days since last donation. Wait at least 56 days (8 weeks) between donations.`);
    }

    if (form.hasTattoo) reasons.push('Recent tattoos require a 6-month waiting period before donating.');
    if (form.hasPiercing) reasons.push('Recent piercings require a 6-month waiting period before donating.');
    if (form.isPregnant) reasons.push('Pregnant women cannot donate blood. Wait 6 weeks after delivery.');
    if (form.hasDisease) reasons.push('Certain medical conditions may disqualify you. Consult a doctor.');
    if (form.onMedication) reasons.push('Some medications affect eligibility. Check with your doctor.');
    if (form.consumedAlcohol) reasons.push('Avoid alcohol for 24 hours before donating.');

    setResult({ eligible: reasons.length === 0, reasons });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Donation Eligibility Checker</h1>
        <p className="text-sm text-gray-500">Check if you're eligible to donate blood today</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checker form */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Health Questionnaire</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Age</label>
              <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="input" placeholder="25" />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input" placeholder="60" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Last Donation Date (if any)</label>
              <input type="date" value={form.lastDonation} onChange={(e) => setForm({ ...form, lastDonation: e.target.value })} className="input" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {[
              { key: 'hasTattoo', label: 'I got a tattoo in the last 6 months' },
              { key: 'hasPiercing', label: 'I got a piercing in the last 6 months' },
              { key: 'isPregnant', label: 'I am currently pregnant' },
              { key: 'hasDisease', label: 'I have a chronic medical condition (heart, liver, etc.)' },
              { key: 'onMedication', label: 'I am currently on medication' },
              { key: 'consumedAlcohol', label: 'I consumed alcohol in the last 24 hours' },
            ].map((q) => (
              <label key={q.key} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 cursor-pointer hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={(form as any)[q.key]}
                  onChange={(e) => setForm({ ...form, [q.key]: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blood-600 focus:ring-blood-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{q.label}</span>
              </label>
            ))}
          </div>

          <button onClick={check} className="btn-primary w-full mt-5">
            <Activity className="h-4 w-4" /> Check Eligibility
          </button>
        </div>

        {/* Result */}
        <div className="space-y-6">
          {result ? (
            <div className={`card p-6 ${result.eligible ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
              <div className="text-center">
                {result.eligible ? (
                  <>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-green-700 dark:text-green-400">You're Eligible!</h3>
                    <p className="mt-1 text-sm text-gray-500">You can donate blood today. Thank you for your willingness to save lives.</p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40">
                      <XCircle className="h-8 w-8" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-red-700 dark:text-red-400">Not Eligible Yet</h3>
                    <ul className="mt-3 space-y-1.5 text-left">
                      {result.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <Heart className="mx-auto h-10 w-10 text-blood-200" />
              <p className="mt-2 text-sm text-gray-500">Fill the questionnaire and check your eligibility.</p>
            </div>
          )}

          {/* Blood compatibility reference */}
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-3">Blood Compatibility</h3>
            <div className="mb-4">
              <label className="label">Select your blood group</label>
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value as BloodGroup)} className="input">
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Droplet className="h-3 w-3" /> Can donate to:</p>
                <div className="flex flex-wrap gap-1.5">
                  {CAN_DONATE_TO[selectedGroup].map((g) => (
                    <span key={g} className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">{g}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Heart className="h-3 w-3" /> Can receive from:</p>
                <CompatibilityInfo group={selectedGroup} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
