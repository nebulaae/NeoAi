"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/layout/Providers";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "your_bot";

export function LoginPage() {
    const { login } = useAuth();
    const widgetRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        // Expose callback globally for Telegram widget
        (window as any).onTelegramAuth = async (user: any) => {
            setVerifying(true);
            setError(null);
            try {
                const res = await fetch("/api/auth/telegram", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(user),
                });
                const data = await res.json();
                if (data.success && data.user) {
                    login(data.user);
                } else {
                    setError(data.error || "Ошибка авторизации");
                }
            } catch {
                setError("Не удалось подключиться к серверу");
            } finally {
                setVerifying(false);
            }
        };

        // Inject Telegram widget script
        if (widgetRef.current && !widgetRef.current.querySelector("script")) {
            const script = document.createElement("script");
            script.src = "https://telegram.org/js/telegram-widget.js?22";
            script.setAttribute("data-telegram-login", BOT_NAME);
            script.setAttribute("data-size", "large");
            script.setAttribute("data-onauth", "onTelegramAuth(user)");
            script.setAttribute("data-request-access", "write");
            script.async = true;
            widgetRef.current.appendChild(script);
        }

        return () => {
            delete (window as any).onTelegramAuth;
        };
    }, [login]);

    return (
        <div className="auth-overlay">
            <div
                className="fade-up"
                style={{
                    width: "100%",
                    maxWidth: 360,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0,
                }}
            >
                {/* Logo */}
                <div className="fade-up fade-up-1" style={{ marginBottom: 32 }}>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            background: "hsl(var(--foreground))",
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                            <path
                                d="M5 13L11 19L21 7"
                                stroke="hsl(var(--background))"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>

                {/* Heading */}
                <div
                    className="fade-up fade-up-2"
                    style={{ textAlign: "center", marginBottom: 32 }}
                >
                    <h1
                        style={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: "hsl(var(--foreground))",
                            letterSpacing: "-0.02em",
                            marginBottom: 8,
                        }}
                    >
                        Войдите в All AI
                    </h1>
                    <p
                        style={{
                            fontSize: 14,
                            color: "hsl(var(--muted-foreground))",
                            lineHeight: 1.6,
                            maxWidth: 280,
                            margin: "0 auto",
                        }}
                    >
                        Используйте аккаунт Telegram для входа в платформу
                    </p>
                </div>

                {/* Telegram widget container */}
                <div
                    className="fade-up fade-up-3"
                    style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <div
                        ref={widgetRef}
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            minHeight: 44,
                            opacity: verifying ? 0.4 : 1,
                            pointerEvents: verifying ? "none" : "auto",
                            transition: "opacity 0.2s",
                        }}
                    />

                    {verifying && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
                            <div
                                style={{
                                    width: 14,
                                    height: 14,
                                    border: "1.5px solid hsl(var(--border))",
                                    borderTopColor: "hsl(var(--foreground))",
                                    borderRadius: "50%",
                                    animation: "spin 0.7s linear infinite",
                                }}
                            />
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            Проверяем...
                        </div>
                    )}

                    {error && (
                        <p style={{ fontSize: 13, color: "hsl(var(--destructive))", textAlign: "center" }}>
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="fade-up fade-up-4"
                    style={{ marginTop: 48, textAlign: "center" }}
                >
                    <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", lineHeight: 1.6 }}>
                        Нажимая «Войти», вы соглашаетесь с{" "}
                        <span style={{ color: "hsl(var(--foreground))", textDecoration: "underline", cursor: "pointer" }}>
                            условиями использования
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}