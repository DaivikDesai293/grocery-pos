import axios from 'axios';
import { API_URL } from './config';
import { getAccessToken, getStoredRefreshToken, setSession, clearSession } from './tokenStore';

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

async function performRefresh() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');
  const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
  await setSession(response.data);
  return response.data.accessToken;
}

// A 401 on any non-auth request triggers exactly one refresh attempt (shared
// across concurrent failing requests via refreshPromise, so a screen that
// fires several requests at once doesn't fire several refreshes), then
// retries the original request once with the new token. If refresh itself
// fails, the session is cleared and RootNavigator swaps back to the login
// screen automatically (it renders off `isAuthenticated`).
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccessToken = await refreshPromise;
        original.headers = { ...original.headers, Authorization: `Bearer ${newAccessToken}` };
        return api(original);
      } catch (refreshError) {
        await clearSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/** Pulls a human-readable message out of the backend's `{ error: { message, details } }` shape. */
export function getErrorMessage(error) {
  const backendMessage = error?.response?.data?.error?.message;
  if (backendMessage) return backendMessage;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Check your connection and try again.';
  if (error?.message === 'Network Error') {
    return "Can't reach the server. Make sure the API is running and your phone can reach it — see mobile/.env.example.";
  }
  if (error?.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export default api;
