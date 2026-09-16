// Tiny module-level store for the current auth tokens, shared between
// AuthContext (which owns login/logout/refresh) and the plain fetch
// wrapper in client.js (which isn't a React component and can't use
// context directly). The access token lives only in memory — it's gone on
// a page refresh, which is what forces the AuthProvider's startup refresh
// on mount. The refresh token persists in localStorage so a refresh
// (F5) doesn't force a re-login.
//
// Note for production hardening: localStorage is readable by any script on
// the page, so a real deployment facing the open internet would usually
// move the refresh token into an httpOnly cookie instead. That needs the
// API and frontend on related origins (or a proxy) — out of scope for this
// project's default setup, called out here so you know the trade-off.

const REFRESH_KEY = 'grocery_pos_refresh_token';

let accessToken = null;
let currentUser = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn({ accessToken, user: currentUser });
}

export function getAccessToken() {
  return accessToken;
}

export function getUser() {
  return currentUser;
}

export function getStoredRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setSession({ accessToken: at, refreshToken: rt, user }) {
  accessToken = at ?? null;
  currentUser = user ?? null;
  try {
    if (rt) localStorage.setItem(REFRESH_KEY, rt);
  } catch {
    // localStorage can throw in private-browsing/blocked-storage contexts — session still
    // works for the current tab via the in-memory accessToken, it just won't survive reload.
  }
  notify();
}

export function clearSession() {
  accessToken = null;
  currentUser = null;
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* see setSession */
  }
  notify();
}

/** Subscribe to session changes (used by AuthContext to mirror this store into React state). */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
