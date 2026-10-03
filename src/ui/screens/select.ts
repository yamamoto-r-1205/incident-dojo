import type { Scenario } from '../../engine/schema.ts';
import { type AppContext, readBest, type Screen } from '../app.ts';
import { h } from '../dom.ts';

/**
 * Scenario list with severity, category, par and best score.
 * @param ctx - app context
 * @returns screen
 */
export function selectScreen(ctx: AppContext): Screen {
  const heading = h('h2', { text: ctx.t('select.heading'), attrs: { id: 'select-heading', tabindex: '-1' } });
  const { scenarios, errors } = ctx.catalog;

  const list =
    scenarios.length === 0
      ? h('p', { text: ctx.t('select.empty') })
      : h('ul', { class: 'scenario-list' }, scenarios.map((s) => h('li', {}, [card(ctx, s)])));

  const errorBox =
    errors.length > 0
      ? h('div', { class: 'notice error', attrs: { role: 'alert' } }, [
          ctx.t('select.loadError', { file: errors.map((e) => e.file).join(', ') }),
        ])
      : null;

  const element = h('section', { class: 'screen', attrs: { 'aria-labelledby': 'select-heading' } }, [heading, errorBox, list]);
  return { element, focusTarget: () => heading.focus() };
}

function card(ctx: AppContext, s: Scenario): HTMLElement {
  const locale = ctx.locale();
  const best = readBest(ctx.store, s.id);
  return h(
    'button',
    { class: 'scenario-card', attrs: { type: 'button', 'data-id': s.id }, on: { click: () => ctx.go.briefing(s) } },
    [
      h('span', { class: `badge sev-${s.severity.toLowerCase()}`, text: s.severity, attrs: { title: ctx.t('select.severity') } }),
      h('span', { class: 'badge cat', text: s.category.toUpperCase(), attrs: { title: ctx.t('select.category') } }),
      h('span', { class: 'card-title', text: s.title[locale] }),
      h('span', { class: 'card-meta', text: ctx.t('select.par', { par: s.par }) }),
      best ? h('span', { class: 'card-best', text: ctx.t('select.best', { score: best.score, rank: best.rank }) }) : null,
    ],
  );
}
