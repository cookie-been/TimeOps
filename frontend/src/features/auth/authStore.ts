import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  username: string | null;
  setSession: (payload: { accessToken: string; username: string; rememberMe: boolean }) => void;
  clearSession: () => void;
}

const accessTokenKey = "timeops-access-token";
const usernameKey = "timeops-username";

function readStoredValue(key: string): string | null {
  return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
}

const initialToken = readStoredValue(accessTokenKey);
const initialUsername = readStoredValue(usernameKey);

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initialToken,
  username: initialUsername,
  setSession: ({ accessToken, username, rememberMe }) => {
    const persistentStorage = rememberMe ? window.localStorage : window.sessionStorage;
    const transientStorage = rememberMe ? window.sessionStorage : window.localStorage;

    persistentStorage.setItem(accessTokenKey, accessToken);
    persistentStorage.setItem(usernameKey, username);
    transientStorage.removeItem(accessTokenKey);
    transientStorage.removeItem(usernameKey);
    set({ accessToken, username });
  },
  clearSession: () => {
    window.localStorage.removeItem(accessTokenKey);
    window.localStorage.removeItem(usernameKey);
    window.sessionStorage.removeItem(accessTokenKey);
    window.sessionStorage.removeItem(usernameKey);
    set({ accessToken: null, username: null });
  }
}));
