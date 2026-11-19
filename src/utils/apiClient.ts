import { auth } from '../firebase/config';

export type ApiMode = 'admin' | 'public';

const ADMIN_EMAILS = ['rdpandit913@gmail.com', 'dubeyrishi135@gmail.com'];

let activeApiMode: ApiMode = (() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('vibecast_api_mode') as ApiMode | null;
    if (saved === 'admin' || saved === 'public') return saved;
  }
  return 'public';
})();

const listeners: Array<(mode: ApiMode) => void> = [];

export function getActiveApiMode(): ApiMode {
  return activeApiMode;
}

export function setActiveApiMode(mode: ApiMode) {
  activeApiMode = mode;
  if (typeof window !== 'undefined') {
    localStorage.setItem('vibecast_api_mode', mode);
  }
  listeners.forEach((fn) => fn(mode));
}

export function subscribeApiMode(fn: (mode: ApiMode) => void) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

let cachedIdToken: string = '';

if (auth) {
  auth.onIdTokenChanged(async (u) => {
    if (u && u.uid !== 'local-studio-creator' && typeof u.getIdToken === 'function') {
      try {
        cachedIdToken = await u.getIdToken();
      } catch {
        cachedIdToken = '';
      }
    } else {
      cachedIdToken = '';
    }
  });
}

/**
 * Returns common API headers synchronously, attaching cached Firebase Auth Bearer token if signed in.
 */
export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (cachedIdToken) {
    headers['Authorization'] = `Bearer ${cachedIdToken}`;
  }

  const currentEmail = auth?.currentUser?.email?.trim().toLowerCase();

  if (activeApiMode === 'public') {
    headers['x-user-email'] = 'public-creator@vibecast.app';
  } else if (currentEmail && ADMIN_EMAILS.includes(currentEmail)) {
    headers['x-user-email'] = currentEmail;
  } else if (currentEmail) {
    headers['x-user-email'] = currentEmail;
  }

  return headers;
}

/**
 * Asynchronously fetches a fresh Firebase Auth ID token if a Google user is signed in,
 * ensuring cryptographic identity verification on backend routes.
 */
export async function getAsyncApiHeaders(
  extraHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  const currentUser = auth?.currentUser;
  if (
    currentUser &&
    currentUser.uid !== 'local-studio-creator' &&
    typeof currentUser.getIdToken === 'function'
  ) {
    try {
      cachedIdToken = await currentUser.getIdToken();
    } catch {
      // Keep last cached or empty
    }
  }
  return getApiHeaders(extraHeaders);
}

