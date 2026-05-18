import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  username: string | null;
  setSession: (payload: { accessToken: string; username: string }) => void;
  clearSession: () => void;
}

const initialToken = window.localStorage.getItem("timeops-access-token");
const initialUsername = window.localStorage.getItem("timeops-username");

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initialToken,
  username: initialUsername,
  setSession: ({ accessToken, username }) => {
    window.localStorage.setItem("timeops-access-token", accessToken);
    window.localStorage.setItem("timeops-username", username);
    set({ accessToken, username });
  },
  clearSession: () => {
    window.localStorage.removeItem("timeops-access-token");
    window.localStorage.removeItem("timeops-username");
    set({ accessToken: null, username: null });
  }
}));
