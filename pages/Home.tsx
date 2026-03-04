"use client";

import { useModels, useRoles, useUser } from "@/hooks/useApi";
import { Model, Role } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function modelAvatar(m: Model) {
    return m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff&bold=true&size=128`;
}

function localize(v: any, lang = "ru"): string {
    if (!v) return "";
    if (typeof v === "string") return v;
    return v[lang] || v.en || v.ru || Object.values(v)[0] || "";
}

const MOCK_MODELS = [
    { tech_name: "gpt", model_name: "GPT", categories: ["text"], versions: [{ label: "4o", cost: 2 }], input: ["text"] },
    { tech_name: "claude", model_name: "Claude", categories: ["text"], versions: [{ label: "3.5", cost: 8 }], input: ["text"] },
    { tech_name: "gemini", model_name: "Gemini", categories: ["text", "image"], versions: [{ label: "1.5", cost: 1 }], input: ["text"] },
    { tech_name: "deepseek", model_name: "DeepSeek", categories: ["text"], versions: [{ label: "v2", cost: 6 }], input: ["text"] },
    { tech_name: "nano-banana", model_name: "Nano Banana", categories: ["image"], versions: [{ label: "v1", cost: 12 }], input: ["text"] },
    { tech_name: "veo", model_name: "Veo", categories: ["video"], versions: [{ label: "2", cost: 24 }], input: ["text"] },
    { tech_name: "kling", model_name: "Kling", categories: ["video"], versions: [{ label: "1.5", cost: 20 }], input: ["text"] },
    { tech_name: "suno", model_name: "Suno AI", categories: ["audio"], versions: [{ label: "v4", cost: 10 }], input: ["text"] },
] as Model[];

const MOCK_ROLES = [
    { id: 1, label: "Шерлок Холмс", image: "" },
    { id: 2, label: "Сунь-цзы", image: "" },
    { id: 3, label: "Макиавелли", image: "" },
    { id: 4, label: "Алан Тьюринг", image: "" },
    { id: 5, label: "Никола Тесла", image: "" },
] as Role[];

const TRENDING_ITEMS = [
    "Создай свой 2D-аватар",
    "Открой возможности GPT",
    "Фотореалистичные изображения",
    "AI-чат для поддержки клиентов",
];

export default function HomePage() {
    const { data: modelsData, isLoading: modelsLoading } = useModels();
    const { data: rolesData } = useRoles();
    const { data: userData } = useUser();

    const models: Model[] = modelsData?.categories
        ? Object.values(modelsData.categories).flat().slice(0, 8)
        : MOCK_MODELS;

    const roles: Role[] = rolesData?.roles?.slice(0, 5) || MOCK_ROLES;
    const tokens = userData?.user?.tokens ?? 0;

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <span className="page-title">All AI</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge variant="secondary" style={{ gap: 5, paddingLeft: 8, paddingRight: 10, height: 28, fontSize: 13 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
                            <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z" />
                        </svg>
                        {tokens}
                    </Badge>
                </div>
            </div>

            {/* Models grid */}
            <section style={{ padding: "20px 16px 0" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                    Модели
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px 8px" }}>
                    {modelsLoading
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                <Skeleton style={{ width: 52, height: 52, borderRadius: "50%" }} />
                                <Skeleton style={{ width: 44, height: 10 }} />
                            </div>
                        ))
                        : models.map((m) => (
                            <button
                                key={m.tech_name}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            >
                                <Avatar style={{ width: 52, height: 52, border: "1px solid hsl(var(--border))" }}>
                                    <AvatarImage src={modelAvatar(m)} alt={m.model_name} />
                                    <AvatarFallback style={{ fontSize: 13, background: "hsl(var(--secondary))", fontWeight: 600 }}>
                                        {m.model_name.slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontWeight: 500, textAlign: "center", maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.model_name}
                                </span>
                            </button>
                        ))}
                </div>
            </section>

            <Separator style={{ margin: "20px 0 0" }} />

            {/* AI Assistants */}
            <section style={{ padding: "20px 0 0" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, paddingLeft: 16 }}>
                    AI Ассистенты
                </p>
                <div style={{ display: "flex", gap: 10, paddingLeft: 16, paddingRight: 16, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", width: 72 }}
                        >
                            <Avatar style={{ width: 56, height: 56, border: "1px solid hsl(var(--border))", borderRadius: 12 }}>
                                <AvatarImage src={role.image || ""} />
                                <AvatarFallback style={{ borderRadius: 12, background: "hsl(var(--secondary))", fontSize: 18 }}>
                                    {localize(role.label).slice(0, 1)}
                                </AvatarFallback>
                            </Avatar>
                            <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontWeight: 500, textAlign: "center", lineHeight: 1.3, width: "100%" }}>
                                {localize(role.label)}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <Separator style={{ margin: "20px 0 0" }} />

            {/* Trending */}
            <section style={{ padding: "20px 16px 0" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                    В тренде
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {TRENDING_ITEMS.map((item, i) => (
                        <button
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 12px",
                                borderRadius: 8,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                width: "100%",
                                textAlign: "left",
                                color: "hsl(var(--foreground))",
                                transition: "background 0.12s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--secondary))")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        >
                            <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: "hsl(var(--secondary))",
                                border: "1px solid hsl(var(--border))",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                                fontSize: 14,
                            }}>
                                {["🎨", "🤖", "📸", "💬"][i]}
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{item}</span>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                                <path d="M7.293 4.707L12.586 10l-5.293 5.293 1.414 1.414L15.414 10 8.707 3.293 7.293 4.707z" />
                            </svg>
                        </button>
                    ))}
                </div>
            </section>

            <div style={{ height: 24 }} />
        </div>
    );
}