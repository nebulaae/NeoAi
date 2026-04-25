'use client';

import Script from 'next/script';
import { getAppSource } from '@/lib/source';
import { useEffect, useState } from 'react';

export function DynamicScripts() {
  const [source, setSource] = useState<'tg' | 'max' | 'browser' | null>(null);

  useEffect(() => {
    setSource(getAppSource());
  }, []);

  if (!source) return null;

  return (
    <>
      {source === 'tg' && (
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      )}
      {source === 'max' && (
        <Script
          src="https://st.max.ru/js/max-web-app.js"
          strategy="beforeInteractive"
        />
      )}
    </>
  );
}
