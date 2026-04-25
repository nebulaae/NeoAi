'use client';

export type AppSource = 'tg' | 'max' | 'browser';

const SOURCE_KEY = 'app_source';

export function getAppSource(): AppSource {
  if (typeof window === 'undefined') return 'browser';

  // 1. Try URL parameter
  const params = new URLSearchParams(window.location.search);
  const sourceParam = params.get('source');

  if (sourceParam === 'tg' || sourceParam === 'max') {
    localStorage.setItem(SOURCE_KEY, sourceParam);
    return sourceParam;
  }

  // 2. Try persisted source
  const persisted = localStorage.getItem(SOURCE_KEY);
  if (persisted === 'tg' || persisted === 'max') {
    return persisted as AppSource;
  }

  // 3. Default to browser
  return 'browser';
}
