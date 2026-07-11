import axios from 'axios';
import { enqueueSnackbar } from 'notistack';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL, withCredentials: true });

let accessToken = null;
let isRefreshing = false;
let queue = [];

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.data.accessToken);
        queue.forEach((p) => p.resolve(data.data.accessToken));
        queue = [];
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        queue.forEach((p) => p.reject(refreshErr));
        queue = [];
        setAccessToken(null);
        enqueueSnackbar('Your session has expired. Please log in again.', { variant: 'warning' });
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Surface every API failure as a toast, EXCEPT the silent background refresh check that
    // runs on initial app load (a 401 there just means "not logged in yet" — not a real error).
    if (!original?.silentAuth) {
      const message = error.response?.data?.message || 'Something went wrong. Please try again.';
      enqueueSnackbar(message, { variant: 'error' });
    }

    return Promise.reject(error);
  }
);

export default api;
