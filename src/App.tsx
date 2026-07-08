import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider, useTheme } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { NotificationsProvider, useNotifications } from './lib/notifications';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { AdminLogin } from './pages/AdminLogin';
import { Register } from './pages/Register';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DonorSearch } from './pages/DonorSearch';
import { BloodRequests } from './pages/BloodRequests';
import { EligibilityChecker } from './pages/EligibilityChecker';
import { Notifications } from './pages/Notifications';
import { Layout } from './components/Layout';
import { Droplet, Home, MapPin, Heart, CheckCircle2, Bell, Shield } from 'lucide-react';

type Route = 'home' | 'login' | 'admin-login' | 'register' | 'dashboard' | 'admin' | 'search' | 'requests' | 'eligibility' | 'notifications';

function getRoute(): Route {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  const valid: Route[] = ['home', 'login', 'admin-login', 'register', 'dashboard', 'admin', 'search', 'requests', 'eligibility', 'notifications'];
  return (valid.includes(hash as Route) ? hash : 'home') as Route;
}

function navigate(route: Route) {
  window.location.hash = `/${route}`;
}

function Router() {
  const { user, profile, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { unreadCount, bellRef } = useNotifications();
  const [route, setRoute] = useState<Route>(getRoute());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => {
      setRoute(getRoute());
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('home');
  }, [signOut]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Droplet className="h-12 w-12 text-blood-600 animate-pulse" />
            <span className="absolute -inset-2 rounded-full border-2 border-blood-400 animate-pulse-ring" />
          </div>
          <p className="text-sm text-gray-500">Loading LifeFlow…</p>
        </div>
      </div>
    );
  }

  const isAuthed = !!user && !!profile;
  const isAdmin = profile?.is_admin;

  if (user && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blood-50">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blood-200 border-t-blood-600" />
          </div>
          <p className="text-sm text-gray-500">Signing in…</p>
        </div>
      </div>
    );
  }

  // Public routes
  if (route === 'home' && !isAuthed) return <Landing onNavigate={navigate} />;
  if (route === 'login' && !isAuthed) return <Login onNavigate={navigate} />;
  if (route === 'register' && !isAuthed) return <Register onNavigate={navigate} />;
  if (route === 'admin-login' && !isAuthed) return <AdminLogin onNavigate={navigate} />;

  // Redirect authed users away from auth pages
  if ((route === 'login' || route === 'register' || route === 'admin-login') && isAuthed) {
    navigate(isAdmin ? 'admin' : 'dashboard');
    return null;
  }
  if (route === 'home' && isAuthed) {
    navigate(isAdmin ? 'admin' : 'dashboard');
    return null;
  }

  // Protected routes — unauthenticated fallback
  if (!isAuthed) {
    navigate(route === 'admin' ? 'admin-login' : 'login');
    return null;
  }

  // Admin-only route guard
  if (route === 'admin' && !isAdmin) {
    navigate('dashboard');
    return null;
  }

  const navItems: { route: Route; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { route: isAdmin ? 'admin' : 'dashboard', label: isAdmin ? 'Admin Panel' : 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { route: 'search', label: 'Find Donors', icon: <MapPin className="h-4 w-4" /> },
    { route: 'requests', label: 'Blood Requests', icon: <Heart className="h-4 w-4" /> },
    { route: 'eligibility', label: 'Eligibility', icon: <CheckCircle2 className="h-4 w-4" /> },
    { route: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    ...(!isAdmin ? [{ route: 'admin-login' as Route, label: 'Admin', icon: <Shield className="h-4 w-4" /> }] : []),
  ];

  const page = (() => {
    switch (route) {
      case 'dashboard': return <UserDashboard />;
      case 'admin': return <AdminDashboard />;
      case 'search': return <DonorSearch />;
      case 'requests': return <BloodRequests />;
      case 'eligibility': return <EligibilityChecker />;
      case 'notifications': return <Notifications />;
      default: return <UserDashboard />;
    }
  })();

  return (
    <Layout
      navItems={navItems}
      currentRoute={route}
      onNavigate={navigate}
      profile={profile}
      theme={theme}
      onToggleTheme={toggle}
      onSignOut={handleSignOut}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      unreadCount={unreadCount}
      bellRef={bellRef}
    >
      {page}
    </Layout>
  );
}

function AppWithNotifications() {
  return (
    <NotificationsProvider>
      <Router />
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppWithNotifications />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
