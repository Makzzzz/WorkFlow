import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authService } from '../services/api.js';
import { SESSION_KEYS } from '../config.js';
import {
  getAccessToken,
  getUserData,
  saveAuthTokens,
  saveUserData,
  clearAuthData,
  initializeAuth
} from '../utils/auth-session.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        initializeAuth();
        const storedToken = getAccessToken();
        const storedUser = getUserData();

        if (storedToken) {
          setToken(storedToken);
          try {
            const userData = await authService.getCurrentUser();
            setUser(userData);
            saveUserData(userData);
          } catch (error) {
            console.warn('Не удалось получить данные пользователя с сервера:', error);
            if (storedUser) {
              setUser(storedUser);
            } else {
              clearAuthData();
              setToken(null);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка инициализации аутентификации:', error);
        setError('Ошибка инициализации аутентификации');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login({
        email: email.trim(),
        password: password.trim()
      });
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setToken(response.access_token);
      saveAuthTokens({
        access_token: response.access_token,
        refresh_token: response.refresh_token
      });
      saveUserData(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Ошибка входа:', error);
      setError(error.message || 'Ошибка входа');
      return { success: false, error: error.message || 'Ошибка входа' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const response = await authService.register(userData);
      return {
        success: true,
        user: response,
        requiresEmailConfirmation: true
      };
    } catch (error) {
      // Уже есть ожидающий код — просто показываем OTP окно
      if (error.status === 400 && error.data?.detail?.toLowerCase().includes('ожидает')) {
        return { success: true, requiresEmailConfirmation: true };
      }
      let errorMessage = 'Ошибка регистрации';
      if (error.status === 400 && (error.data?.detail?.includes('Email') || error.data?.detail?.includes('email'))) {
        errorMessage = 'Этот email уже зарегистрирован';
      } else if (error.status === 422) {
        errorMessage = 'Некорректные данные. Проверьте поля формы';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Ошибка выхода:', error);
    }
    setUser(null);
    setToken(null);
    setError(null);
    clearAuthData();
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      if (response.access_token) {
        setToken(response.access_token);
        if (window.sessionStorage) {
          sessionStorage.setItem(SESSION_KEYS.ACCESS_TOKEN, response.access_token);
        }
        return response.access_token;
      }
    } catch (error) {
      console.error('Не удалось обновить токен:', error);
      logout();
      throw error;
    }
  }, [logout]);

  const updateUser = useCallback(async (userData) => {
    try {
      const updatedUser = await authService.updateProfile(userData);
      setUser(updatedUser);
      saveUserData(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const value = {
    user,
    token,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};