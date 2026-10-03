import type { Locale } from '../engine/schema.ts';
import en from './en.json';
import ja from './ja.json';

/** Dictionary key. ja.json is the reference; en.json must have the same keys (tested). */
export type MessageKey = keyof typeof ja;

/** All UI dictionaries. */
export const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { ja, en };

/** Supported locales in toggle order. */
export const LOCALES: readonly Locale[] = ['ja', 'en'];

/**
 * Translate a key with `{name}` placeholders.
 * @param locale - target locale
 * @param key - dictionary key
 * @param params - placeholder values
 * @returns the translated string (the key itself if missing, so gaps are visible)
 */
export function translate(locale: Locale, key: MessageKey, params: Record<string, string | number> = {}): string {
  const template = DICTIONARIES[locale][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/**
 * Pick the initial locale from a stored value or the browser language.
 * @param stored - previously saved locale (may be null or garbage)
 * @param browserLanguage - e.g. navigator.language
 * @returns a supported locale
 */
export function initialLocale(stored: string | null, browserLanguage: string | undefined): Locale {
  if (stored === 'ja' || stored === 'en') return stored;
  return browserLanguage?.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}
