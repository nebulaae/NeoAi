"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, createContext, useContext, useEffect, ReactNode } from "react";

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface AuthContextValue {
    user: TelegramUser | null;
    login: (user: TelegramUser) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    login: () => { },
    logout: () => { },
    isLoading: true,
});

export function useAuth() {
    return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem("tg_user");
            if (stored) {
                const parsed = JSON.parse(stored);
                // Check if auth_date is not too old (24h)
                const now = Math.floor(Date.now() / 1000);
                if (now - parsed.auth_date < 86400) {
                    setUser(parsed);
                } else {
                    sessionStorage.removeItem("tg_user");
                }
            }
        } catch { }
        setIsLoading(false);
    }, []);

    const login = (userData: TelegramUser) => {
        setUser(userData);
        sessionStorage.setItem("tg_user", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem("tg_user");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 1,
                        refetchOnWindowFocus: false,
                        staleTime: 30_000,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );
}