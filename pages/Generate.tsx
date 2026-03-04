"use client";
import { useState } from "react";
import { useModels, useGenerate } from "@/hooks/useApi";
import { Model } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const GEN_MOCK: Model[] = [
  { tech_name: "nano-banana", model_name: "Nano Banana", categories: ["image"], versions: [{ label: "v1", cost: 12, default: true }], input: ["text"] },
  { tech_name: "veo", model_name: "Veo", categories: ["video"], versions: [{ label: "2", cost: 24, default: true }], input: ["text"] },
  { tech_name: "kling", model_name: "Kling", categories: ["video"], versions: [{ label: "1.5", cost: 20, default: true }], input: ["text", "image"] },
  { tech_name: "suno", model_name: "Suno AI", categories: ["audio"], versions: [{ label: "v4", cost: 10, default: true }], input: ["text"] },
];

function avatar(m: Model) {
  return m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=ffffff&bold=true&size=128`;
}
function defaultCost(m: Model) {
  return (m.versions?.find((v) => v.default) || m.versions?.[0])?.cost ?? 1;
}
function categoryEmoji(cats: string[]) {
  if (cats.includes("video")) return "🎬";
  if (cats.includes("audio")) return "🎵";
  if (cats.includes("image")) return "🖼️";
  return "✨";
}

export default function GeneratePage() {
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const { data: modelsData, isLoading } = useModels();
  const generate = useGenerate();

  const allModels: Model[] = modelsData?.categories
    ? Object.entries(modelsData.categories)
        .flatMap(([cat, ms]) => (ms as Model[]).filter((m) => !m.categories?.includes("text")).map((m) => ({ ...m, mainCategory: cat })))
    : GEN_MOCK;

  const models = allModels.length > 0 ? allModels : GEN_MOCK;
  const selected = models.find((m) => m.tech_name === selectedTech);

  const handleGenerate = () => {
    if (!selected || !prompt.trim()) return;
    generate.mutate({
      tech_name: selected.tech_name,
      version: (selected.versions?.find((v) => v.default) || selected.versions?.[0])?.label,
      inputs: { text: prompt, media: [] },
    });
  };

  if (selected) {
    return (
      <div>
        <div className="page-header">
          <button
            onClick={() => { setSelectedTech(null); setPrompt(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontSize: 14, padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12.707 15.293L7.414 10l5.293-5.293-1.414-1.414L4.586 10l6.707 6.707 1.414-1.414z"/>
            </svg>
            Назад
          </button>
          <span className="page-title">{selected.model_name}</span>
          <Badge variant="secondary" style={{ gap: 4, fontSize: 12 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
              <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z"/>
            </svg>
            {defaultCost(selected)}
          </Badge>
        </div>

        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите что хотите создать..."
            rows={5}
            style={{ resize: "none", fontSize: 15, lineHeight: 1.6, background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}
          />

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generate.isPending}
            className="w-full"
            style={{ height: 44, fontSize: 15 }}
          >
            {generate.isPending ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Генерация...
              </span>
            ) : "Создать"}
          </Button>

          {generate.data?.result && (
            <div style={{ padding: 16, background: "hsl(var(--secondary))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
              {generate.data.result.text && (
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "hsl(var(--foreground))" }}>
                  {generate.data.result.text}
                </p>
              )}
              {generate.data.result.media?.map((m: any, i: number) => (
                <div key={i} style={{ marginTop: 12 }}>
                  {m.type === "image" && <img src={m.input || m.url} alt="" style={{ borderRadius: 8, width: "100%" }} />}
                  {m.type === "video" && <video src={m.input || m.url} controls style={{ borderRadius: 8, width: "100%" }} />}
                  {m.type === "audio" && <audio src={m.input || m.url} controls style={{ width: "100%" }} />}
                </div>
              ))}
            </div>
          )}

          {generate.isError && (
            <p style={{ fontSize: 13, color: "hsl(var(--destructive))", padding: "10px 14px", background: "hsl(var(--destructive) / 0.1)", borderRadius: 8, border: "1px solid hsl(var(--destructive) / 0.2)" }}>
              Ошибка при генерации. Попробуйте снова.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-title">Создать</span>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          Выберите модель
        </p>
        <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginBottom: 16 }}>
          Начните генерацию
        </p>
      </div>

      <Separator />

      <div>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid hsl(var(--border))" }}>
                <Skeleton style={{ width: 40, height: 40, borderRadius: 10 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <Skeleton style={{ width: "45%", height: 13 }} />
                  <Skeleton style={{ width: "25%", height: 11 }} />
                </div>
              </div>
            ))
          : models.map((m, i) => (
              <button
                key={m.tech_name}
                onClick={() => setSelectedTech(m.tech_name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  width: "100%",
                  background: "none",
                  border: "none",
                  borderBottom: i < models.length - 1 ? "1px solid hsl(var(--border))" : "none",
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                    {m.model_name}
                  </div>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                    {categoryEmoji(m.categories)} {m.categories?.[0] === "image" ? "Фото" : m.categories?.[0] === "video" ? "Видео" : "Аудио"}
                  </div>
                </div>

                <Badge variant="secondary" style={{ gap: 4, fontSize: 12, flexShrink: 0 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                    <path d="M12 2L2 9l10 13 10-13L12 2zm0 3.5L18.5 9 12 18.5 5.5 9 12 5.5z"/>
                  </svg>
                  {defaultCost(m)}
                </Badge>
              </button>
            ))}
      </div>
    </div>
  );
}