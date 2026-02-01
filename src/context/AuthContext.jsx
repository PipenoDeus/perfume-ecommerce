import React, { createContext, useState, useEffect } from 'react';
import { authService, supabase } from '../services/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchUserRole = async (userId) => {
    try {
      const roleQuery = supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: { code: 'TIMEOUT', message: 'Role fetch timeout' } }), 3000)
      );

      const { data, error } = await Promise.race([roleQuery, timeoutPromise]);

      if (error) {
        // Si el usuario no existe en public.users, crear un registro por defecto
        if (error.code === 'PGRST116') {
          const { data: userData } = await supabase.auth.getUser();

          if (userData?.user) {
            const currentUser = userData.user;

            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: currentUser.email,
                full_name: currentUser.user_metadata?.full_name || '',
                phone: currentUser.user_metadata?.phone || null,
                address: currentUser.user_metadata?.address || null,
                city: currentUser.user_metadata?.city || null,
                postal_code: currentUser.user_metadata?.postal_code || null,
                role: 'cliente'
              });

            setUserRole(insertError ? 'cliente' : 'cliente');
          } else {
            setUserRole('cliente');
          }
        } else if (error.code === 'TIMEOUT') {
          setUserRole('cliente');
        } else {
          setUserRole('cliente');
        }
      } else {
        setUserRole(data?.role || 'cliente');
      }
    } catch (error) {
      setUserRole('cliente');
    }
  };

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    // Update UI immediately
    setUser(null);
    setUserRole(null);
    try {
      // Local signOut is fast, but add a timeout to avoid hanging UI
      const signOutPromise = supabase.auth.signOut({ scope: 'local' });
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      await Promise.race([signOutPromise, timeoutPromise]);
    } finally {
      setIsLoggingOut(false);
    }
  };


  useEffect(() => {
    let ignore = false;

    const init = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!ignore) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchUserRole(currentUser.id);
        } else {
          setUserRole(null);
        }

        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserRole(currentUser.id);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userRole,
    loading,
    setUser,
    fetchUserRole,
    logout,
    isLoggingOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
