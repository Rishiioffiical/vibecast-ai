import { auth } from '../firebase/config';

export type ApiMode = 'admin' | 'public';

let activeApiMode: ApiMode = (() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('vibecast_api_mode') as ApiMode | null;
    if (saved === 'admin' || saved === 'public') return saved;
  }
  return 'admin';
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
 * Returns common API headers including the target user's email
 * to securely route between ADMIN_API_KEY and PUBLIC_API_KEY on the server proxy.
 */
export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const currentEmail = auth?.currentUser?.email;

  if (activeApiMode === 'public') {
    // In Public Simulation mode, send a public visitor email so server routes to PUBLIC_API_KEY
    headers['x-user-email'] = 'public-creator@vibecast.app';
  } else if (currentEmail) {
    headers['x-user-email'] = currentEmail.trim().toLowerCase();
  } else {
    // Default Admin mode routes to owner email
    headers['x-user-email'] = 'dubeyrishi135@gmail.com';
  }

  return headers;
}
