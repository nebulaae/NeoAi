"use client";

import { ReactNode, useEffect, useState } from "react";
import { AuthContext, TelegramUser } from "@/hooks/useAuth";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("tg_user");

      if (stored) {
        setUser(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: TelegramUser) => {
    setUser(userData);
    sessionStorage.setItem("tg_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("tg_user");
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};