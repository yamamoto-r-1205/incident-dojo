import type { AppContext, Screen } from '../app.ts';
import { h } from '../dom.ts';

/**
 * Title screen: what the game is, the core loop and a start button.
 * @param ctx - app context
 * @returns screen
 */
export function titleScreen(ctx: AppContext): Screen {
  const start = h('button', { class: 'btn primary', text: ctx.t('title.start'), on: { click: () => ctx.go.select() } });
  const steps = (['title.step1', 'title.step2', 'title.step3', 'title.step4', 'title.step5'] as const).map((k) =>
    h('li', { text: ctx.t(k) }),
  );
  const element = h('section', { class: 'screen title-screen', attrs: { 'aria-labelledby': 'title-heading' } }, [
    h('h1', { text: ctx.t('app.title'), attrs: { id: 'title-heading', tabindex: '-1' } }),
    h('p', { class: 'tagline', text: ctx.t('app.tagline') }),
    h('p', { class: 'lead', text: ctx.t('title.lead') }),
    h('ol', { class: 'steps' }, steps),
    h('p', { class: 'safety', text: ctx.t('title.safety') }),
    start,
  ]);
  return { element, focusTarget: () => start.focus() };
}
