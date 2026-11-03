import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User } from "./types";
import { api } from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (old_password: string, new_password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    const res = await api.auth.login(username, password);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/");
      }
    }
  };

  const changePassword = async (old_password: string, new_password: string) => {
    await api.auth.changePassword(old_password, new_password);
    setUser(null); // Sesi dicabut server, harus login ulang
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, refreshUser, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
