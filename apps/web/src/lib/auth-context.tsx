"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:3300";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedRefreshToken = localStorage.getItem("refreshToken");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setRefreshToken(storedRefreshToken);
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const saveAuth = useCallback(
    (userData: User, accessToken: string, newRefreshToken: string) => {
      setUser(userData);
      setToken(accessToken);
      setRefreshToken(newRefreshToken);
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      localStorage.setItem("user", JSON.stringify(userData));
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${AUTH_API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        logout();
        return null;
      }

      const data = (await res.json()) as {
        data: { accessToken: string; refreshToken: string };
      };
      const newToken = data.data.accessToken;
      const newRefreshToken = data.data.refreshToken;

      setToken(newToken);
      setRefreshToken(newRefreshToken);
      localStorage.setItem("accessToken", newToken);
      localStorage.setItem("refreshToken", newRefreshToken);

      return newToken;
    } catch {
      logout();
      return null;
    }
  }, [refreshToken, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${AUTH_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          (error as { error?: { message?: string } }).error?.message ||
            "Login failed",
        );
      }

      const data = (await res.json()) as {
        data: {
          user: User;
          accessToken: string;
          refreshToken: string;
        };
      };
      saveAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
    },
    [saveAuth],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(`${AUTH_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          (error as { error?: { message?: string } }).error?.message ||
            "Registration failed",
        );
      }

      const data = (await res.json()) as {
        data: {
          user: User;
          accessToken: string;
          refreshToken: string;
        };
      };
      saveAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
    },
    [saveAuth],
  );

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  // Auto-refresh token
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(
      () => {
        void refreshAccessToken();
      },
      13 * 60 * 1000,
    ); // Refresh 2 min before expiry (15 min)

    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
