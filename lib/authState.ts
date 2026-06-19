/**
 * Сигнал «авторизация внутри WebApp завершена».
 *
 * Проблема, которую решает: при первом открытии мини-аппа провайдер
 * (TelegramProvider/MaxProvider) асинхронно получает initData и дергает
 * /api/auth/tma. Это может занять несколько секунд. AuthGuard раньше
 * сдавался по таймеру (1.5с) и показывал экран входа — а через мгновение
 * приходил успешный логин. Отсюда «мигание» экрана входа на первом запуске.
 *
 * Теперь провайдеры явно сообщают, что попытка тихого входа завершена
 * (успех ИЛИ исчерпаны ретраи), и только тогда AuthGuard принимает решение
 * показывать ли NotAuthorized.
 */

let settled = false;
const listeners = new Set<() => void>();

/** Вызывается провайдером, когда тихий вход завершён (успех или окончательный провал). */
export function markAuthSettled(): void {
  if (settled) return;
  settled = true;
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export function isAuthSettled(): boolean {
  return settled;
}

/** Подписка на завершение тихого входа. Возвращает функцию отписки. */
export function onAuthSettled(cb: () => void): () => void {
  if (settled) {
    cb();
    return () => {};
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
}
