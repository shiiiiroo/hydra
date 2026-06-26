import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const ACCESS_KEY = 'hm_access_token';
const REFRESH_KEY = 'hm_refresh_token';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh_token = tokenStore.getRefresh();
  if (!refresh_token) return null;
  try {
    const { data } = await axios.post('/api/auth/refresh', { refresh_token });
    tokenStore.set(data.access_token, data.refresh_token);
    return data.access_token as string;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/login')) {
      original._retry = true;
      if (!refreshing) refreshing = tryRefresh().finally(() => { refreshing = null; });
      const newToken = await refreshing;
      if (newToken) {
        original.headers = original.headers || {};
        (original.headers as any).Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      window.dispatchEvent(new CustomEvent('hm:auth-expired'));
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown, fallback = 'Произошла ошибка'): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as any)?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}
