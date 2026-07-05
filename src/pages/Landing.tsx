import { Droplet, Heart, MapPin, Shield, Bell, Users, ArrowRight, Activity, Award, Phone } from 'lucide-react';
import { BLOOD_GROUPS } from '../lib/supabase';

export function Landing({ onNavigate }: { onNavigate: (r: any) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blood-50/40 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blood-500 to-blood-700 text-white shadow-md">
              <Droplet className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold text-gray-900 dark:text-white">LifeFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('admin-login')} className="btn-ghost flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> Admin
            </button>
            <button onClick={() => onNavigate('login')} className="btn-ghost">Sign in</button>
            <button onClick={() => onNavigate('register')} className="btn-primary">Get Started</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blood-200/40 blur-3xl dark:bg-blood-900/20" />
          <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl dark:bg-rose-900/10" />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-in">
              <span className="badge bg-blood-100 text-blood-700 dark:bg-blood-900/40 dark:text-blood-300 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-blood-500 animate-pulse" /> Saving lives together
              </span>
              <h1 className="font-display text-4xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
                Every drop <span className="text-blood-600">saves a life</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-gray-600 dark:text-gray-300">
                Connect donors with those in need. Find nearby donors, respond to emergency
                blood requests, and track your life-saving contributions — all in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => onNavigate('register')} className="btn-primary px-6 py-3 text-base">
                  Become a Donor <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => onNavigate('login')} className="btn-secondary px-6 py-3 text-base">
                  Sign in
                </button>
              </div>
              <div className="mt-10 flex gap-8">
                <div>
                  <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">8</p>
                  <p className="text-sm text-gray-500">Blood types</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">24/7</p>
                  <p className="text-sm text-gray-500">Emergency SOS</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">Real-time</p>
                  <p className="text-sm text-gray-500">Notifications</p>
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative animate-fade-in">
              <div className="relative mx-auto max-w-md">
                <div className="card p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Blood Inventory</p>
                      <p className="font-display text-xl font-bold text-gray-900 dark:text-white">Live Status</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40">
                      <Activity className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-4 gap-3">
                    {BLOOD_GROUPS.map((g, i) => (
                      <div
                        key={g}
                        className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800"
                      >
                        <Droplet className={`h-5 w-5 ${i % 2 ? 'text-blood-400' : 'text-blood-600'}`} />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{g}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-xl bg-blood-50 p-4 dark:bg-blood-900/20">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-blood-600" />
                      <p className="text-sm font-medium text-blood-700 dark:text-blood-300">Emergency Request</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      O- needed at City Hospital — 3 units, 12 donors notified
                    </p>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-6 card p-4 w-44 hidden sm:block">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">5 Donations</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Lifesaver badge earned</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Built to save lives</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">Everything you need to donate and request blood, fast.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Users className="h-6 w-6" />, title: 'Donor Network', desc: 'Join a community of verified donors ready to help when needed.' },
            { icon: <MapPin className="h-6 w-6" />, title: 'Nearby Search', desc: 'Find donors within 5, 10, or 20 km using geolocation.' },
            { icon: <Bell className="h-6 w-6" />, title: 'Instant Alerts', desc: 'Get notified the moment a matching blood request is created.' },
            { icon: <Shield className="h-6 w-6" />, title: 'Secure & Private', desc: 'Your data is protected with row-level security and JWT auth.' },
            { icon: <Heart className="h-6 w-6" />, title: 'Emergency SOS', desc: 'One-tap emergency broadcast to nearby matching donors.' },
            { icon: <Award className="h-6 w-6" />, title: 'Donor Certificates', desc: 'Generate a PDF certificate for every donation you make.' },
          ].map((f) => (
            <div key={f.title} className="card p-6 transition-transform hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blood-100 text-blood-600 dark:bg-blood-900/40 dark:text-blood-300">
                {f.icon}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-gray-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blood-600 to-blood-800 px-8 py-14 text-center text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <Droplet className="mx-auto h-10 w-10" />
          <h2 className="mt-4 font-display text-3xl font-bold">Ready to save a life?</h2>
          <p className="mt-2 text-blood-100">Join thousands of donors making a difference every day.</p>
          <button onClick={() => onNavigate('register')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blood-700 hover:bg-blood-50">
            Register as a Donor <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-blood-600" />
            <span className="font-display font-bold text-gray-900 dark:text-white">LifeFlow</span>
            <span className="text-sm text-gray-500">© 2026 — Saving lives, one drop at a time.</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> Emergency: 911</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
