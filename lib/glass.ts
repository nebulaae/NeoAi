/**
 * Liquid Glass Design System — Tailwind class tokens
 * Все glass-варианты в одном месте. Используй cn() для объединения с кастомными классами.
 *
 * Принцип: backdrop-blur + полупрозрачный bg + тонкая border + specular inset-shadow
 * Никаких tailwind.config расширений — только дефолтные классы Tailwind v3/v4.
 */

/** Базовые glass-поверхности */
export const glass = {
  /** Почти прозрачный — заголовки, хром-бары */
  ultraThin:
    'bg-white/[.04] dark:bg-black/[.35] backdrop-blur-2xl backdrop-saturate-150 border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',

  /** Тонкое стекло — инпуты, второстепенные карточки */
  thin: 'bg-white/[.07] dark:bg-black/[.45] backdrop-blur-xl backdrop-saturate-150 border border-white/[.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.18)]',

  /** Основное стекло — карточки, панели */
  regular:
    'bg-white/[.10] dark:bg-black/[.55] backdrop-blur-2xl backdrop-saturate-180 border border-white/[.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_4px_16px_rgba(0,0,0,0.22)]',

  /** Толстое стекло — сайдбар, модалки */
  thick:
    'bg-white/[.13] dark:bg-black/[.65] backdrop-blur-3xl backdrop-saturate-200 border border-white/[.22] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.28)]',

  /** Chrome — боттомбар, попоэверы */
  chrome:
    'bg-white/[.08] dark:bg-black/[.72] backdrop-blur-3xl backdrop-saturate-200 border border-white/[.20] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_40px_rgba(0,0,0,0.32)]',
} as const;

/** Акцент-кнопка (синяя) */
export const glassBlue =
  'bg-[rgba(0,122,255,0.82)] backdrop-blur-xl border border-[rgba(0,122,255,0.30)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_24px_rgba(0,122,255,0.38)]';

/** Акцент hover */
export const glassBlueHover =
  'hover:bg-[rgba(0,122,255,0.92)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.40),0_8px_28px_rgba(0,122,255,0.48)]';

/** Общие переходы для интерактивных элементов */
export const glassTransition =
  'transition-all duration-[280ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

/** Скейл при нажатии (active-state) */
export const pressScale = 'active:scale-[0.94] active:brightness-90';

/** Радиусы — Apple style */
export const radius = {
  xs: 'rounded-md', // 6–8px
  sm: 'rounded-lg', // 8–10px
  md: 'rounded-xl', // 12–14px
  lg: 'rounded-2xl', // 16px
  xl: 'rounded-[20px]', // 20px
  xxl: 'rounded-3xl', // 24px
  pill: 'rounded-full',
} as const;

/** Типографика — SF Pro-style */
export const text = {
  navTitle: 'text-[22px] font-bold tracking-[-0.5px]',
  sectionCap: 'text-[11px] font-bold tracking-[0.7px] uppercase text-white/50',
  bodyLg: 'text-[15px] leading-snug',
  bodySm: 'text-[13px] leading-snug',
  caption: 'text-[11px] leading-none',
  mono: 'font-mono text-[12px]',
} as const;
