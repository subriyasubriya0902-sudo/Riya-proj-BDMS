import { useState } from 'react';
import { Droplet, Mail, Lock, User, Phone, MapPin, ArrowRight, ArrowLeft, Locate } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { BLOOD_GROUPS, BloodGroup, Gender } from '../lib/supabase';

export function Register({ onNavigate }: { onNavigate: (r: any) => void }) {
  const { signUp } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    age: '',
    gender: 'male' as Gender,
    blood_group: 'O+' as BloodGroup,
    address: '',
    admin_code: '',
  });
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const detectLocation = () => {
    if (!navigator.geolocation) {
      notify('Geolocation not supported', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        notify('Location detected', 'success');
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enter coordinates manually below.'
            : err.code === err.POSITION_UNAVAILABLE
            ? 'Position unavailable. Enter coordinates manually below.'
            : err.code === err.TIMEOUT
            ? 'Location request timed out. Enter coordinates manually below.'
            : 'Could not get location. Enter coordinates manually below.';
        notify(msg, 'error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      notify('Password must be at least 6 characters', 'error');
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      full_name: form.full_name,
      phone: form.phone,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender,
      blood_group: form.blood_group,
      address: form.address,
      latitude: coords?.lat ?? null,
      longitude: coords?.lon ?? null,
      admin_code: form.admin_code,
    });
    setLoading(false);
    if (error) {
      notify(error, 'error');
    } else {
      notify('Account created! Please sign in.', 'success');
      onNavigate('login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blood-50 to-white dark:from-gray-950 dark:to-gray-900 px-4 py-8">
      <div className="w-full max-w-2xl">
        <button onClick={() => onNavigate('home')} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="h-4 w-4" /> Back home
        </button>
        <div className="card p-8 animate-fade-in">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 text-white shadow-lg">
              <Droplet className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Become a donor</h1>
            <p className="mt-1 text-sm text-gray-500">Join the LifeFlow network and start saving lives</p>
          </div>

          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className="input pl-10" placeholder="Jane Doe" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className="input pl-10" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input required value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input pl-10" placeholder="+1 555 0100" />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="password" required value={form.password} onChange={(e) => set('password', e.target.value)} className="input pl-10" placeholder="••••••••" />
              </div>
            </div>
            <div>
              <label className="label">Age</label>
              <input type="number" min="18" max="65" value={form.age} onChange={(e) => set('age', e.target.value)} className="input" placeholder="25" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="input">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Blood Group</label>
              <select value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)} className="input">
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={form.address} onChange={(e) => set('address', e.target.value)} className="input pl-10" placeholder="123 Main St, City" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Location (for nearby donor matching)</label>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Locate className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    readOnly
                    value={coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : 'Not set'}
                    className="input pl-10 cursor-default"
                  />
                </div>
                <button type="button" onClick={detectLocation} className="btn-secondary">Detect</button>
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  className="input w-32"
                  value={manualLat}
                  onChange={(e) => { setManualLat(e.target.value); if (e.target.value && manualLon) setCoords({ lat: parseFloat(e.target.value), lon: parseFloat(manualLon) }); }}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  className="input w-32"
                  value={manualLon}
                  onChange={(e) => { setManualLon(e.target.value); if (e.target.value && manualLat) setCoords({ lat: parseFloat(manualLat), lon: parseFloat(e.target.value) }); }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">If auto-detect fails, enter your latitude and longitude manually.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Admin Code (optional)</label>
              <input value={form.admin_code} onChange={(e) => set('admin_code', e.target.value)} className="input" placeholder="Leave blank for donor account" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary sm:col-span-2 py-3">
              {loading ? 'Creating account…' : <>Create Account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button onClick={() => onNavigate('login')} className="font-semibold text-blood-600 hover:text-blood-700">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
