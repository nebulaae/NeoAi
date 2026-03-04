"use client";

import { useUser, useRequests } from "@/hooks/useApi";
import { useAuth } from "@/components/layout/Providers";
import { GenerationRequest } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} м`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
    return `${Math.floor(diff / 86_400_000)} д`;
}

const STATUS_CONFIG = {
    completed: { color: "#4ade80", label: "Готово" },
    error: { color: "#f87171", label: "Ошибка" },
    processing: { color: "#facc15", label: "В процессе" },
};

export default function ProfilePage() {
    const { user: tgUser, logout } = useAuth();
    const { data: userData, isLoading: userLoading } = useUser();
    const { data: reqData, isLoading: reqLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useRequests();

    const tokens = userData?.user?.tokens ?? 0;
    const isPremium = userData?.user?.premium ?? false;
    const requests: GenerationRequest[] = reqData?.pages.flatMap((p) => p.requests ?? []) ?? [];

    const name = tgUser ? `${tgUser.first_name} ${tgUser.last_name || ""}`.trim() : "Пользователь";
    const username = tgUser?.username || "";

    return (
        <div>
            <div className="page-header">
                <span className="page-title">Профиль</span>
                <Button variant="ghost" size="sm" onClick={logout} style={{ fontSize: 13, height: 30, color: "hsl(var(--muted-foreground))" }}>
                    Выйти
                </Button>
            </div>

            {/* Profile info */}
            <div style={{ padding: "24px 16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar style={{ width: 56, height: 56, border: "1px solid hsl(var(--border))", flexShrink: 0 }}>
                    <AvatarImage src={tgUser?.photo_url} />
                    <AvatarFallback style={{ background: "hsl(var(--secondary))", fontSize: 18, fontWeight: 600 }}>
                        {name[0]}
                    </AvatarFallback>
                </Avatar>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "hsl(var(--foreground))" }}>{name}</div>
                    {username && <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>@{username}</div>}
                </div>
            </div>

            <Separator />

            {/* Balance & topup */}
            <div style={{ padding: "16px" }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px",
                    background: "hsl(var(--secondary))",
                    borderRadius: 10,
                    border: "1px solid hsl(var(--border))",
                    marginBottom: 10,
                }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                            Баланс
                        </div>
                        {userLoading ? (
                            <Skeleton style={{ width: 56, height: 22 }} />
                        ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "hsl(var(--foreground))", opacity: 0.7 }}>
                                    <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
                                </svg>
                                <span style={{ fontSize: 20, fontWeight: 700, color: "hsl(var(--foreground))" }}>{tokens}</span>
                            </div>
                        )}
                    </div>
                    <Button size="sm" style={{ height: 32, fontSize: 13 }}>
                        Пополнить
                    </Button>
                </div>

                {/* Referral */}
                <button
                    style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px",
                        background: "none",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        cursor: "pointer",
                        textAlign: "left",
                        marginBottom: 10,
                        transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--secondary))")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                    <div style={{ width: 36, height: 36, background: "hsl(var(--muted))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: "hsl(var(--muted-foreground))" }}>
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "hsl(var(--foreground))" }}>Зарабатывай с друзьями</div>
                        <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 1 }}>Реферальная программа</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ color: "hsl(var(--muted-foreground))" }}>
                        <path d="M7.293 4.707L12.586 10l-5.293 5.293 1.414 1.414L15.414 10 8.707 3.293 7.293 4.707z" />
                    </svg>
                </button>

                {/* Premium */}
                {!isPremium && (
                    <button
                        style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 14px",
                            background: "none",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 10,
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--secondary))")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                        <div style={{ width: 36, height: 36, background: "hsl(var(--muted))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "hsl(var(--muted-foreground))" }}>
                                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>Премиум не активен</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "hsl(var(--foreground))" }}>Получить премиум</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ color: "hsl(var(--muted-foreground))" }}>
                            <path d="M7.293 4.707L12.586 10l-5.293 5.293 1.414 1.414L15.414 10 8.707 3.293 7.293 4.707z" />
                        </svg>
                    </button>
                )}
            </div>

            <Separator />

            {/* Generations */}
            <div style={{ padding: "16px 16px 0" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                    Мои генерации
                </p>
            </div>

            {reqLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid hsl(var(--border))" }}>
                        <Skeleton style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0 }} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                            <Skeleton style={{ width: "48%", height: 13 }} />
                            <Skeleton style={{ width: "28%", height: 11 }} />
                        </div>
                    </div>
                ))
            ) : requests.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 10, textAlign: "center" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: "hsl(var(--muted-foreground))" }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8.5 13.5L10.5 16L14 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>Нет генераций</p>
                </div>
            ) : (
                <>
                    {requests.map((r, i) => {
                        const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.processing;
                        return (
                            <div
                                key={i}
                                style={{
                                    display: "flex", alignItems: "center", gap: 12,
                                    padding: "12px 16px",
                                    borderBottom: i < requests.length - 1 ? "1px solid hsl(var(--border))" : "none",
                                }}
                            >
                                <div style={{
                                    width: 38, height: 38, borderRadius: 8,
                                    background: "hsl(var(--secondary))",
                                    border: "1px solid hsl(var(--border))",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0, fontSize: 14,
                                }}>
                                    {r.status === "completed" ? "✓" : r.status === "error" ? "✕" : "⋯"}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: "hsl(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {r.model}
                                    </div>
                                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ color: s.color, fontWeight: 500, ...(r.status === "processing" ? { animation: "pulse-dot 1.4s infinite" } : {}) }}>
                                            {s.label}
                                        </span>
                                        <span>·</span>
                                        <span>{r.version}</span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                                    <Badge variant="secondary" style={{ gap: 3, fontSize: 11, height: 20 }}>
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                                            <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
                                        </svg>
                                        {r.cost}
                                    </Badge>
                                    <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                                        {timeAgo(r.created_at)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {hasNextPage && (
                        <div style={{ padding: "16px" }}>
                            <Button variant="outline" className="w-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                                {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
                            </Button>
                        </div>
                    )}
                </>
            )}

            <div style={{ height: 16 }} />
        </div>
    );
}