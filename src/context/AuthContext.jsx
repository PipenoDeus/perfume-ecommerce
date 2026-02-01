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
      console.log('[AuthContext] fetchUserRole - userId:', userId);
      const roleQuery = supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: { code: 'TIMEOUT', message: 'Role fetch timeout' } }), 3000)
      );

      const { data, error } = await Promise.race([roleQuery, timeoutPromise]);

      console.log('[AuthContext] Query result - data:', data, 'error:', error);

      if (error) {
        console.error('[AuthContext] Error fetching user role:', error, 'code:', error.code);
        
        // Si el usuario no existe en public.users, crear un registro por defecto
        if (error.code === 'PGRST116') {
          console.log('[AuthContext] Usuario no encontrado en public.users (PGRST116), creando...');
          const { data: userData, error: getUserError } = await supabase.auth.getUser();
          console.log('[AuthContext] getUser result:', { userData, getUserError });
          
          if (userData?.user) {
            const currentUser = userData.user;
            console.log('[AuthContext] Intentando insertar usuario:', {
              id: userId,
              email: currentUser.email,
              full_name: currentUser.user_metadata?.full_name || ''
            });
            
            const { data: insertData, error: insertError } = await supabase
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
            
            if (insertError) {
              console.error('[AuthContext] Error creando usuario en public.users:', insertError);
              console.error('[AuthContext] insertError details:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
              });
              setUserRole('cliente');
            } else {
              console.log('[AuthContext] Usuario creado exitosamente en public.users:', insertData);
              setUserRole('cliente');
            }
          } else {
            console.error('[AuthContext] No se pudo obtener currentUser');
            setUserRole('cliente');
          }
        } else if (error.code === 'TIMEOUT') {
          console.warn('[AuthContext] Role fetch timeout, asignando cliente por defecto');
          setUserRole('cliente');
        } else {
          console.log('[AuthContext] Error code no es PGRST116, asignando cliente por defecto');
          setUserRole('cliente');
        }
      } else {
        console.log('[AuthContext] Usuario encontrado, role:', data?.role);
        setUserRole(data?.role || 'cliente');
      }
    } catch (error) {
      console.error('[AuthContext] Error checking role (catch):', error);
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
      console.log('[AuthContext] signOut start');
      // Local signOut is fast, but add a timeout to avoid hanging UI
      const signOutPromise = supabase.auth.signOut({ scope: 'local' });
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      const result = await Promise.race([signOutPromise, timeoutPromise]);

      const error = result?.error;
      if (error) console.error('[AuthContext] signOut error:', error);
      console.log('[AuthContext] signOut done');
    } finally {
      console.log('[AuthContext] clearing user state');
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
      console.log('[AuthContext] onAuthStateChange event:', _event, 'session:', session);
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
