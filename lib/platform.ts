export function getPlatformInitData(): string | null {
    if (typeof window === 'undefined') return null;

    const tg = (window as any)?.Telegram?.WebApp;
    if (tg?.initData) return tg.initData;

    const maxWA = (window as any)?.WebApp;
    if (maxWA?.initData) return maxWA.initData;

    try {
        const raw = sessionStorage.getItem('__telegram__initParams');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.tgWebAppData) return parsed.tgWebAppData;
        }
    } catch { }

    return null;
}