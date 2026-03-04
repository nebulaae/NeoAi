"use client";
import { useState } from "react";
import { useModels } from "@/hooks/useApi";
import { Model } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const TABS = [
    { key: "all", label: "Все" },
    { key: "text", label: "Текст" },
    { key: "image", label: "Фото" },
    { key: "video", label: "Видео" },
    { key: "audio", label: "Аудио" },
];

const MOCK: Model[] = [
    { tech_name: "gpt", model_name: "GPT", categories: ["text"], versions: [{ label: "4o", cost: 2, default: true }], input: ["text"] },
    { tech_name: "claude", model_name: "Claude", categories: ["text"], versions: [{ label: "3.5", cost: 8, default: true }], input: ["text"] },
    { tech_name: "gemini", model_name: "Gemini", categories: ["text", "image"], versions: [{ label: "1.5", cost: 1, default: true }], input: ["text"] },
    { tech_name: "deepseek", model_name: "DeepSeek", categories: ["text"], versions: [{ label: "v2", cost: 6, default: true }], input: ["text"] },
    { tech_name: "nano-banana", model_name: "Nano Banana", categories: ["image"], versions: [{ label: "v1", cost: 12, default: true }], input: ["text"] },
    { tech_name: "veo", model_name: "Veo", categories: ["video"], versions: [{ label: "2", cost: 24, default: true }], input: ["text"] },
    { tech_name: "kling", model_name: "Kling", categories: ["video"], versions: [{ label: "1.5", cost: 20, default: true }], input: ["text"] },
    { tech_name: "suno", model_name: "Suno AI", categories: ["audio"], versions: [{ label: "v4", cost: 10, default: true }], input: ["text"] },
];

function avatar(m: Model) {
    return m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff&bold=true&size=128`;
}

function cost(m: Model) {
    return (m.versions?.find((v) => v.default) || m.versions?.[0])?.cost ?? 1;
}

function categoryLabel(cats: string[]) {
    if (cats.includes("text")) return "Текст";
    if (cats.includes("image")) return "Фото";
    if (cats.includes("video")) return "Видео";
    if (cats.includes("audio")) return "Аудио";
    return "";
}

export default function ModelsPage() {
    const [tab, setTab] = useState("all");
    const { data, isLoading } = useModels();

    const all: Model[] = data?.categories
        ? Object.entries(data.categories).flatMap(([cat, ms]) => (ms as Model[]).map((m) => ({ ...m, mainCategory: cat })))
        : MOCK;

    const filtered = tab === "all" ? all : all.filter((m) => m.categories?.includes(tab) || m.mainCategory === tab);

    return (
        <div>
            <div className="page-header">
                <span className="page-title">Модели</span>
            </div>

            {/* Category tabs */}
            <div className="tabs-row">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        className={`tab-pill ${tab === t.key ? "active" : ""}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div>
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid hsl(var(--border))" }}>
                            <Skeleton style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                <Skeleton style={{ width: "50%", height: 13 }} />
                                <Skeleton style={{ width: "28%", height: 11 }} />
                            </div>
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 24px", gap: 10 }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: "hsl(var(--muted-foreground))" }}>
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>Нет моделей в этой категории</p>
                    </div>
                ) : (
                    filtered.map((m, i) => (
                        <button
                            key={m.tech_name}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 16px",
                                width: "100%",
                                background: "none",
                                border: "none",
                                borderBottom: i < filtered.length - 1 ? "1px solid hsl(var(--border))" : "none",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "background 0.12s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--secondary))")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        >
                            <Avatar style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid hsl(var(--border))", flexShrink: 0 }}>
                                <AvatarImage src={avatar(m)} />
                                <AvatarFallback style={{ borderRadius: 10, background: "hsl(var(--muted))", fontSize: 12, fontWeight: 600 }}>
                                    {m.model_name.slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {m.model_name}
                                </div>
                                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                                    {categoryLabel(m.categories)}
                                </div>
                            </div>

                            <Badge variant="secondary" style={{ gap: 4, fontSize: 12, flexShrink: 0 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                                    <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
                                </svg>
                                {cost(m)}
                            </Badge>

                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                                <path d="M7.293 4.707L12.586 10l-5.293 5.293 1.414 1.414L15.414 10 8.707 3.293 7.293 4.707z" />
                            </svg>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}