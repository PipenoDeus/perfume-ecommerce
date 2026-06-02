import React, { createContext, useState, useEffect } from 'react';
import { authService, supabase } from '../services/supabase';
import { clearCSRFToken } from '../services/csrfService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const normalizeRole = (value) => {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalized === 'admin' || normalized === 'dueno') return 'admin';
    return 'cliente';
  };

  const fetchUserRole = async (userId) => {
    try {
      const roleQuery = supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: { code: 'TIMEOUT', message: 'Role fetch timeout' } }),
          8000
        )
      );

      const { data, error } = await Promise.race([roleQuery, timeoutPromise]);

      if (error) {
        console.error('Error fetching role:', error);
        
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

            if (!insertError) {
              setUserRole('cliente');
            }
            // Si hay error al insertar, mantener el rol actual (no cambiar a 'cliente')
          }
        } else if (error.code === 'TIMEOUT') {
          console.warn('Role fetch timeout - manteniendo rol actual');
          // No cambiar el rol en caso de timeout
        }
        // En otros casos, tampoco cambiar el rol
      } else {
        const newRole = normalizeRole(data?.role);
        console.log('Rol obtenido:', newRole);
        setUserRole(newRole);
      }
    } catch (error) {
      console.error('Error inesperado al obtener rol:', error);
      // No cambiar el rol en caso de error inesperado
    }
  };

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    // Update UI immediately
    setUser(null);
    setUserRole(null);
    // Clear CSRF token
    clearCSRFToken();
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event); // Debug
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Solo recargar el rol si NO es un token refresh o si el rol es null
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed - manteniendo rol actual');
          // No hacer nada, mantener el rol actual
        } else {
          console.log('Recargando rol de usuario');
          await fetchUserRole(currentUser.id);
        }
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
