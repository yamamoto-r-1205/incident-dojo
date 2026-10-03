import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import { initialLocale, translate } from '../src/i18n/index.ts';
import ja from '../src/i18n/ja.json';

describe('i18n', () => {
  it('ja and en dictionaries have identical keys (Validates: Requirements 9.1)', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ja).sort());
  });

  it('no dictionary value is empty', () => {
    for (const dict of [ja, en]) for (const v of Object.values(dict)) expect(v.trim()).not.toBe('');
  });

  it('placeholders are the same in both languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(ja) as (keyof typeof ja)[]) expect(ph(en[key])).toEqual(ph(ja[key]));
  });

  it('translate interpolates params', () => {
    expect(translate('en', 'select.par', { par: 8 })).toBe('Par 8 commands');
  });

  it('initialLocale prefers stored value, then browser language', () => {
    expect(initialLocale('en', 'ja-JP')).toBe('en');
    expect(initialLocale(null, 'ja-JP')).toBe('ja');
    expect(initialLocale('xx', 'fr-FR')).toBe('en');
  });
});
