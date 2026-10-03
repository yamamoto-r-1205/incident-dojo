import { renderPostmortem } from '../../engine/postmortem.ts';
import type { Scenario } from '../../engine/schema.ts';
import { computeScore } from '../../engine/scoring.ts';
import type { GameState } from '../../engine/types.ts';
import type { MessageKey } from '../../i18n/index.ts';
import { type AppContext, type Screen, saveBest } from '../app.ts';
import { downloadText, h } from '../dom.ts';

/**
 * Result screen: score, rank, penalty breakdown and the postmortem.
 * @param ctx - app context
 * @param scenario - scenario played
 * @param state - final game state
 * @returns screen
 */
export function resultScreen(ctx: AppContext, scenario: Scenario, state: GameState): Screen {
  const locale = ctx.locale();
  const s = computeScore(scenario, state);
  saveBest(ctx.store, scenario.id, { score: s.score, rank: s.rank });
  const markdown = renderPostmortem(scenario, state, locale);

  const heading = h('h2', { text: `${ctx.t('result.heading')}: ${scenario.title[locale]}`, attrs: { id: 'result-heading', tabindex: '-1' } });
  const breakdown: [MessageKey, number][] = [
    ['result.overPar', s.penalties.overPar],
    ['result.danger', s.penalties.danger],
    ['result.rootCause', s.penalties.rootCause],
    ['result.hints', s.penalties.hints],
    ['result.notRecovered', s.penalties.notRecovered],
  ];

  const element = h('section', { class: 'screen result', attrs: { 'aria-labelledby': 'result-heading' } }, [
    heading,
    h('div', { class: 'scoreboard' }, [
      h('p', { class: `rank rank-${s.rank.toLowerCase()}`, attrs: { 'aria-label': `${ctx.t('result.rank')} ${s.rank}` }, text: s.rank }),
      h('p', { class: 'score' }, [h('span', { class: 'label', text: ctx.t('result.score') }), ` ${s.score} / 100`]),
      h('p', { class: s.rootCauseCorrect ? 'ok' : 'ng', text: ctx.t(s.rootCauseCorrect ? 'result.correct' : 'result.wrong') }),
    ]),
    h('table', { class: 'breakdown' }, [
      h('caption', { text: ctx.t('result.breakdown') }),
      h(
        'tbody',
        {},
        breakdown.map(([k, v]) => h('tr', {}, [h('th', { text: ctx.t(k), attrs: { scope: 'row' } }), h('td', { text: v ? `-${v}` : '0' })])),
      ),
    ]),
    h('div', { class: 'actions' }, [
      h('button', {
        class: 'btn primary',
        text: ctx.t('result.download'),
        on: { click: () => downloadText(`postmortem-${scenario.id}-${locale}.md`, markdown) },
      }),
      h('button', { class: 'btn', text: ctx.t('result.retry'), on: { click: () => ctx.go.play(scenario) } }),
      h('button', { class: 'btn', text: ctx.t('result.back'), on: { click: () => ctx.go.select() } }),
    ]),
    h('h3', { text: ctx.t('result.postmortem') }),
    h('pre', { class: 'postmortem', text: markdown, attrs: { tabindex: '0' } }),
  ]);
  return { element, focusTarget: () => heading.focus() };
}
