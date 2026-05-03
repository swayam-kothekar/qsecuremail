/**
 * Authentication Context
 * Manages user authentication state
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('qsecuremail_token');
    const email = localStorage.getItem('qsecuremail_email');
    
    if (token && email) {
      // Verify token
      authAPI.verify()
        .then((response) => {
          if (response.data.valid) {
            setUser({ email: response.data.email });
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, appPassword) => {
    try {
      const response = await authAPI.login(email, appPassword);
      
      if (response.data.success) {
        const { token, email: userEmail } = response.data;
        
        localStorage.setItem('qsecuremail_token', token);
        localStorage.setItem('qsecuremail_email', userEmail);
        
        setUser({ email: userEmail });
        
        return { success: true };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('qsecuremail_token');
    localStorage.removeItem('qsecuremail_email');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
