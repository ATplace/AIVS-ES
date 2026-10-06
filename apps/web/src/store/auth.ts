"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { login as apiLogin, register as apiRegister, type AuthUser } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setHydrated: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (body: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      async login(email, password) {
        const r = await apiLogin(email, password);
        set({ token: r.token, user: r.user });
      },
      async register(body) {
        const r = await apiRegister(body);
        set({ token: r.token, user: r.user });
      },
      logout() {
        set({ token: null, user: null });
      },
    }),
    {
      name: "es-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
