"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { Me } from "./types";

type AuthState = { me: Me | null; loading: boolean; refresh: () => Promise<Me>; logout: () => Promise<void>; isStudent: boolean; isAdmin: boolean };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const m = await api<Me>("/auth/me").catch(() => ({ authenticated: false }) as Me);
    setMe(m);
    setLoading(false);
    return m;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time session lookup on mount
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setMe({ authenticated: false });
  }, []);

  const roles = me?.roles ?? [];
  return (
    <AuthContext.Provider value={{ me, loading, refresh, logout, isStudent: roles.includes("STUDENT"), isAdmin: roles.includes("ADMIN") }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
