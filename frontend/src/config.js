const isBrowser = typeof window !== 'undefined';

const API_BASE_URL = 'http://localhost:8000';

export { API_BASE_URL };

export const SESSION_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user'
};

export const getDefaultHeaders = () => {
  let token = null;
  if (isBrowser && window.sessionStorage) {
    token = sessionStorage.getItem(SESSION_KEYS.ACCESS_TOKEN);
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const debugApiConfig = () => {
  const envInfo = {
    IS_BROWSER: isBrowser,
    API_BASE_URL
  };

  if (isBrowser) {
    envInfo.CURRENT_URL = window.location.href;
    envInfo.HAS_TOKEN = !!sessionStorage.getItem(SESSION_KEYS.ACCESS_TOKEN);
    envInfo.IS_DEVELOPMENT = window.location.hostname === 'localhost' && window.location.port === '3000';
    envInfo.SESSION_STORAGE_AVAILABLE = !!window.sessionStorage;
  }

  console.log('API Configuration:', envInfo);
};
