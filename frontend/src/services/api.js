import { API_BASE_URL, getDefaultHeaders, SESSION_KEYS } from '../config.js';
import { getRefreshToken, saveAuthTokens, clearAuthData } from '../utils/auth-session.js';

// Базовый запрос с обработкой обновления токена
async function requestWithAuth(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getDefaultHeaders();
  
  console.log('📤 Отправка запроса:', {
    endpoint,
    url,
    method: options.method || 'GET',
    hasAuthHeader: !!headers['Authorization']
  });
  
  // Если тело запроса - FormData, удаляем Content-Type, чтобы браузер установил правильный multipart/form-data
  const isFormData = options.body && options.body instanceof FormData;
  const finalHeaders = { ...headers, ...options.headers };
  
  if (isFormData) {
    delete finalHeaders['Content-Type'];
    console.log('📎 Обнаружен FormData, удален Content-Type заголовок');
  }
  
  const config = {
    ...options,
    headers: finalHeaders
  };
  
  try {
    console.log('🔧 Конфигурация запроса:', {
      url,
      method: config.method || 'GET',
      headers: config.headers
    });
    
    const response = await fetch(url, config);
    
    console.log('📥 Получен ответ:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    
    // Если токен истек (401), пытаемся обновить его один раз
    if (response.status === 401 && !options._retry) {
      console.log('🔐 Токен истек, пытаемся обновить...');
      
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('Refresh token отсутствует');
        }
        
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        if (!refreshResponse.ok) {
          throw new Error('Не удалось обновить токен');
        }
        
        const refreshData = await refreshResponse.json();
        
        if (refreshData.access_token) {
          // Сохраняем новый токен в sessionStorage
          saveAuthTokens({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token || refreshToken
          });
          
          // Обновляем заголовок авторизации
          config.headers['Authorization'] = `Bearer ${refreshData.access_token}`;
          
          // Повторяем оригинальный запрос
          config._retry = true;
          return requestWithAuth(endpoint, config);
        }
      } catch (refreshError) {
        console.error('Ошибка обновления токена:', refreshError);
        // Очищаем токены и разлогиниваем
        clearAuthData();
        
        // Перенаправляем на страницу входа
        if (window.location.hash !== '#login') {
          window.location.hash = '#login';
        }
        
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
      }
    }
    
    // Обработка ошибок HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = {
        status: response.status,
        message: errorData.detail || `HTTP error ${response.status}`,
        data: errorData
      };
      
      // Специальная обработка для 400 ошибок при регистрации
      if (response.status === 400 && errorData.detail) {
        error.message = errorData.detail;
      }
      
      throw error;
    }
    
    // Для пустого ответа (204 No Content)
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка API запроса:', error);
    
    // Обработка сетевых ошибок
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw {
        status: 0,
        message: 'Ошибка сети. Проверьте подключение к интернету.',
        data: { networkError: true }
      };
    }
    
    throw error;
  }
}

// Простой запрос без обработки обновления токена (для аутентификации)
async function simpleRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getDefaultHeaders();
  
  console.log('📤 [simpleRequest] Отправка запроса:', {
    endpoint,
    url,
    method: options.method || 'GET'
  });
  
  // Если тело запроса - FormData, удаляем Content-Type, чтобы браузер установил правильный multipart/form-data
  const isFormData = options.body && options.body instanceof FormData;
  const finalHeaders = { ...headers, ...options.headers };
  
  if (isFormData) {
    delete finalHeaders['Content-Type'];
    console.log('📎 [simpleRequest] Обнаружен FormData, удален Content-Type заголовок');
  }
  
  const config = {
    ...options,
    headers: finalHeaders
  };
  
  try {
    console.log('🔧 [simpleRequest] Конфигурация:', {
      url,
      method: config.method || 'GET'
    });
    
    const response = await fetch(url, config);
    
    console.log('📥 [simpleRequest] Получен ответ:', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.detail || `HTTP error ${response.status}`,
        data: errorData
      };
    }
    
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Сервис аутентификации
export const authService = {
  // Регистрация
  async register(userData) {
    return simpleRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  // Подтверждение email
  async confirmEmail(code) {
    return simpleRequest('/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },
  
  // Вход
  async login(credentials) {
    // Convert to URL-encoded form data (username/password for OAuth2)
    const formData = new URLSearchParams();
    formData.append('username', credentials.email); // FastAPI OAuth2 expects 'username' field
    formData.append('password', credentials.password);
    formData.append('grant_type', 'password'); // Required for OAuth2
    
    const data = await simpleRequest('/auth/login', {
      method: 'POST',
      body: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Сохраняем токены в sessionStorage
    if (data.access_token) {
      saveAuthTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      });
    }
    
    return data;
  },
  
  // Выход
  async logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await simpleRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      } catch (error) {
        console.warn('Ошибка выхода:', error);
      }
    }
    
    // Очищаем sessionStorage
    clearAuthData();
  },
  
  // Получение текущего пользователя
  async getCurrentUser() {
    return requestWithAuth('/auth/me');
  },
  
  // Обновление токена
  async refreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('Refresh token отсутствует');
    }
    
    const data = await simpleRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (data.access_token) {
      saveAuthTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken
      });
    }
    
    return data;
  }
};

// Сервис групп
export const groupService = {
  // Создание группы
  async createGroup(groupData) {
    return requestWithAuth('/groups/create', {
      method: 'POST',
      body: JSON.stringify(groupData)
    });
  },
  
  // Получение списка моих групп
  async getMyGroups() {
    return requestWithAuth('/groups/my');
  },
  
  // Получение детальной информации о группе
  async getGroupDetail(groupId) {
    return requestWithAuth(`/groups/${groupId}/detail`);
  },
  
  // Обновление группы
  async updateGroup(groupId, groupData) {
    return requestWithAuth(`/groups/${groupId}/update`, {
      method: 'PUT',
      body: JSON.stringify(groupData)
    });
  },
  
  // Удаление группы
  async deleteGroup(groupId) {
    return requestWithAuth(`/groups/${groupId}/delete`, {
      method: 'DELETE'
    });
  },
  
  // Вход в группу по инвайт-токену
  async joinGroupByToken(token) {
    return requestWithAuth('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ invite_token: token })
    });
  },
  
  // Выход из группы
  async leaveGroup(groupId) {
    return requestWithAuth(`/groups/${groupId}/leave`, {
      method: 'POST'
    });
  },
  
  // Удаление участника из группы
  async removeMember(groupId, memberId) {
    return requestWithAuth(`/groups/${groupId}/members/${memberId}/remove`, {
      method: 'DELETE'
    });
  }
};

// Сервис задач
export const taskService = {
  // Создание задачи
  async createTask(groupId, taskData) {
    return requestWithAuth(`/tasks/${groupId}/create`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },
  
  // Получение задач группы
  async getGroupTasks(groupId) {
    return requestWithAuth(`/tasks/group/${groupId}`);
  },
  
  // Получение детальной информации о задаче
  async getTaskDetail(taskId) {
    return requestWithAuth(`/tasks/${taskId}/detail`);
  },
  
  // Обновление задачи
  async updateTask(taskId, taskData) {
    return requestWithAuth(`/tasks/${taskId}/update`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },
  
  // Удаление задачи
  async deleteTask(taskId) {
    return requestWithAuth(`/tasks/${taskId}/delete`, {
      method: 'DELETE'
    });
  },
  
  // Добавление критерия оценки
  async addCriteria(taskId, criteriaData) {
    return requestWithAuth(`/tasks/${taskId}/criteria/create`, {
      method: 'POST',
      body: JSON.stringify(criteriaData)
    });
  },
  
  // Получение критериев задачи
  async getTaskCriteria(taskId) {
    return requestWithAuth(`/tasks/${taskId}/criteria`);
  },
  
  // Обновление критерия
  async updateCriteria(criteriaId, criteriaData) {
    return requestWithAuth(`/tasks/criteria/${criteriaId}/update`, {
      method: 'PUT',
      body: JSON.stringify(criteriaData)
    });
  },
  
  // Удаление критерия
  async deleteCriteria(criteriaId) {
    return requestWithAuth(`/tasks/criteria/${criteriaId}/delete`, {
      method: 'DELETE'
    });
  }
};

// Сервис решений
export const solutionService = {
  // Отправка решения
  async submitSolution(taskId, file) {
    const formData = new FormData();
    formData.append('files', file);
    
    return requestWithAuth(`/solutions/task/${taskId}/submit`, {
      method: 'POST',
      body: formData
    });
  },
  
  // Получение моего решения для задачи
  async getMySolution(taskId) {
    return requestWithAuth(`/solutions/task/${taskId}/my-solution`);
  },
  
  // Обновление решения
  async updateSolution(solutionId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return requestWithAuth(`/solutions/${solutionId}/update`, {
      method: 'PUT',
      body: formData
    });
  },
  
  // Получение всех решений для задачи
  async getTaskSolutions(taskId) {
    return requestWithAuth(`/solutions/task/${taskId}/all-solutions`);
  },
  
  // Получение детальной информации о решении
  async getSolutionDetail(solutionId) {
    return requestWithAuth(`/solutions/${solutionId}/detail`);
  },
  
  // Удаление решения
  async deleteSolution(solutionId) {
    return requestWithAuth(`/solutions/${solutionId}/delete`, {
      method: 'DELETE'
    });
  }
};

// Сервис обратной связи
export const feedbackService = {
  // Создание обратной связи
  async createFeedback(solutionId, feedbackData) {
    return requestWithAuth(`/feedback/solution/${solutionId}/create`, {
      method: 'POST',
      body: JSON.stringify(feedbackData)
    });
  },
  
  // Получение обратной связи по решению
  async getFeedbackBySolution(solutionId) {
    return requestWithAuth(`/feedback/solution/${solutionId}`);
  },
  
  // Обновление обратной связи
  async updateFeedback(feedbackId, feedbackData) {
    return requestWithAuth(`/feedback/${feedbackId}/update`, {
      method: 'PUT',
      body: JSON.stringify(feedbackData)
    });
  },
  
  // Получение критериев обратной связи
  async getFeedbackCriteria(feedbackId) {
    return requestWithAuth(`/feedback/${feedbackId}/criteria`);
  }
};

// Сервис распознавания речи
export const speechService = {
  async recognize(file) {
    const formData = new FormData();
    formData.append('file', file, 'audio.wav');

    const response = await fetch(`${API_BASE_URL}/speech/recognize`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Ошибка распознавания речи');
    }

    return response.json();
  }
};