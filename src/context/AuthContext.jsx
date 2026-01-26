import React, { createContext, useState, useEffect } from 'react';
import { authService, supabase } from '../services/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('cliente');
      } else {
        setUserRole(data?.role || 'cliente');
      }
    } catch (error) {
      console.error('Error checking role:', error);
      setUserRole('cliente');
    }
  };

  const logout = () => {
    setUser(null);
    setUserRole(null);
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          await fetchUserRole(currentUser.id);
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const value = {
    user,
    userRole,
    loading,
    setUser,
    fetchUserRole,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
