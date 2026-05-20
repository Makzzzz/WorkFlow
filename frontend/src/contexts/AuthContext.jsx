import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authService } from '../services/api.js';
import { SESSION_KEYS } from '../config.js';
import { 
  getAccessToken, 
  getRefreshToken, 
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

  // Инициализация аутентификации при загрузке приложения
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Инициализируем аутентификацию (очищаем старый localStorage)
        const initResult = initializeAuth();
        console.log('🔧 Инициализация аутентификации:', initResult);
        
        const storedToken = getAccessToken();
        const storedUser = getUserData();
        
        if (storedToken) {
          // Устанавливаем токен из sessionStorage
          setToken(storedToken);
          
          try {
            // Пытаемся получить актуальные данные пользователя с сервера
            const userData = await authService.getCurrentUser();
            setUser(userData);
            saveUserData(userData);
          } catch (error) {
            console.warn('Не удалось получить данные пользователя с сервера:', error);
            // Если не удалось получить с сервера, используем сохраненные данные
            if (storedUser) {
              setUser(storedUser);
            } else {
              // Если нет сохраненных данных, очищаем токен (он невалидный)
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

  // Функция входа
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    console.log('Начинаем вход с email:', email);
    
    try {
      // Выполняем вход через API
      console.log('Вызываем authService.login...');
      const response = await authService.login({
        email: email.trim(),
        password: password.trim()
      });
      console.log('Ответ API при входе (токены):', {
        hasAccessToken: !!response.access_token,
        hasRefreshToken: !!response.refresh_token
      });
      
      // Получаем данные пользователя
      console.log('Вызываем authService.getCurrentUser...');
      const userData = await authService.getCurrentUser();
      console.log('Данные пользователя:', userData);
      
      // Сохраняем состояние
      setUser(userData);
      setToken(response.access_token);
      
      // Сохраняем в sessionStorage
      saveAuthTokens({
        access_token: response.access_token,
        refresh_token: response.refresh_token
      });
      saveUserData(userData);
      
      console.log('Вход успешен');
      return { success: true, user: userData };
    } catch (error) {
      console.error('Ошибка входа:', error);
      console.error('Детали ошибки входа:', {
        status: error.status,
        message: error.message,
        data: error.data
      });
      setError(error.message || 'Ошибка входа');
      return { success: false, error: error.message || 'Ошибка входа' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Функция регистрации
  const register = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);
    
    // Импортируем API_BASE_URL для отладки
    import('../config.js').then(({ API_BASE_URL, debugApiConfig }) => {
      console.log('🔧 DEBUG - API_BASE_URL для регистрации:', API_BASE_URL);
      console.log('🔧 DEBUG - Полная конфигурация API:', debugApiConfig());
    }).catch(() => {
      console.log('🔧 DEBUG - Не удалось импортировать конфиг для отладки');
    });
    
    console.log('🔧 DEBUG - Начинаем регистрацию с данными:', {
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      password: '[СКРЫТО]'
    });
    
    try {
      // Выполняем регистрацию через API
      console.log('🔧 DEBUG - Вызываем authService.register...');
      const response = await authService.register(userData);
      console.log('🔧 DEBUG - Ответ API при регистрации:', response);
      
      // После успешной регистрации автоматически входим
      console.log('🔧 DEBUG - Пытаемся автоматически войти после регистрации...');
      const loginResult = await login(userData.email, userData.password);
      console.log('🔧 DEBUG - Результат автоматического входа:', loginResult);
      
      if (!loginResult.success) {
        // Если вход не удался, все равно считаем регистрацию успешной
        // (пользователю нужно подтвердить email)
        console.log('🔧 DEBUG - Автоматический вход не удался, возвращаем успех с требованием подтверждения email');
        return {
          success: true,
          user: response,
          requiresEmailConfirmation: true
        };
      }
      
      console.log('✅ DEBUG - Регистрация и автоматический вход успешны');
      return { success: true, user: loginResult.user };
    } catch (error) {
      console.error('❌ DEBUG - Ошибка регистрации:', error);
      console.error('❌ DEBUG - Детали ошибки:', {
        status: error.status,
        message: error.message,
        data: error.data
      });
      
      let errorMessage = 'Ошибка регистрации';
      if (error.status === 400 && error.data?.detail?.includes('Email')) {
        errorMessage = 'Этот email уже зарегистрирован';
      } else if (error.status === 422) {
        errorMessage = 'Некорректные данные. Проверьте поля формы';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  // Функция выхода
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Ошибка выхода:', error);
    }
    
    // Очищаем состояние
    setUser(null);
    setToken(null);
    setError(null);
    
    // Очищаем sessionStorage
    clearAuthData();
  }, []);

  // Функция обновления токена
  const refreshToken = useCallback(async () => {
    try {
      const response = await authService.refreshToken();
      
      if (response.access_token) {
        setToken(response.access_token);
        // Обновляем токен в sessionStorage
        if (window.sessionStorage) {
          sessionStorage.setItem(SESSION_KEYS.ACCESS_TOKEN, response.access_token);
        }
        return response.access_token;
      }
    } catch (error) {
      console.error('Не удалось обновить токен:', error);
      // Если не удалось обновить токен, разлогиниваем пользователя
      logout();
      throw error;
    }
  }, [logout]);

  // Функция обновления данных пользователя
  const updateUser = useCallback(async (userData) => {
    try {
      // В будущем можно добавить вызов API для обновления пользователя
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      saveUserData(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      return { success: false, error: error.message };
    }
  }, [user]);

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

// Хук для использования контекста аутентификации
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};