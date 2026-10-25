import axios from 'axios';

import { clearStoredAuth, getStoredAuth } from './authStorage';

const api = axios.create({
  // Local development overrides this with /api so Vite can proxy to localhost.
  // The deployed frontend can work even when its host has no build-time env var.
  baseURL: import.meta.env.VITE_API_BASE_URL?.trim()
    || 'https://ai-expense-tracker-ow9p.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const auth = getStoredAuth();

  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }

    return Promise.reject(error);
  },
);

export default api;
