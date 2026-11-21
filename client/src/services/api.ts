import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Send and receive secure HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to retrieve cookie value by name
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

// Request interceptor to attach CSRF token header for mutating calls
apiClient.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrfToken');
  if (csrfToken && config.headers) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response interceptor for session expiration handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // When 401 Unauthorized occurs on protected routes (not on initial /auth/me check or /auth/login)
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/me') &&
      !error.config?.url?.includes('/auth/login')
    ) {
      // Session has expired
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export const api = apiClient;
