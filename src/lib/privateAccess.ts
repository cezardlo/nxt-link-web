export const PRIVATE_ACCESS_CODE = '4444';
export const PRIVATE_ACCESS_STORAGE_KEY = 'nxt-link-private-access';
export const PRIVATE_PATHS = ['/markets', '/intel'];

export function isPrivatePath(path: string): boolean {
  return PRIVATE_PATHS.some((privatePath) => path === privatePath || path.startsWith(`${privatePath}/`));
}

export function hasPrivateAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PRIVATE_ACCESS_STORAGE_KEY) === PRIVATE_ACCESS_CODE;
}

export function grantPrivateAccess() {
  window.localStorage.setItem(PRIVATE_ACCESS_STORAGE_KEY, PRIVATE_ACCESS_CODE);
}
