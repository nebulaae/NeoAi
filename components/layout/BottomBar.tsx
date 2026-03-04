"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
    {
        href: "/",
        label: "Главная",
        icon: (active: boolean) => (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                    d="M2.5 8.333L10 2.5l7.5 5.833V16.667a.833.833 0 01-.834.833H12.5V12.5h-5v5H3.334a.833.833 0 01-.834-.833V8.333z"
                    stroke="currentColor"
                    strokeWidth={active ? "1.8" : "1.5"}
                    strokeLinejoin="round"
                    fill={active ? "currentColor" : "none"}
                    fillOpacity={active ? "0.12" : "0"}
                />
            </svg>
        ),
    },
    {
        href: "/models",
        label: "Модели",
        icon: (active: boolean) => (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.12" : "0"} />
                <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round" />
            </svg>
        ),
    },
    {
        href: "/generate",
        label: "Создать",
        isCenter: true,
        icon: (active: boolean) => (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3.5V16.5M3.5 10H16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        href: "/chats",
        label: "Чаты",
        icon: (active: boolean) => (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                    d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v8A1.5 1.5 0 0115.5 14H11l-4 3v-3H4.5A1.5 1.5 0 013 12.5v-8z"
                    stroke="currentColor"
                    strokeWidth={active ? "1.8" : "1.5"}
                    strokeLinejoin="round"
                    fill={active ? "currentColor" : "none"}
                    fillOpacity={active ? "0.12" : "0"}
                />
            </svg>
        ),
    },
    {
        href: "/profile",
        label: "Профиль",
        icon: (active: boolean) => (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"} fill={active ? "currentColor" : "none"} fillOpacity={active ? "0.12" : "0"} />
                <path d="M3.5 17c0-3.038 2.91-5.5 6.5-5.5s6.5 2.462 6.5 5.5" stroke="currentColor" strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round" />
            </svg>
        ),
    },
];

export function BottomBar() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            {NAV.map((item) => {
                const active = pathname === item.href;

                if (item.isCenter) {
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                flex: 1,
                                maxWidth: 80,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    background: active ? "hsl(var(--foreground))" : "hsl(var(--secondary))",
                                    color: active ? "hsl(var(--background))" : "hsl(var(--foreground))",
                                    borderRadius: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.15s ease",
                                    border: "1px solid hsl(var(--border))",
                                }}
                            >
                                {item.icon(active)}
                            </div>
                        </Link>
                    );
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn("nav-item", active && "active")}
                    >
                        {item.icon(active)}
                        <span className="nav-item-label">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}