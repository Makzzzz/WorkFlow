import { SESSION_KEYS } from '../config.js';

const isBrowser = typeof window !== 'undefined';

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
}

export function getAccessToken() {
  if (!isBrowser || !window.sessionStorage) return null;
  return sessionStorage.getItem(SESSION_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken() {
  if (!isBrowser || !window.sessionStorage) return null;
  return sessionStorage.getItem(SESSION_KEYS.REFRESH_TOKEN);
}

export function saveUserData(userData) {
  if (!isBrowser || !window.sessionStorage) {
    console.warn('sessionStorage недоступен');
    return;
  }
  sessionStorage.setItem(SESSION_KEYS.USER, JSON.stringify(userData));
}

export function getUserData() {
  if (!isBrowser || !window.sessionStorage) return null;
  const userJson = sessionStorage.getItem(SESSION_KEYS.USER);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Ошибка парсинга данных пользователя:', error);
    return null;
  }
}

export function clearAuthData() {
  if (!isBrowser || !window.sessionStorage) return;
  sessionStorage.removeItem(SESSION_KEYS.ACCESS_TOKEN);
  sessionStorage.removeItem(SESSION_KEYS.REFRESH_TOKEN);
  sessionStorage.removeItem(SESSION_KEYS.USER);
}

export function isAuthenticated() {
  return !!getAccessToken();
}

export function initializeAuth() {
  if (!isBrowser) return;
  if (!window.sessionStorage) {
    console.error('sessionStorage недоступен в этом браузере');
    return;
  }
  return {
    hasToken: !!getAccessToken(),
    user: getUserData()
  };
}

export function updateAccessToken(newAccessToken) {
  if (!isBrowser || !window.sessionStorage) return;
  sessionStorage.setItem(SESSION_KEYS.ACCESS_TOKEN, newAccessToken);
}
