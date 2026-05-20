// Конфигурация API
// Всегда используем прямой URL к бэкенду для простоты
// (прокси Vite в разработке не работает при serving production build)

const isBrowser = typeof window !== 'undefined';

// Определяем базовый URL API
// Всегда используем прямой URL, так как прокси может не работать
const API_BASE_URL = 'http://localhost:8000';

if (isBrowser) {
  console.log('🌐 Конфигурация API загружена');
  console.log('📍 Текущий URL:', window.location.href);
  console.log('🚀 API_BASE_URL установлен:', API_BASE_URL);
  console.log('⚠️  Используем прямой URL к бэкенду. Убедитесь, что бэкенд запущен на порту 8000');
}

export { API_BASE_URL };

// Ключи для sessionStorage (вместо localStorage)
export const SESSION_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user'
};

// Заголовки по умолчанию
export const getDefaultHeaders = () => {
  // Проверяем, доступен ли sessionStorage
  let token = null;
  if (isBrowser && window.sessionStorage) {
    token = sessionStorage.getItem(SESSION_KEYS.ACCESS_TOKEN);
    console.log('🔑 Токен из sessionStorage:', token ? 'есть' : 'отсутствует');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('✅ Добавлен заголовок Authorization');
  }
  
  return headers;
};

// Вспомогательные функции для отладки
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
  
  console.log('🔧 API Configuration:', envInfo);
};