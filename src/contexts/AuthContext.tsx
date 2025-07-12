
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
      console.log('Fetching agency for user:', userId);
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching agency:', error);
        return;
      }

      if (data) {
        console.log('Agency data found:', data);
        setAgency(data);
      } else {
        console.log('No agency found for user, will need to create one');
        setAgency(null);
      }
    } catch (error) {
      console.error('Error fetching agency:', error);
    }
  };

  const createAgencyRecord = async (userId: string, email: string, userData?: any) => {
    try {
      console.log('Creating agency record for user:', userId);
      const { data, error } = await supabase
        .from('agencies')
        .insert({
          id: userId,
          email: email,
          agency_name: userData?.full_name || userData?.name || null,
          theme: 'light',
          langue: 'fr',
          devise: 'MAD'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating agency:', error);
        return null;
      }

      console.log('Agency created successfully:', data);
      setAgency(data);
      return data;
    } catch (error) {
      console.error('Error creating agency:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // For Google sign-in, redirect to dashboard after successful authentication
          if (event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'google') {
            // Defer the agency fetch and redirect to avoid potential conflicts
            setTimeout(async () => {
              await fetchAgency(session.user.id);
              
              // If no agency found, create one for Google users
              const existingAgency = await supabase
                .from('agencies')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (!existingAgency.data) {
                await createAgencyRecord(
                  session.user.id, 
                  session.user.email!, 
                  session.user.user_metadata
                );
              }
              
              // Redirect to dashboard
              window.location.href = '/dashboard';
            }, 100);
          } else {
            // Regular flow for email/password
            setTimeout(async () => {
              await fetchAgency(session.user.id);
              
              // If no agency found, create one (this might happen for existing users)
              if (!agency) {
                await createAgencyRecord(session.user.id, session.user.email!);
              }
            }, 0);
          }
        } else {
          setAgency(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchAgency(session.user.id).then(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) return { error };
      
      // The onAuthStateChange will handle fetching the agency
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, agencyData: Partial<Agency>) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) return { error };

      // Create agency entry immediately after successful signup
      if (data.user && !data.session) {
        // User needs to confirm email, we'll create the agency record later
        console.log('User created, waiting for email confirmation');
      } else if (data.user && data.session) {
        // User is immediately signed in, create agency record
        await createAgencyRecord(data.user.id, email);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
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
        redirectTo: `${window.location.origin}/dashboard`
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
