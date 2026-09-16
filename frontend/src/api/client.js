import axios from 'axios';
import { getAccessToken, getStoredRefreshToken, setSession, clearSession } from './tokenStore';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

async function performRefresh() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');
  const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
  setSession(response.data);
  return response.data.accessToken;
}

// A 401 on any non-auth request triggers exactly one refresh attempt (shared
// across concurrent failing requests via refreshPromise, so a page that
// fires five requests at once doesn't fire five refreshes), then retries
// the original request once with the new token. If refresh itself fails,
// the session is cleared and ProtectedRoute sends the user back to login.
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
        clearSession();
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
  if (error?.message) return error.message;
  return 'Something went wrong. Please try again.';
}

/** Flattens the backend's zod validation `details` array into one string, for inline form errors. */
export function getErrorDetails(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return null;
  return details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join('; ');
}

export default api;
