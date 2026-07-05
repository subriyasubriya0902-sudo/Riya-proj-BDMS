import { useState } from 'react';
import { Shield, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';

export function AdminLogin({ onNavigate }: { onNavigate: (r: any) => void }) {
  const { signIn } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Sign in first
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      notify(error, 'error');
      return;
    }

    // After sign-in, fetch the profile directly to verify is_admin
    // (don't rely on React state which may not have updated yet)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      notify('Authentication failed. Please try again.', 'error');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    setLoading(false);

    if (profileError || !profile) {
      await supabase.auth.signOut();
      notify('Could not load profile. Please try again.', 'error');
      return;
    }

    if (!profile.is_admin) {
      await supabase.auth.signOut();
      notify('Access denied. This account does not have admin privileges.', 'error');
      return;
    }

    notify('Admin signed in', 'success');
    onNavigate('admin');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black px-4">
      <div className="w-full max-w-md">
        <button onClick={() => onNavigate('home')} className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back home
        </button>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-8 shadow-2xl backdrop-blur animate-fade-in">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 text-white shadow-lg">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Admin Portal</h1>
            <p className="mt-1 text-sm text-gray-400">Restricted access — administrators only</p>
          </div>

          <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-700/40 bg-amber-900/20 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-xs text-amber-300">
              Sign in with an administrator account. Don't have one? Register with admin code <span className="font-mono font-bold">ADMIN2026</span>.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label text-gray-300">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            <div>
              <label className="label text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in…' : <>Admin Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Not an admin?{' '}
            <button onClick={() => onNavigate('login')} className="font-semibold text-blood-400 hover:text-blood-300">
              Regular login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
