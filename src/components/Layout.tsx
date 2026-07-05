import { ReactNode } from 'react';
import { Profile } from '../lib/supabase';
import { Droplet, Moon, Sun, Bell, LogOut, Menu, X } from 'lucide-react';

interface NavItem {
  route: string;
  label: string;
  icon: ReactNode;
}

export function Layout({
  navItems,
  currentRoute,
  onNavigate,
  profile,
  theme,
  onToggleTheme,
  onSignOut,
  menuOpen,
  setMenuOpen,
  unreadCount = 0,
  children,
}: {
  navItems: NavItem[];
  currentRoute: string;
  onNavigate: (r: any) => void;
  profile: Profile | null;
  theme: string;
  onToggleTheme: () => void;
  onSignOut: () => void;
  menuOpen: boolean;
  setMenuOpen: (b: boolean) => void;
  unreadCount?: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button onClick={() => onNavigate(profile?.is_admin ? 'admin' : 'dashboard')} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blood-500 to-blood-700 text-white shadow-md">
                <Droplet className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold text-gray-900 dark:text-white">LifeFlow</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="btn-ghost h-9 w-9 !p-0"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => onNavigate('notifications')}
              className="btn-ghost relative h-9 w-9 !p-0"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blood-600 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blood-100 text-blood-700 dark:bg-blood-900/40 dark:text-blood-300 text-sm font-semibold">
                {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white leading-tight">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 leading-tight">{profile?.is_admin ? 'Administrator' : profile?.blood_group}</p>
              </div>
            </div>
            <button onClick={onSignOut} className="btn-ghost h-9 w-9 !p-0" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-60 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 min-h-[calc(100vh-4rem)] py-6 px-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.route}
                onClick={() => onNavigate(item.route)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  currentRoute === item.route
                    ? 'bg-blood-50 text-blood-700 dark:bg-blood-900/30 dark:text-blood-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-30" onClick={() => setMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 py-4 px-3 animate-slide-in">
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.route}
                    onClick={() => onNavigate(item.route)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      currentRoute === item.route
                        ? 'bg-blood-50 text-blood-700 dark:bg-blood-900/30 dark:text-blood-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
