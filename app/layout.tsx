import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { GeistSans } from 'geist/font/sans';
import { TelegramProvider } from './providers/TelegramProvider';
import { MaxProvider } from './providers/MaxProvider';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { BotProvider } from './providers/BotProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { PlatformScripts } from './providers/PlatformScripts';

import './globals.css';
import { ThemeProviders } from './providers/ThemeProviders';
import { TelegramLoginScript } from './providers/TelegramLoginScript';

// Базовый URL приложения для canonical/OG. Задаётся через NEXT_PUBLIC_APP_URL.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.neoaipro.com';
const APP_NAME = 'NeoAI';
const APP_DESC =
  'NeoAI — все нейросети в одном приложении: генерация фото и видео, AI-чаты (GPT, Claude, Gemini), музыка и роли. Опишите идею — получите результат за секунды.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — генерация фото, видео и AI-чаты`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESC,
  applicationName: APP_NAME,
  keywords: [
    'нейросеть',
    'генерация изображений',
    'генерация видео',
    'AI чат',
    'GPT',
    'Claude',
    'Gemini',
    'Suno',
    'Kling',
    'нейросеть онлайн',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: `${APP_NAME} — генерация фото, видео и AI-чаты`,
    description: APP_DESC,
    url: APP_URL,
    locale: 'ru_RU',
    images: [{ url: '/logo-neo.jpg', width: 1200, height: 630, alt: APP_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — генерация фото, видео и AI-чаты`,
    description: APP_DESC,
    images: ['/logo-neo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: { icon: '/favicon.ico' },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`dark ${GeistSans.className}`}>
      <head>
        {/*
          PlatformScripts грузит SDK Telegram и Max безусловно.
          Это устраняет гонку между загрузкой скрипта и попыткой
          прочитать initData в провайдерах.
          Если telegram.org недоступен (source=max) — onError игнорируется,
          страница работает через Max SDK.
        */}
        <PlatformScripts />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Structured data (schema.org) — помогает поисковикам понять продукт */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: APP_NAME,
              applicationCategory: 'MultimediaApplication',
              operatingSystem: 'Web, Telegram',
              description: APP_DESC,
              url: APP_URL,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
            }),
          }}
        />
      </head>
      <body style={{ fontFamily: GeistSans.style.fontFamily, margin: 0 }}>
        <QueryProvider>
          <BotProvider>
            <TelegramLoginScript />
            <AuthProvider>
              <TelegramProvider>
                <MaxProvider>
                  <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeProviders>
                      {children}
                      <Toaster
                        position="top-center"
                        toastOptions={{
                          style: {
                            background: 'var(--glass-thick)',
                            backdropFilter: 'blur(50px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(50px) saturate(180%)',
                            border: 'var(--glass-border-thick)',
                            boxShadow:
                              'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.3)',
                            borderRadius: '16px',
                            color: 'var(--sys-label)',
                            fontSize: '14px',
                            fontWeight: 500,
                            fontFamily: 'var(--font-sf)',
                          },
                        }}
                      />
                    </ThemeProviders>
                  </NextIntlClientProvider>
                </MaxProvider>
              </TelegramProvider>
            </AuthProvider>
          </BotProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
