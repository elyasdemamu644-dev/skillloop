import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, setAccessToken, setSessionExpiredHandler } from "@/services/api";
import { reconnectSocket } from "@/services/socket";
import {
  loginRequest,
  logoutRequest,
  registerRequest,
  fetchCurrentUser,
} from "@/services/auth.api";
import type { LoginInput, RegisterInput, User } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load there's no access token in memory (a page refresh wipes
  // it), but the httpOnly refresh cookie may still be valid — so we try a
  // silent refresh, and only give up (show logged-out state) if that fails.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const { data } = await api.post<{ data: { accessToken: string } }>(
          "/auth/refresh",
          {}
        );
        if (cancelled) return;
        setAccessToken(data.data.accessToken);
        // The socket may already exist from a previous session; make sure the
        // next one is opened with the token we just obtained.
        reconnectSocket();
        const currentUser = await fetchCurrentUser();
        if (!cancelled) setUser(currentUser);
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // If a silent refresh fails later (account deactivated, refresh token
  // revoked), drop the signed-in state so the UI stops pretending to be
  // authenticated and the protected routes redirect to /login.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setAccessToken(null);
      reconnectSocket();
      setUser(null);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await loginRequest(input);
    setAccessToken(session.accessToken);
    reconnectSocket();
    setUser(session.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await registerRequest(input);
    setAccessToken(session.accessToken);
    reconnectSocket();
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      // Tear the socket down: leaving it connected would keep delivering the
      // previous user's messages and notifications on a shared device.
      reconnectSocket();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: user !== null, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
