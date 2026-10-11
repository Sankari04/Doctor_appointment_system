import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        api.defaults.headers.common['Authorization'] = 'Bearer ' + token;
        try {
          const response = await api.get('/auth/me');
          setUser({
            id: response.data.id,
            email: response.data.email,
            role: response.data.role,
            name: response.data.profile ? response.data.profile.name : (response.data.role === 'admin' ? 'Admin' : 'User'),
            profileId: response.data.profile ? response.data.profile.id : null,
            isVerified: response.data.profile ? response.data.profile.is_verified === 1 || response.data.profile.is_verified === true : true
          });
        } catch (error) {
          console.error('Invalid token or connection error:', error.message);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('token', receivedToken);
      api.defaults.headers.common['Authorization'] = 'Bearer ' + receivedToken;
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (error) {
      console.error('Login error details:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check credentials.'
      };
    }
  };

  const register = async (registerData) => {
    try {
      const response = await api.post('/auth/register', registerData);
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('token', receivedToken);
      api.defaults.headers.common['Authorization'] = 'Bearer ' + receivedToken;
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (error) {
      console.error('Registration error details:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateUserData = (updatedInfo) => {
    setUser(prev => ({
      ...prev,
      ...updatedInfo
    }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUserData, api }}>
      {children}
    </AuthContext.Provider>
  );
};
