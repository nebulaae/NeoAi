export const getAppSource = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    if (source) {
      sessionStorage.setItem('app_source', source);
      return source;
    }

    const cached = sessionStorage.getItem('app_source');
    if (cached) return cached;

    const tgRaw = sessionStorage.getItem('__telegram__initParams');
    if (tgRaw) {
      const parsed = JSON.parse(tgRaw);
      if (parsed?.tgWebAppData) {
        const detected = parsed.tgWebAppPlatform === 'weba' ? 'tg' : 'tg';
        sessionStorage.setItem('app_source', detected);
        return detected;
      }
    }

    if ((window as any)?.Telegram?.WebApp?.initData) {
      sessionStorage.setItem('app_source', 'tg');
      return 'tg';
    }
    if ((window as any)?.WebApp?.initData) {
      sessionStorage.setItem('app_source', 'max');
      return 'max';
    }
  } catch { }
  return null;
};