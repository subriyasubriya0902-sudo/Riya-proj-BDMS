import { useState } from 'react';
import { Droplet, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export function Login({ onNavigate }: { onNavigate: (r: any) => void }) {
  const { signIn } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      notify(error, 'error');
    } else {
      notify('Welcome back!', 'success');
      // router will redirect based on profile
      onNavigate('dashboard');
    }
  };

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
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
