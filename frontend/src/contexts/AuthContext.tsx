import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { removeKey, writeJson } from '../lib/storage';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<unknown>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

function usePreferencesSync(user: User | null): void {
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const sync = async () => {
      try {
        const res = await api.get('api/me/preferences');
        if (res.ok) {
          const prefs = await res.json();
          if (prefs && typeof prefs === 'object') {
            if (!cancelled) writeJson('narvo_preferences', prefs);
          }
        }
      } catch (err) {
        /* ignore */
      }
    };
    sync();
    const onFocus = () => sync();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  usePreferencesSync(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    removeKey('narvo_user');
    removeKey('narvo_preferences');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const baseUrl = ((import.meta.env.VITE_PUBLIC_URL as string) || window.location.origin).replace(/\/$/, '');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${baseUrl}/auth` },
    });
    if (error) throw error;
    return data;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({ user, loading, signUp, signIn, signOut, signInWithGoogle, resetPassword }),
    [user, loading, signUp, signIn, signOut, signInWithGoogle, resetPassword]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
