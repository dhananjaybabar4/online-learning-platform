// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getToken = (endpoint = '') => {
  const atlToken   = localStorage.getItem('atl_access_token');
  const adminToken = localStorage.getItem('admin_token');

  const isAdminEndpoint =
    endpoint.includes('/admin') ||
    endpoint.split('/').includes('admin');

  const isStudentEndpoint =
    endpoint.includes('/student') ||
    endpoint.includes('/lessons/student');

  if (isAdminEndpoint)   return adminToken || atlToken;
  if (isStudentEndpoint) return atlToken;
  return atlToken || adminToken;
};

const transformLessonData = (data) => {
  if (!data) return data;
  const transformed = { ...data };
  if ('display_order' in transformed) {
    transformed.order_index = transformed.display_order;
    delete transformed.display_order;
  }
  if ('order' in transformed && !('order_index' in transformed)) {
    transformed.order_index = transformed.order;
    delete transformed.order;
  }
  return transformed;
};

const transformStepData = (data) => {
  if (!data) return data;
  const transformed = { ...data };
  if ('order' in transformed) {
    transformed.order_number = transformed.order;
    delete transformed.order;
  }
  if ('order_index' in transformed) {
    transformed.order_number = transformed.order_index;
    delete transformed.order_index;
  }
  if ('type' in transformed) {
    transformed.step_type = transformed.type;
    delete transformed.type;
  }
  if (transformed.order_number !== undefined && transformed.order_number !== null) {
    transformed.order_number = Number(transformed.order_number);
  }
  Object.keys(transformed).forEach(key => {
    if (transformed[key] === undefined) delete transformed[key];
  });
  return transformed;
};

// ─────────────────────────────────────────────────────────
// SILENT TOKEN REFRESH
// ─────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue = [];

const processRefreshQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

const silentRefresh = async () => {
  const refreshToken = localStorage.getItem('atl_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const newToken = data.access_token || data.data?.access_token;
    if (!newToken) return null;

    localStorage.setItem('atl_access_token', newToken);
    if (data.refresh_token) localStorage.setItem('atl_refresh_token', data.refresh_token);
    console.log('🔄 Token silently refreshed');
    return newToken;
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────
// CORE FETCH — with auto-refresh on 401
// ─────────────────────────────────────────────────────────
const authFetch = async (endpoint, options = {}, isRetry = false) => {
  const token = getToken(endpoint);

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401 || response.status === 403) {
      const isAdminEndpoint = endpoint.includes('/admin') || endpoint.split('/').includes('admin');
      const hasAdminToken   = !!localStorage.getItem('admin_token');

      if (isAdminEndpoint || hasAdminToken) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/admin-login';
        throw new Error(`HTTP ${response.status}`);
      }

      if (!isRetry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then(newToken => {
            const retryConfig = {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newToken}`,
                ...options.headers,
              },
            };
            return fetch(`${API_BASE_URL}${endpoint}`, retryConfig).then(r => r.json());
          });
        }

        isRefreshing = true;
        const newToken = await silentRefresh();
        isRefreshing = false;

        if (newToken) {
          processRefreshQueue(null, newToken);
          return authFetch(endpoint, options, true);
        } else {
          processRefreshQueue(new Error('Refresh failed'));
        }
      }

      console.error('❌ Auth failed — redirecting to login');
      localStorage.removeItem('atl_access_token');
      localStorage.removeItem('atl_refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = { message: 'Request failed' };
      }
      throw new Error(errorDetails.message || errorDetails.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();

  } catch (error) {
    console.error('❌ API Error:', { error: error.message, endpoint });
    throw error;
  }
};

// ============================================
// ADMIN APIs
// ============================================
export const adminAPI = {
  login: async (email, password) => {
    try {
      return await authFetch('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  verify: async (token) => {
    try {
      return await authFetch('/admin/verify', {
        method: token ? 'GET' : 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: token ? undefined : JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Admin verify error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  logout: async () => {
    try {
      return await authFetch('/admin/logout', { method: 'POST' });
    } catch (error) {
      console.error('Admin logout error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getDashboardStats: async () => {
    return authFetch('/admin/dashboard/stats');
  },
};

// ============================================
// STUDENT AUTHENTICATION APIs
// ============================================
export const authAPI = {
  register: async (data) => {
    try {
      return await authFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  login: async (data) => {
    try {
      return await authFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  googleAuth: async () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },

  handleCallback: async (accessToken, refreshToken) => {
    try {
      return await authFetch('/auth/callback', {
        method: 'POST',
        body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  addPassword: async (data) => {
    try {
      return await authFetch('/auth/add-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Add password error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// USERS APIs
// ============================================
export const usersAPI = {
  getAll: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      return await authFetch(`/admin/users${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Get users error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getById: async (id) => {
    try {
      return await authFetch(`/admin/users/${id}`);
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  update: async (id, data) => {
    try {
      return await authFetch(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  delete: async (id) => {
    try {
      return await authFetch(`/admin/users/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getPoints: async (userId) => {
    try {
      return await authFetch(`/points/user/${userId}`);
    } catch (error) {
      console.error('Get points error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// LESSONS APIs
// ============================================
export const lessonsAPI = {
  student: {
    getAll: async (params = {}) => {
      try {
        const queryString = new URLSearchParams(params).toString();
        return await authFetch(`/lessons/student/all${queryString ? `?${queryString}` : ''}`);
      } catch (error) {
        console.error('Get lessons error:', error);
        return { success: false, message: 'Connection error', data: [] };
      }
    },

    getById: async (id) => {
      try {
        return await authFetch(`/lessons/student/${id}`);
      } catch (error) {
        console.error('Get lesson error:', error);
        return { success: false, message: 'Connection error' };
      }
    },

    getSteps: async (lessonId) => {
      try {
        return await authFetch(`/lessons/student/${lessonId}/steps`);
      } catch (error) {
        console.error('Get steps error:', error);
        return { success: false, message: 'Connection error', data: [] };
      }
    },

    getStepById: async (lessonId, stepId) => {
      try {
        return await authFetch(`/lessons/student/${lessonId}/steps/${stepId}`);
      } catch (error) {
        console.error('Get step error:', error);
        return { success: false, message: 'Connection error' };
      }
    },

    getProgress: async () => {
      try {
        return await authFetch('/points/lessons/progress');
      } catch (error) {
        console.error('Get progress error:', error);
        return { success: false, message: 'Connection error', data: [] };
      }
    },

    markComplete: async (lessonId, data) => {
      try {
        return await authFetch(`/points/lessons/${lessonId}/progress`, {
          method: 'POST',
          body: JSON.stringify({ ...data, status: 'completed' }),
        });
      } catch (error) {
        console.error('Mark complete error:', error);
        return { success: false, message: 'Connection error' };
      }
    },

    saveAssessment: async (lessonId, data) => {
      try {
        return await authFetch(`/points/lessons/${lessonId}/assessment`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (error) {
        console.error('Save assessment error:', error);
        return { success: false, message: 'Connection error' };
      }
    },
  },

  getAll: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      return await authFetch(`/admin/lessons${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Get lessons error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  getById: async (id) => {
    try {
      return await authFetch(`/admin/lessons/${id}`);
    } catch (error) {
      console.error('Get lesson error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  create: async (data) => {
    const transformedData = transformLessonData(data);
    try {
      return await authFetch('/admin/lessons', {
        method: 'POST',
        body: JSON.stringify(transformedData),
      });
    } catch (error) {
      console.error('Create lesson error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  update: async (id, data) => {
    const transformedData = transformLessonData(data);
    try {
      return await authFetch(`/admin/lessons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(transformedData),
      });
    } catch (error) {
      console.error('Update lesson error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  delete: async (id) => {
    try {
      return await authFetch(`/admin/lessons/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete lesson error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getSteps: async (lessonId) => {
    try {
      return await authFetch(`/admin/lessons/${lessonId}/steps`);
    } catch (error) {
      console.error('Get steps error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  getStepById: async (lessonId, stepId) => {
    try {
      return await authFetch(`/admin/lessons/${lessonId}/steps/${stepId}`);
    } catch (error) {
      console.error('Get step error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  createStep: async (lessonId, data) => {
    const transformedData = transformStepData(data);
    try {
      return await authFetch(`/admin/lessons/${lessonId}/steps`, {
        method: 'POST',
        body: JSON.stringify(transformedData),
      });
    } catch (error) {
      console.error('Create step error:', error);
      return { success: false, message: error.message || 'Connection error' };
    }
  },

  updateStep: async (lessonId, stepId, data) => {
    const transformedData = transformStepData(data);
    try {
      return await authFetch(`/admin/lessons/${lessonId}/steps/${stepId}`, {
        method: 'PUT',
        body: JSON.stringify(transformedData),
      });
    } catch (error) {
      console.error('Update step error:', error);
      return { success: false, message: error.message || 'Connection error' };
    }
  },

  deleteStep: async (lessonId, stepId) => {
    try {
      return await authFetch(`/admin/lessons/${lessonId}/steps/${stepId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete step error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// QUIZZES APIs
// ============================================
export const quizzesAPI = {
  getAll: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      return await authFetch(`/admin/quizzes${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Get quizzes error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  getById: async (id) => {
    try {
      return await authFetch(`/admin/quizzes/${id}`);
    } catch (error) {
      console.error('Get quiz error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  create: async (data) => {
    try {
      return await authFetch('/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Create quiz error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  update: async (id, data) => {
    try {
      return await authFetch(`/admin/quizzes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update quiz error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  delete: async (id) => {
    try {
      return await authFetch(`/admin/quizzes/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete quiz error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getQuestions: async (quizId) => {
    try {
      return await authFetch(`/admin/quizzes/${quizId}/questions`);
    } catch (error) {
      console.error('Get questions error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  createQuestion: async (quizId, data) => {
    try {
      return await authFetch(`/admin/quizzes/${quizId}/questions`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Create question error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  updateQuestion: async (quizId, questionId, data) => {
    try {
      return await authFetch(`/admin/quizzes/${quizId}/questions/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update question error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  deleteQuestion: async (quizId, questionId) => {
    try {
      return await authFetch(`/admin/quizzes/${quizId}/questions/${questionId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete question error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// CHALLENGES APIs
// ============================================
export const challengesAPI = {
  getAll: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      return await authFetch(`/admin/challenges${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Get challenges error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  getById: async (id) => {
    try {
      return await authFetch(`/admin/challenges/${id}`);
    } catch (error) {
      console.error('Get challenge error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  create: async (data) => {
    try {
      return await authFetch('/admin/challenges', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Create challenge error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  update: async (id, data) => {
    try {
      return await authFetch(`/admin/challenges/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update challenge error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  delete: async (id) => {
    try {
      return await authFetch(`/admin/challenges/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete challenge error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getTestCases: async (challengeId) => {
    try {
      return await authFetch(`/admin/challenges/${challengeId}/test-cases`);
    } catch (error) {
      console.error('Get test cases error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  createTestCase: async (challengeId, data) => {
    try {
      return await authFetch(`/admin/challenges/${challengeId}/test-cases`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Create test case error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  updateTestCase: async (challengeId, testCaseId, data) => {
    try {
      return await authFetch(`/admin/challenges/${challengeId}/test-cases/${testCaseId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update test case error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  deleteTestCase: async (challengeId, testCaseId) => {
    try {
      return await authFetch(`/admin/challenges/${challengeId}/test-cases/${testCaseId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete test case error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// RESOURCES APIs
// ============================================
export const resourcesAPI = {
  getAll: async () => {
    try {
      return await authFetch('/admin/resources/all');
    } catch (error) {
      console.error('Get resources error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  getById: async (id) => {
    try {
      return await authFetch(`/admin/resources/${id}`);
    } catch (error) {
      console.error('Get resource error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getByType: async (type) => {
    try {
      return await authFetch(`/admin/resources/type/${type}`);
    } catch (error) {
      console.error('Get resources by type error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  getByCategory: async (category) => {
    try {
      return await authFetch(`/admin/resources/category/${category}`);
    } catch (error) {
      console.error('Get resources by category error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  create: async (data) => {
    try {
      return await authFetch('/admin/resources', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Create resource error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  update: async (id, data) => {
    try {
      return await authFetch(`/admin/resources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update resource error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  delete: async (id) => {
    try {
      return await authFetch(`/admin/resources/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete resource error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  upload: async (formData) => {
    try {
      const token = getToken('/resources/upload');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`${API_BASE_URL}/resources/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Upload resource error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// STORY APIs
// ============================================
export const storyAPI = {
  getAll: async () => {
    try {
      return await authFetch('/story');
    } catch (error) {
      console.error('Get stories error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  completeChapter: async (chapterId, stars = 3) => {
    try {
      return await authFetch(`/story/progress/${chapterId}`, {
        method: 'POST',
        body: JSON.stringify({ stars }),
      });
    } catch (error) {
      console.error('Complete chapter error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getStories: async () => {
    try {
      return await authFetch('/story/admin/stories');
    } catch (error) {
      console.error('Get stories error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  createStory: async (data) => {
    try {
      return await authFetch('/story/admin/stories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Create story error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  updateStory: async (id, data) => {
    try {
      return await authFetch(`/story/admin/stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update story error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  deleteStory: async (id) => {
    try {
      return await authFetch(`/story/admin/stories/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete story error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getChapters: async () => {
    try {
      return await authFetch('/story/admin/chapters');
    } catch (error) {
      console.error('Get chapters error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  createChapter: async (data) => {
    try {
      return await authFetch('/story/admin/chapters', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Create chapter error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  updateChapter: async (id, data) => {
    try {
      return await authFetch(`/story/admin/chapters/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update chapter error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  deleteChapter: async (id) => {
    try {
      return await authFetch(`/story/admin/chapters/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete chapter error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getTasks: async () => {
    try {
      return await authFetch('/story/admin/tasks');
    } catch (error) {
      console.error('Get tasks error:', error);
      return { success: false, message: 'Connection error', data: [] };
    }
  },

  createTask: async (data) => {
    try {
      return await authFetch('/story/admin/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Create task error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  updateTask: async (id, data) => {
    try {
      return await authFetch(`/story/admin/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update task error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  deleteTask: async (id) => {
    try {
      return await authFetch(`/story/admin/tasks/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete task error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// CHAT APIs — COMPLETE WITH ALL NEW METHODS
// ============================================
export const chatAPI = {
  /**
   * Send a regular chat message to ATL Bot (post-roadmap)
   * POST /chat/send
   * @param {Object} params - { message, sessionId, systemExtra }
   */
  sendMessage: async (params) => {
    try {
      return await authFetch('/chat/send', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    } catch (error) {
      console.error('Send message error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  /**
   * Conversational assessment — bot talks naturally, generates roadmap
   * POST /chat/converse
   * @param {string} message - User message
   * @param {string} sessionId - UUID for this assessment session
   */
  converse: async (message, sessionId) => {
    try {
      return await authFetch('/chat/converse', {
        method: 'POST',
        body: JSON.stringify({ message, sessionId }),
      });
    } catch (error) {
      console.error('Converse error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  /**
   * Raw Groq call for skill test / external use
   * POST /chat/groq
   * @param {Array} messages - Array of { role, content } objects
   * @param {number} max_tokens - Optional token limit (default 2500)
   */
  generateRoadmap: async (messages, max_tokens = 2500) => {
    try {
      return await authFetch('/chat/groq', {
        method: 'POST',
        body: JSON.stringify({ messages, max_tokens }),
      });
    } catch (error) {
      console.error('Generate roadmap error:', error);
      return { success: false, error: 'Failed to generate roadmap' };
    }
  },

  /**
   * Get user's full roadmap + all phases
   * GET /chat/roadmap
   */
  getRoadmap: async () => {
    try {
      return await authFetch('/chat/roadmap');
    } catch (error) {
      console.error('Get roadmap error:', error);
      return { success: false, roadmap: null, phases: [] };
    }
  },

  /**
   * Unlock next phase (after user completes current phase)
   * POST /chat/unlock-phase
   */
  unlockNextPhase: async () => {
    try {
      return await authFetch('/chat/unlock-phase', { method: 'POST' });
    } catch (error) {
      console.error('Unlock phase error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  /**
   * Check current phase unlock status & progress
   * GET /chat/phase-status
   */
  getPhaseStatus: async () => {
    try {
      return await authFetch('/chat/phase-status');
    } catch (error) {
      console.error('Phase status error:', error);
      return { success: false };
    }
  },

  /**
   * Get chat history for a session
   * GET /chat/history/:sessionId
   * @param {string} sessionId - Session UUID
   */
  getHistory: async (sessionId) => {
    try {
      return await authFetch(`/chat/history/${sessionId}`);
    } catch (error) {
      console.error('Get chat history error:', error);
      return { success: false, data: [] };
    }
  },
};

// ============================================
// PROGRESS APIs
// ============================================
export const progressAPI = {
  updateProgress: async (data) => {
    try {
      return await authFetch('/progress/update', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Update progress error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getUserProgress: async (userId) => {
    try {
      return await authFetch(`/progress/user/${userId}`);
    } catch (error) {
      console.error('Get user progress error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// LOGS APIs
// ============================================
export const logsAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return authFetch(`/admin/logs${queryString ? `?${queryString}` : ''}`);
  },
};

// ============================================
// SKILL TEST APIs
// ============================================
export const skilltestAPI = {
  generate: async (reason, goal, round = 1, previousScore = 0, knowledge = '') => {
    try {
      return await authFetch('/skilltest/generate', {
        method: 'POST',
        body: JSON.stringify({ reason, goal, round, previousScore, knowledge }),
      });
    } catch (error) {
      console.error('Skill test generate error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  evaluate: async ({ sessionToken, userAnswers, timings, reason, goal, round = 1 }) => {
    try {
      return await authFetch('/skilltest/evaluate', {
        method: 'POST',
        body: JSON.stringify({ sessionToken, userAnswers, timings, reason, goal, round }),
      });
    } catch (error) {
      console.error('Skill test evaluate error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// POINTS APIs
// ============================================
export const pointsAPI = {
  award: async (data) => {
    try {
      return await authFetch('/points/award', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Award points error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getByUser: async (userId) => {
    try {
      return await authFetch(`/points/user/${userId}`);
    } catch (error) {
      console.error('Get points error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getHistory: async (userId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      return await authFetch(`/points/user/${userId}/history${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('Get history error:', error);
      return { success: false, message: 'Connection error' };
    }
  },

  getLeaderboard: async (limit = 10) => {
    try {
      return await authFetch(`/points/leaderboard?limit=${limit}`);
    } catch (error) {
      console.error('Get leaderboard error:', error);
      return { success: false, message: 'Connection error' };
    }
  },
};

// ============================================
// ROADMAP API (Groq AI powered)
// ============================================
export const roadmapAPI = {
  generate: async (skillProfile) => {
    const {
      level,
      topicScores,
      topicLevel,
      goal,
      knowledge,
      reason,
      dailyTime,
      weakTopics,
      strongTopics,
    } = skillProfile;

    const GOAL_LABEL = {
      placement: 'crack campus placement interviews (DSA + aptitude)',
      job:       'get a frontend/fullstack developer job',
      project:   'build a real-world project for portfolio',
      basics:    'learn coding from scratch',
      frontend:  'become a frontend developer (HTML, CSS, JS, React)',
      backend:   'become a backend developer (Node.js, APIs, databases)',
      fullstack: 'become a full-stack developer',
      websites:  'build client websites as a freelancer',
      webapps:   'build full web applications for clients',
      webapp:    'build my own web application',
      saas:      'launch a SaaS product',
      unsure:    'explore web development and find my path',
      ecommerce: 'build e-commerce and online stores',
      design:    'create beautiful UI and design',
      website:   'build my personal/portfolio website',
      tool:      'build an automation tool or utility script',
    };

    const REASON_LABEL = {
      student:    'BCA/engineering student',
      job_seeker: 'job seeker targeting developer roles',
      freelancer: 'freelancer building client projects',
      personal:   'self-learner building a personal project',
    };

    const TIME_LABEL = {
      '15min':  '15 minutes per day',
      '30min':  '30 minutes per day',
      '1hour':  '1 hour per day',
      '2hours': '2+ hours per day',
    };

    const goalText   = GOAL_LABEL[goal]      || goal      || 'learn web development';
    const reasonText = REASON_LABEL[reason]  || reason    || 'student';
    const timeText   = TIME_LABEL[dailyTime] || dailyTime || '30 minutes per day';
    const weeks      = level === 'beginner' ? 8 : level === 'intermediate' ? 10 : 12;
    const weakList   = weakTopics?.length   ? weakTopics.join(', ')   : 'none';
    const strongList = strongTopics?.length ? strongTopics.join(', ') : 'none';

    const topicLines = topicScores
      ? Object.entries(topicScores).map(([t, s]) => {
          const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          const lvl = topicLevel?.[t] || (pct >= 75 ? 'strong' : pct >= 45 ? 'ok' : 'weak');
          return `  - ${t}: ${s.correct}/${s.total} (${pct}%) → ${lvl.toUpperCase()}`;
        }).join('\n')
      : '  - Not available';

    const systemPrompt = `You are an expert programming tutor at ATL (Anytime Learning), an ed-tech platform for BCA/engineering students in India.
You create precise, personalised learning roadmaps based on adaptive skill test results.
Respond ONLY with valid JSON. No markdown fences, no explanation text outside the JSON.`;

    const userPrompt = `Generate a personalised ${weeks}-week learning roadmap for this student.

STUDENT PROFILE:
- Type: ${reasonText}
- Skill level (from adaptive test): ${level}
- Goal: ${goalText}
- Daily study time: ${timeText}
- Prior knowledge: ${knowledge || 'Not specified'}

ADAPTIVE TEST SCORES (with per-topic level):
${topicLines}
- Weak topics (< 50%): ${weakList}
- Strong topics (≥ 75%): ${strongList}

RULES:
1. Address WEAK topics first — they need the most time
2. OK topics get moderate coverage (2 tasks per week)
3. Strong topics can be brief (1 review task, no basics)
4. Be realistic for ${timeText} of study
5. Add 1 mini-project every 2 weeks
6. Tailor specifically to: ${goalText} for a ${reasonText}
7. Total: exactly ${weeks} weeks

Return ONLY this exact JSON shape (no markdown, no backticks):
{
  "title": "short track title personalised to the student",
  "summary": "1 sentence explaining what makes this roadmap unique for this student's exact scores",
  "estimatedWeeks": ${weeks},
  "dailyTime": "${dailyTime || '30min'}",
  "keyInsight": "one sentence: WHY this specific order was chosen based on their weak/ok/strong topics",
  "firstLesson": "exact name of the very first topic/lesson to study (e.g. 'CSS Flexbox Basics')",
  "weeks": [
    {
      "week": 1,
      "title": "topic focus",
      "tasks": ["specific actionable task 1", "task 2", "task 3"],
      "project": "mini project idea or null",
      "focusTopic": "HTML | CSS | JavaScript | React | Node.js | DSA | etc"
    }
  ],
  "steps": ["Week 1: short label", "Week 2: short label"]
}`;

    try {
      const response = await chatAPI.generateRoadmap([
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ]);

      const raw = response?.message
               || response?.content
               || response?.response
               || response?.data?.message
               || response?.choices?.[0]?.message?.content
               || '';

      const clean  = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const parsed = JSON.parse(clean);
      return { success: true, data: parsed };

    } catch (err) {
      console.error('Roadmap generation error:', err);
      return { success: false, message: err.message || 'Failed to generate roadmap' };
    }
  },
};

// ============================================
// UNIFIED API EXPORT
// ============================================
export const api = {
  admin:      adminAPI,
  auth:       authAPI,
  users:      usersAPI,
  lessons:    lessonsAPI,
  quizzes:    quizzesAPI,
  challenges: challengesAPI,
  resources:  resourcesAPI,
  story:      storyAPI,
  chat:       chatAPI,
  progress:   progressAPI,
  logs:       logsAPI,
  skilltest:  skilltestAPI,
  points:     pointsAPI,
  roadmap:    roadmapAPI,
};

export default api;