import './styles.css';
import type { Locale } from './engine/schema.ts';
import { initialLocale, translate } from './i18n/index.ts';
import { loadCatalog } from './scenarios.ts';
import type { AppContext, Navigator, Screen } from './ui/app.ts';
import { h } from './ui/dom.ts';
import { briefingScreen } from './ui/screens/briefing.ts';
import { playScreen } from './ui/screens/play.ts';
import { resultScreen } from './ui/screens/result.ts';
import { selectScreen } from './ui/screens/select.ts';
import { titleScreen } from './ui/screens/title.ts';
import { createStore } from './ui/storage.ts';

// ---- Bootstrap ----

const LOCALE_KEY = 'incident-dojo:locale';
const root = document.getElementById('app');
if (!root) throw new Error('#app container is missing from index.html');

const store = createStore();
let locale: Locale = initialLocale(store.get(LOCALE_KEY), navigator.language);
let current: Screen | null = null;
let rebuild: () => Screen = () => titleScreen(ctx);

// ---- Navigation ----

const go: Navigator = {
  title: () => show(() => titleScreen(ctx)),
  select: () => show(() => selectScreen(ctx)),
  briefing: (s) => show(() => briefingScreen(ctx, s)),
  play: (s) => show(() => playScreen(ctx, s)),
  result: (s, state) => show(() => resultScreen(ctx, s, state)),
};

const ctx: AppContext = {
  catalog: loadCatalog(),
  store,
  go,
  locale: () => locale,
  t: (key, params) => translate(locale, key, params),
};

function show(factory: () => Screen): void {
  current?.dispose?.();
  rebuild = factory;
  current = factory();
  main.replaceChildren(current.element);
  current.onMount?.();
  (current.focusTarget ?? (() => main.focus()))();
  window.scrollTo(0, 0);
}

// ---- Shell (header / main / footer) ----

const langBtn = h('button', { class: 'btn ghost', attrs: { type: 'button' }, on: { click: toggleLocale } });
const homeBtn = h('button', { class: 'brand', attrs: { type: 'button' }, on: { click: () => go.title() } });
const main = h('main', { attrs: { id: 'main', tabindex: '-1' } });
const footer = h('footer', { class: 'footer' });

function toggleLocale(): void {
  locale = locale === 'ja' ? 'en' : 'ja';
  store.set(LOCALE_KEY, locale);
  renderShell();
  if (current?.relabel) current.relabel();
  else show(rebuild);
}

function renderShell(): void {
  document.documentElement.lang = locale;
  document.title = `${ctx.t('app.title')} - ${ctx.t('app.tagline')}`;
  langBtn.textContent = ctx.t('nav.switchLanguage');
  langBtn.setAttribute('aria-label', ctx.t('nav.switchLanguageLabel'));
  homeBtn.textContent = `🥋 ${ctx.t('app.title')}`;
  homeBtn.setAttribute('aria-label', ctx.t('nav.home'));
  footer.textContent = ctx.t('footer.disclaimer');
}

root.replaceChildren(h('header', { class: 'header' }, [homeBtn, langBtn]), main, footer);
renderShell();
go.title();
