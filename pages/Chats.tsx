"use client";
import { useChats } from "@/hooks/useApi";
import { Chat } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function timeAgo(dateStr?: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "сейчас";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} м`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
    return `${Math.floor(diff / 86_400_000)} д`;
}

export default function ChatsPage() {
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useChats();
    const chats: Chat[] = data?.pages.flatMap((p) => p.chats ?? []) ?? [];

    return (
        <div>
            <div className="page-header">
                <span className="page-title">Чаты</span>
                <Button variant="ghost" size="icon" style={{ width: 32, height: 32 }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 3.5V16.5M3.5 10H16.5" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </Button>
            </div>

            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid hsl(var(--border))" }}>
                        <Skeleton style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                            <Skeleton style={{ width: "55%", height: 13 }} />
                            <Skeleton style={{ width: "35%", height: 11 }} />
                        </div>
                        <Skeleton style={{ width: 24, height: 11 }} />
                    </div>
                ))
            ) : chats.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 32px", gap: 16, textAlign: "center" }}>
                    <div style={{
                        width: 56, height: 56,
                        background: "hsl(var(--secondary))",
                        borderRadius: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid hsl(var(--border))",
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "hsl(var(--muted-foreground))" }}>
                            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: 6 }}>Нет чатов</p>
                        <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", lineHeight: 1.5, maxWidth: 240 }}>
                            Начните новый чат с любым AI-ассистентом
                        </p>
                    </div>
                    <Button style={{ marginTop: 4 }}>Начать чат</Button>
                </div>
            ) : (
                <>
                    {chats.map((chat, i) => (
                        <button
                            key={chat.dialogue_id}
                            style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "12px 16px", width: "100%",
                                background: "none", border: "none",
                                borderBottom: i < chats.length - 1 ? "1px solid hsl(var(--border))" : "none",
                                cursor: "pointer", textAlign: "left",
                                transition: "background 0.12s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--secondary))")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        >
                            <Avatar style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid hsl(var(--border))", flexShrink: 0 }}>
                                <AvatarImage src={chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.model)}&background=1c1c1c&color=ffffff&bold=true&size=88`} />
                                <AvatarFallback style={{ borderRadius: 10, background: "hsl(var(--muted))", fontSize: 12, fontWeight: 600 }}>
                                    {chat.model?.slice(0, 2) || "AI"}
                                </AvatarFallback>
                            </Avatar>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {chat.title || chat.model}
                                </div>
                                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                                    {chat.version}
                                </div>
                            </div>

                            <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                                {timeAgo(chat.last_activity || chat.started_at)}
                            </span>
                        </button>
                    ))}

                    {hasNextPage && (
                        <div style={{ padding: "16px" }}>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                            >
                                {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}