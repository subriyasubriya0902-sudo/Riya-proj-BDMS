import { useState } from 'react';
import { Droplet, Mail, Lock, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';

export function Login({ onNavigate }: { onNavigate: (r: any) => void }) {
  const { signIn } = useAuth();
  const { notify } = useToast();
  const [emailVal, setEmailVal] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(emailVal, password);
    setLoading(false);
    if (error) {
      notify(error, 'error');
    } else {
      notify('Welcome back!', 'success');
      onNavigate('dashboard');
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    const redirectTo = `${window.location.origin}${window.location.pathname}#/dashboard`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo });
    if (error) {
      notify(error.message, 'error');
    } else {
      // Supabase doesn't return the reset link to the client — the link is emailed by Supabase auth directly.
      // We send our branded copy via the edge function using a service-role-signed token if the user is signed in,
      // but for unauthenticated reset we rely on Supabase's own email or a future server-side trigger.
      notify('Password reset email sent. Check your inbox.', 'success');
      setMode('login');
    }
    setResetting(false);
  };

  if (mode === 'forgot') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blood-50 to-white dark:from-gray-950 dark:to-gray-900 px-4">
        <div className="w-full max-w-md">
          <button onClick={() => setMode('login')} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </button>
          <div className="card p-8 animate-fade-in">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 text-white shadow-lg">
                <KeyRound className="h-7 w-7" />
              </div>
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
              <p className="mt-1 text-sm text-gray-500">Enter your email and we'll send a reset link</p>
            </div>
            <form onSubmit={submitReset} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button type="submit" disabled={resetting} className="btn-primary w-full py-3">
                {resetting ? 'Sending…' : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blood-50 to-white dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="w-full max-w-md">
        <button onClick={() => onNavigate('home')} className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="h-4 w-4" /> Back home
        </button>
        <div className="card p-8 animate-fade-in">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blood-500 to-blood-700 text-white shadow-lg">
              <Droplet className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to your LifeFlow account</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={emailVal}
                  onChange={(e) => setEmailVal(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-blood-600 hover:text-blood-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in…' : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <button onClick={() => onNavigate('register')} className="font-semibold text-blood-600 hover:text-blood-700">
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
