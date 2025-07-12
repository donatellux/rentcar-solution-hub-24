
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Agency {
  id: string;
  agency_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_path: string | null;
  theme: string | null;
  slogan: string | null;
  langue: string | null;
  devise: string | null;
  website: string | null;
  rc: string | null;
  ice: string | null;
  patente: string | null;
  tax_id: string | null;
  created_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  agency: Agency | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, agencyData: Partial<Agency>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
  refreshAgency: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAgency = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching agency:', error);
        return;
      }

      setAgency(data);
    } catch (error) {
      console.error('Error fetching agency:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchAgency(session.user.id);
          }, 0);
        } else {
          setAgency(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchAgency(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, agencyData: Partial<Agency>) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) return { error };

    // Create agency entry
    if (data.user) {
      const { error: agencyError } = await supabase
        .from('agencies')
        .insert({
          id: data.user.id,
          agency_name: agencyData.agency_name,
          email: email,
          phone: agencyData.phone,
          address: agencyData.address,
          theme: 'light',
          langue: 'fr',
          devise: 'MAD'
        });

      if (agencyError) {
        console.error('Error creating agency:', agencyError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAgency(null);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  };

  const refreshAgency = async () => {
    if (user) {
      await fetchAgency(user.id);
    }
  };

  const value = {
    user,
    session,
    agency,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refreshAgency,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
