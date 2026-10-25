const AUTH_STORAGE_KEY = 'expense-tracker-auth';

export function getStoredAuth() {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const auth = JSON.parse(stored);
    return auth?.token ? auth : null;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export { AUTH_STORAGE_KEY };
