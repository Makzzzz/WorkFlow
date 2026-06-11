import { API_BASE_URL, getDefaultHeaders } from '../config.js';
import { getRefreshToken, saveAuthTokens, clearAuthData } from '../utils/auth-session.js';

async function requestWithAuth(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getDefaultHeaders();

  const isFormData = options.body && options.body instanceof FormData;
  const finalHeaders = { ...headers, ...options.headers };

  if (isFormData) {
    delete finalHeaders['Content-Type'];
  }

  const config = { ...options, headers: finalHeaders };

  let response;
  try {
    response = await fetch(url, config);
  } catch (fetchError) {
    if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
      throw { status: 0, message: 'Ошибка сети. Проверьте подключение к интернету.', data: { networkError: true } };
    }
    throw fetchError;
  }

  if (response.status === 401 && !options._retry) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          saveAuthTokens({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token || refreshToken
          });
          config.headers['Authorization'] = `Bearer ${refreshData.access_token}`;
          config._retry = true;
          return requestWithAuth(endpoint, config);
        }
      }
    }
    clearAuthData();
    if (window.location.hash !== '#login') window.location.hash = '#login';
    throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
      data: errorData
    };
  }

  if (response.status === 204) return null;

  return await response.json();
}

async function simpleRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getDefaultHeaders();

  const isFormData = options.body && options.body instanceof FormData;
  const finalHeaders = { ...headers, ...options.headers };

  if (isFormData) {
    delete finalHeaders['Content-Type'];
  }

  const config = { ...options, headers: finalHeaders };
  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
      data: errorData
    };
  }

  if (response.status === 204) return null;

  return await response.json();
}

// Сервис аутентификации
export const authService = {
  async register(userData) {
    return simpleRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  async confirmEmail(email, code) {
    return simpleRequest('/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
  },

  async requestPasswordReset(email) {
    return simpleRequest('/auth/forgot_password/request', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(email, code, newPassword) {
    return simpleRequest('/auth/forgot_password', {
      method: 'POST',
      body: JSON.stringify({ email, code, new_password: newPassword })
    });
  },
  
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
    
    if (data.access_token) {
      saveAuthTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      });
    }
    
    return data;
  },
  
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
    
    clearAuthData();
  },
  
  async updateProfile(data) {
    return requestWithAuth('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async getCurrentUser() {
    return requestWithAuth('/auth/me');
  },
  
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
  async createGroup(groupData) {
    return requestWithAuth('/groups/create', {
      method: 'POST',
      body: JSON.stringify(groupData)
    });
  },
  
  async getMyGroups() {
    return requestWithAuth('/groups/my');
  },
  
  async getGroupDetail(groupId) {
    return requestWithAuth(`/groups/${groupId}/detail`);
  },
  
  async updateGroup(groupId, groupData) {
    return requestWithAuth(`/groups/${groupId}/update`, {
      method: 'PUT',
      body: JSON.stringify(groupData)
    });
  },
  
  async deleteGroup(groupId) {
    return requestWithAuth(`/groups/${groupId}/delete`, {
      method: 'DELETE'
    });
  },
  
  async joinGroupByToken(token) {
    return requestWithAuth('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ invite_token: token })
    });
  },
  
  async leaveGroup(groupId) {
    return requestWithAuth(`/groups/${groupId}/leave`, {
      method: 'POST'
    });
  },
  
  async removeMember(groupId, memberId) {
    return requestWithAuth(`/groups/${groupId}/members/${memberId}/remove`, {
      method: 'DELETE'
    });
  }
};

// Сервис задач
export const taskService = {
  async createTask(groupId, taskData) {
    return requestWithAuth(`/tasks/${groupId}/create`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },
  
  async getGroupTasks(groupId) {
    return requestWithAuth(`/tasks/group/${groupId}`);
  },
  
  async getTaskDetail(taskId) {
    return requestWithAuth(`/tasks/${taskId}/detail`);
  },
  
  async updateTask(taskId, taskData) {
    return requestWithAuth(`/tasks/${taskId}/update`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },
  
  async deleteTask(taskId) {
    return requestWithAuth(`/tasks/${taskId}/delete`, {
      method: 'DELETE'
    });
  },
  
  async addCriteria(taskId, criteriaData) {
    return requestWithAuth(`/tasks/${taskId}/criteria/create`, {
      method: 'POST',
      body: JSON.stringify(criteriaData)
    });
  },
  
  async getTaskCriteria(taskId) {
    return requestWithAuth(`/tasks/${taskId}/criteria`);
  },
  
  async updateCriteria(criteriaId, criteriaData) {
    return requestWithAuth(`/tasks/criteria/${criteriaId}/update`, {
      method: 'PUT',
      body: JSON.stringify(criteriaData)
    });
  },
  
  async deleteCriteria(criteriaId) {
    return requestWithAuth(`/tasks/criteria/${criteriaId}/delete`, {
      method: 'DELETE'
    });
  }
};

// Сервис решений
export const solutionService = {
  async submitSolution(taskId, files) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    return requestWithAuth(`/solutions/task/${taskId}/submit`, {
      method: 'POST',
      body: formData
    });
  },

  async getMySolution(taskId) {
    return requestWithAuth(`/solutions/task/${taskId}/my-solution`);
  },

  async updateSolution(solutionId, files) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    return requestWithAuth(`/solutions/${solutionId}/update`, {
      method: 'PUT',
      body: formData
    });
  },
  
  async getTaskSolutions(taskId) {
    return requestWithAuth(`/solutions/task/${taskId}/all-solutions`);
  },
  
  async getSolutionDetail(solutionId) {
    return requestWithAuth(`/solutions/${solutionId}/detail`);
  },
  
  async deleteSolution(solutionId) {
    return requestWithAuth(`/solutions/${solutionId}/delete`, {
      method: 'DELETE'
    });
  }
};

// Сервис обратной связи
export const feedbackService = {
  async createFeedback(solutionId, feedbackData) {
    return requestWithAuth(`/feedback/solution/${solutionId}/create`, {
      method: 'POST',
      body: JSON.stringify(feedbackData)
    });
  },
  
  async getFeedbackBySolution(solutionId) {
    return requestWithAuth(`/feedback/solution/${solutionId}`);
  },
  
  async updateFeedback(feedbackId, feedbackData) {
    return requestWithAuth(`/feedback/${feedbackId}/update`, {
      method: 'PUT',
      body: JSON.stringify(feedbackData)
    });
  },
  
  async getFeedbackCriteria(feedbackId) {
    return requestWithAuth(`/feedback/${feedbackId}/criteria`);
  }
};

// Сервис шаблонов комментариев
export const commentPatternService = {
  async getAll() {
    return requestWithAuth('/comment-patterns/all');
  },
  async create(text) {
    return requestWithAuth('/comment-patterns/create', {
      method: 'POST',
      body: JSON.stringify({ comment: text })
    });
  },
  async update(id, text) {
    return requestWithAuth(`/comment-patterns/${id}/update`, {
      method: 'PUT',
      body: JSON.stringify({ comment: text })
    });
  },
  async remove(id) {
    return requestWithAuth(`/comment-patterns/${id}/delete`, {
      method: 'DELETE'
    });
  }
};

// Сервис аннотаций (пометки на изображениях в ревью)
export const annotationService = {
  async get(solutionId, fileKey) {
    return requestWithAuth(`/annotations/solution/${solutionId}?file_key=${encodeURIComponent(fileKey)}`);
  },

  async save(solutionId, fileKey, data) {
    return requestWithAuth(`/annotations/solution/${solutionId}`, {
      method: 'PUT',
      body: JSON.stringify({ file_key: fileKey, data })
    });
  }
};

// Сервис peer-review (P2P проверка)
export const peerService = {
  async startPeerReview(taskId) {
    return requestWithAuth(`/peer/tasks/${taskId}/peer-start`, {
      method: 'POST'
    });
  },

  async getMyPeerTask(taskId) {
    return requestWithAuth(`/peer/tasks/${taskId}/my-peer`);
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