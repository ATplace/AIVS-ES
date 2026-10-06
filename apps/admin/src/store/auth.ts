"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminRole } from "@es/shared";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  hydrated: boolean;
  setHydrated: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      async login(email, password) {
        const res = await fetch(`${API}/auth/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "登入失敗");
        set({ token: json.token, user: json.user });
      },
      logout() {
        set({ token: null, user: null });
      },
    }),
    {
      name: "es-admin-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
