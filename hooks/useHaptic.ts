/**
 * useHaptic — тактильная отдача для Telegram Web App
 * Автоматически деградирует до no-op вне Telegram-среды
 */
export function useHaptic() {
  const hf = () => (window as any)?.Telegram?.WebApp?.HapticFeedback ?? null;

  return {
    /** Лёгкий тап — обычные кнопки, навигация */
    light: () => hf()?.impactOccurred('light'),
    /** Средний тап — важные действия */
    medium: () => hf()?.impactOccurred('medium'),
    /** Тяжёлый тап — деструктивные / акцентные действия */
    heavy: () => hf()?.impactOccurred('heavy'),
    /** Успех */
    success: () => hf()?.notificationOccurred('success'),
    /** Ошибка */
    error: () => hf()?.notificationOccurred('error'),
    /** Предупреждение */
    warning: () => hf()?.notificationOccurred('warning'),
    /** Клик по выбору (таббар, пилюли) */
    selection: () => hf()?.selectionChanged(),
  };
}
