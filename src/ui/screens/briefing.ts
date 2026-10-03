import type { Scenario } from '../../engine/schema.ts';
import type { AppContext, Screen } from '../app.ts';
import { h } from '../dom.ts';

/**
 * Briefing for one scenario.
 * @param ctx - app context
 * @param s - selected scenario
 * @returns screen
 */
export function briefingScreen(ctx: AppContext, s: Scenario): Screen {
  const locale = ctx.locale();
  const start = h('button', { class: 'btn primary', text: ctx.t('briefing.start'), on: { click: () => ctx.go.play(s) } });
  const element = h('section', { class: 'screen briefing', attrs: { 'aria-labelledby': 'briefing-heading' } }, [
    h('p', { class: 'eyebrow', text: ctx.t('briefing.heading') }),
    h('h2', { text: s.title[locale], attrs: { id: 'briefing-heading', tabindex: '-1' } }),
    h('p', {}, [
      h('span', { class: `badge sev-${s.severity.toLowerCase()}`, text: s.severity }),
      h('span', { class: 'badge cat', text: s.category.toUpperCase() }),
      h('span', { class: 'card-meta', text: `${ctx.t('briefing.host')}: ${s.host}` }),
    ]),
    h('p', { class: 'briefing-text', text: s.briefing[locale] }),
    h('div', { class: 'actions' }, [
      start,
      h('button', { class: 'btn', text: ctx.t('briefing.back'), on: { click: () => ctx.go.select() } }),
    ]),
  ]);
  return { element, focusTarget: () => start.focus() };
}
