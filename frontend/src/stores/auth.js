import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const accessToken = ref(null);
  const refreshToken = ref(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!accessToken.value);
  const userRole = computed(() => user.value?.role || '');
  const userName = computed(() => user.value?.name || '');

  /**
   * Login with email and password.
   * @param {string} email
   * @param {string} password
   */
  async function login(email, password) {
    loading.value = true;
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const result = data.data;

      user.value = result.user;
      accessToken.value = result.accessToken;
      refreshToken.value = result.refreshToken;

      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));

      // Connect WebSocket
      connectSocket(result.accessToken);

      return result;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Logout and clear session.
   */
  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors during logout
    }
    clearSession();
  }

  /**
   * Restore session from localStorage.
   */
  function restoreSession() {
    const storedToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      accessToken.value = storedToken;
      refreshToken.value = storedRefreshToken;
      user.value = JSON.parse(storedUser);
      connectSocket(storedToken);
    }
  }

  /**
   * Clear session data.
   */
  function clearSession() {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    disconnectSocket();
  }

  /**
   * Check if user has any of the given roles.
   * @param {...string} roles
   * @returns {boolean}
   */
  function hasRole(...roles) {
    return roles.includes(userRole.value);
  }

  return {
    user,
    accessToken,
    refreshToken,
    loading,
    isAuthenticated,
    userRole,
    userName,
    login,
    logout,
    restoreSession,
    clearSession,
    hasRole,
  };
});
