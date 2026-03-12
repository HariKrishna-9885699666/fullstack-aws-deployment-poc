import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { email: string; sub: string } | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: sessionStorage.getItem('token') || null,
  user: null,
  setAuth: (token, user) => {
    sessionStorage.setItem('token', token);
    set({ token, user });
  },
  logout: () => {
    sessionStorage.removeItem('token');
    set({ token: null, user: null });
  },
}));
