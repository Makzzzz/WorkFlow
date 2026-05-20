// Утилиты для работы с аутентификацией через sessionStorage
// Заменяет устаревшие функции из storage.js и auth-init.js

import { SESSION_KEYS } from '../config.js';

const isBrowser = typeof window !== 'undefined';

/**
 * Сохраняет токены аутентификации в sessionStorage
 * @param {Object} tokens - Объект с access_token и refresh_token
 */
export function saveAuthTokens(tokens) {
  if (!isBrowser || !window.sessionStorage) {
    console.warn('sessionStorage недоступен');
    return;
  }
  
  if (tokens.access_token) {
    sessionStorage.setItem(SESSION_KEYS.ACCESS_TOKEN, tokens.access_token);
  }
  
  if (tokens.refresh_token) {
    sessionStorage.setItem(SESSION_KEYS.REFRESH_TOKEN, tokens.refresh_token);
  }
  
  console.log('🔐 Токены сохранены в sessionStorage');
}

/**
 * Получает access token из sessionStorage
 * @returns {string|null} Access token или null
 */
export function getAccessToken() {
  if (!isBrowser || !window.sessionStorage) {
    return null;
  }
  
  return sessionStorage.getItem(SESSION_KEYS.ACCESS_TOKEN);
}

/**
 * Получает refresh token из sessionStorage
 * @returns {string|null} Refresh token или null
 */
export function getRefreshToken() {
  if (!isBrowser || !window.sessionStorage) {
    return null;
  }
  
  return sessionStorage.getItem(SESSION_KEYS.REFRESH_TOKEN);
}

/**
 * Сохраняет информацию о пользователе в sessionStorage
 * @param {Object} userData - Данные пользователя
 */
export function saveUserData(userData) {
  if (!isBrowser || !window.sessionStorage) {
    console.warn('sessionStorage недоступен');
    return;
  }
  
  sessionStorage.setItem(SESSION_KEYS.USER, JSON.stringify(userData));
  console.log('👤 Данные пользователя сохранены в sessionStorage');
}

/**
 * Получает информацию о пользователе из sessionStorage
 * @returns {Object|null} Данные пользователя или null
 */
export function getUserData() {
  if (!isBrowser || !window.sessionStorage) {
    return null;
  }
  
  const userJson = sessionStorage.getItem(SESSION_KEYS.USER);
  if (!userJson) {
    return null;
  }
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Ошибка парсинга данных пользователя:', error);
    return null;
  }
}

/**
 * Очищает все данные аутентификации из sessionStorage
 */
export function clearAuthData() {
  if (!isBrowser || !window.sessionStorage) {
    return;
  }
  
  sessionStorage.removeItem(SESSION_KEYS.ACCESS_TOKEN);
  sessionStorage.removeItem(SESSION_KEYS.REFRESH_TOKEN);
  sessionStorage.removeItem(SESSION_KEYS.USER);
  
  console.log('🧹 Данные аутентификации очищены из sessionStorage');
}

/**
 * Проверяет, авторизован ли пользователь (есть ли access token)
 * @returns {boolean} true если пользователь авторизован
 */
export function isAuthenticated() {
  return !!getAccessToken();
}

/**
 * Инициализирует аутентификацию - очищает старые данные localStorage
 * и проверяет доступность sessionStorage
 */
export function initializeAuth() {
  if (!isBrowser) {
    return;
  }
  
  console.log('🔧 Инициализация аутентификации (zero localStorage)');
  
  // localStorage больше не используется - все данные хранятся в sessionStorage
  // Старые данные из localStorage будут автоматически удалены браузером
  
  // Проверяем доступность sessionStorage
  if (!window.sessionStorage) {
    console.error('❌ sessionStorage недоступен в этом браузере');
    return;
  }
  
  console.log('✅ sessionStorage доступен');
  
  // Проверяем, есть ли токены в sessionStorage
  const hasToken = !!getAccessToken();
  console.log(`🔐 Токен в sessionStorage: ${hasToken ? 'есть' : 'отсутствует'}`);
  
  return {
    hasToken,
    user: getUserData()
  };
}

/**
 * Обновляет access token в sessionStorage
 * @param {string} newAccessToken - Новый access token
 */
export function updateAccessToken(newAccessToken) {
  if (!isBrowser || !window.sessionStorage) {
    return;
  }
  
  sessionStorage.setItem(SESSION_KEYS.ACCESS_TOKEN, newAccessToken);
  console.log('🔄 Access token обновлен в sessionStorage');
}