// Утилиты для работы с URL параметрами в hash-based routing
// Заменяет использование localStorage для передачи параметров между страницами

/**
 * Получить параметр из URL hash
 * @param {string} param - Имя параметра
 * @returns {string|number|null} Значение параметра (число если можно преобразовать)
 */
export function getUrlParam(param) {
  if (typeof window === 'undefined') return null;
  
  const hash = window.location.hash;
  const queryStart = hash.indexOf('?');
  if (queryStart === -1) return null;
  
  const params = new URLSearchParams(hash.substring(queryStart + 1));
  const value = params.get(param);
  
  if (value === null) return null;
  
  // Пытаемся преобразовать в число если это число
  const numValue = Number(value);
  return isNaN(numValue) ? value : numValue;
}

/**
 * Установить параметр в URL hash
 * @param {string} param - Имя параметра
 * @param {string|number|null} value - Значение параметра (null для удаления)
 */
export function setUrlParam(param, value) {
  if (typeof window === 'undefined') return;
  
  const [baseHash, existingQuery = ''] = window.location.hash.split('?');
  const params = new URLSearchParams(existingQuery);
  
  if (value == null) {
    params.delete(param);
  } else {
    params.set(param, String(value));
  }
  
  const queryString = params.toString();
  const newHash = queryString ? `${baseHash}?${queryString}` : baseHash;
  
  if (window.location.hash !== newHash) {
    window.location.hash = newHash;
  }
}

/**
 * Навигация на страницу с параметрами
 * @param {string} page - Имя страницы (без #)
 * @param {Object} params - Параметры для URL
 */
export function navigateTo(page, params = {}) {
  if (typeof window === 'undefined') return;
  
  const queryString = new URLSearchParams(params).toString();
  window.location.hash = queryString ? `#${page}?${queryString}` : `#${page}`;
}

/**
 * Получить текущую страницу из hash
 * @returns {string} Имя текущей страницы
 */
export function getCurrentPage() {
  if (typeof window === 'undefined') return 'home';
  
  const hash = window.location.hash;
  const pagePart = hash.split('?')[0];
  return pagePart.replace('#', '') || 'home';
}

/**
 * Получить все параметры из URL как объект
 * @returns {Object} Объект с параметрами
 */
export function getAllUrlParams() {
  if (typeof window === 'undefined') return {};
  
  const hash = window.location.hash;
  const queryStart = hash.indexOf('?');
  if (queryStart === -1) return {};
  
  const params = new URLSearchParams(hash.substring(queryStart + 1));
  const result = {};
  
  for (const [key, value] of params.entries()) {
    const numValue = Number(value);
    result[key] = isNaN(numValue) ? value : numValue;
  }
  
  return result;
}

/**
 * Очистить все параметры из URL
 */
export function clearAllUrlParams() {
  if (typeof window === 'undefined') return;
  
  const hash = window.location.hash;
  const baseHash = hash.split('?')[0];
  window.location.hash = baseHash;
}