import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile } from './supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: Record<string, unknown>) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Profile load error:', error.message);
      return;
    }
    setProfile(data as Profile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadProfile(newSession.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = async (email: string, password: string, metadata: Record<string, unknown>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) return { error: error.message };
    if (data.user) {
      // signUp returns a session when email confirmation is disabled.
      // Activate it before inserting the profile so auth.uid() resolves
      // and the RLS INSERT policy (auth.uid() = id) passes.
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }
      const isAdmin = metadata.admin_code === 'ADMIN2026';
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: metadata.full_name,
        phone: metadata.phone,
        age: metadata.age,
        gender: metadata.gender,
        blood_group: metadata.blood_group,
        address: metadata.address,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        is_available: true,
        is_admin: isAdmin,
      });
      if (profileError) return { error: profileError.message };

      // Notify all admins of new registration (fire-and-forget)
      ;(async () => {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true)
          .neq('id', data.user!.id);
        if (admins && admins.length > 0) {
          await supabase.from('notifications').insert(
            admins.map((a: { id: string }) => ({
              recipient_id: a.id,
              request_id: null,
              title: 'New donor registered',
              message: `${metadata.full_name} (${metadata.blood_group}, ${metadata.address || 'no address'}) has joined LifeFlow as a ${isAdmin ? 'admin' : 'donor'}.`,
              type: 'system' as const,
            }))
          );
        }
      })();
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Fire-and-forget: send welcome-back email without blocking login
    if (data.session) {
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        },
      ).catch(() => {
        // Non-critical — login still succeeds if email fails
      });
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
