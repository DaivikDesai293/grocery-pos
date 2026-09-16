// Tiny module-level store for the current auth tokens, mirroring the web
// app's src/api/tokenStore.js — shared between AuthContext (owns
// login/logout/refresh) and the plain axios wrapper in client.js (which
// isn't a React component and can't use context directly).
//
// The access token lives only in memory, same as web — gone on app restart,
// which is what forces AuthContext's startup refresh. The refresh token
// persists in expo-secure-store (iOS Keychain / Android Keystore-backed),
// which is why every read of it here is async, unlike the web version's
// synchronous localStorage. `hydrateRefreshToken()` loads it once into an
// in-memory cache at startup so the rest of the app — and the axios
// interceptor, which needs a synchronous read — can use the plain sync
// `getStoredRefreshToken()` getter afterwards, exactly like the web version.

import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'grocery_pos_refresh_token';

let accessToken = null;
let currentUser = null;
let cachedRefreshToken = null;
let hydrated = false;
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

/** Synchronous read of the last-hydrated refresh token. Call `hydrateRefreshToken()` first at startup. */
export function getStoredRefreshToken() {
  return cachedRefreshToken;
}

/** Loads the persisted refresh token from secure storage into the in-memory cache. Call once, at app startup. */
export async function hydrateRefreshToken() {
  if (hydrated) return cachedRefreshToken;
  try {
    cachedRefreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    // SecureStore can throw on some Android devices with a broken keystore —
    // fail safe into "no session" rather than crashing the app.
    cachedRefreshToken = null;
  }
  hydrated = true;
  return cachedRefreshToken;
}

export async function setSession({ accessToken: at, refreshToken: rt, user }) {
  accessToken = at ?? null;
  currentUser = user ?? null;
  hydrated = true;
  if (rt) {
    cachedRefreshToken = rt;
    try {
      await SecureStore.setItemAsync(REFRESH_KEY, rt);
    } catch {
      // Session still works for the current app launch via the in-memory
      // tokens — it just won't survive a restart.
    }
  }
  notify();
}

export async function clearSession() {
  accessToken = null;
  currentUser = null;
  cachedRefreshToken = null;
  hydrated = true;
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
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
