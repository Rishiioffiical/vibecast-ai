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

/**
 * Returns common API headers. Only attaches an admin user email when an authenticated
 * admin is signed in and has selected the admin lane.
 */
export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

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
