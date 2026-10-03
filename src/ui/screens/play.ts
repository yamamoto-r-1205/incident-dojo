import { BUILTINS, createInitialState, step } from '../../engine/engine.ts';
import type { Scenario } from '../../engine/schema.ts';
import type { GameState, OutputLine } from '../../engine/types.ts';
import type { MessageKey } from '../../i18n/index.ts';
import type { AppContext, Screen } from '../app.ts';
import { h } from '../dom.ts';
import { type DojoTerminal, mountTerminal } from '../terminal.ts';

/**
 * Play screen: status bar, helper buttons and the pseudo terminal.
 * @param ctx - app context
 * @param scenario - scenario being played
 * @returns screen
 */
export function playScreen(ctx: AppContext, scenario: Scenario): Screen {
  let state: GameState = createInitialState(scenario);

  // ---- Static layout ----

  const title = h('h2', { attrs: { id: 'play-heading', tabindex: '-1' } });
  const status = h('dl', { class: 'status' });
  const live = h('p', { class: 'sr-only', attrs: { 'aria-live': 'polite', role: 'status' } });
  const hintBtn = button('play.hint', () => submitFromButton('hint'));
  const causesBtn = button('play.causes', () => submitFromButton('causes'));
  const restartBtn = button('play.restart', () => ctx.go.play(scenario));
  const quitBtn = button('play.quit', () => ctx.go.select());
  const resultBtn = h('button', { class: 'btn primary', attrs: { hidden: '' }, on: { click: () => ctx.go.result(scenario, state) } });
  const termBox = h('div', { class: 'terminal', attrs: { role: 'region' } });

  const element = h('section', { class: 'screen play', attrs: { 'aria-labelledby': 'play-heading' } }, [
    h('div', { class: 'play-head' }, [title, status]),
    h('div', { class: 'toolbar', attrs: { role: 'toolbar' } }, [hintBtn, causesBtn, restartBtn, quitBtn, resultBtn]),
    live,
    termBox,
  ]);

  // ---- Engine wiring ----

  const submit = (line: string): { output: readonly OutputLine[]; clear: boolean } => {
    const before = state.phase;
    const result = step(scenario, state, line, ctx.locale());
    state = result.state;
    renderStatus();
    if (before !== state.phase) announcePhase();
    return result;
  };

  // xterm needs a laid-out container, so the terminal is created in onMount.
  let terminal: DojoTerminal | null = null;

  function mount(): void {
    terminal = mountTerminal(termBox, {
      host: scenario.host,
      ariaLabel: ctx.t('play.terminalLabel'),
      onSubmit: submit,
      completions: () => [
        ...BUILTINS,
        ...scenario.rootCauses.map((c) => `report ${c.id}`),
        ...scenario.commands.flatMap((r) => r.match),
      ],
    });
    terminal.print([{ kind: 'info', text: scenario.briefing[ctx.locale()] }, { kind: 'info', text: '' }]);
  }

  function submitFromButton(command: string): void {
    if (state.phase === 'reported') return;
    terminal?.print([{ kind: 'stdout', text: `$ ${command}` }, ...submit(command).output]);
    terminal?.focus();
  }

  // ---- Rendering ----

  function renderStatus(): void {
    const rows: [MessageKey, string][] = [
      ['play.phase', ctx.t(`play.phase.${state.phase}`)],
      ['play.commands', `${state.commandCount} / ${scenario.par}`],
      ['play.hints', String(state.hintsUsed)],
      ['play.penalty', String(state.dangerPenalty)],
    ];
    status.replaceChildren(...rows.flatMap(([k, v]) => [h('dt', { text: ctx.t(k) }), h('dd', { text: v })]));
    resultBtn.toggleAttribute('hidden', state.phase !== 'reported');
    hintBtn.disabled = state.phase === 'reported';
    causesBtn.disabled = state.phase === 'reported';
  }

  function announcePhase(): void {
    if (state.phase === 'recovered') live.textContent = ctx.t('play.announceRecovered');
    if (state.phase === 'reported') {
      live.textContent = ctx.t('play.announceReported');
      terminal?.lock();
      resultBtn.focus();
    }
  }

  function relabel(): void {
    title.textContent = scenario.title[ctx.locale()];
    for (const [btn, key] of [
      [hintBtn, 'play.hint'],
      [causesBtn, 'play.causes'],
      [restartBtn, 'play.restart'],
      [quitBtn, 'play.quit'],
      [resultBtn, 'play.toResult'],
    ] as const) {
      btn.textContent = ctx.t(key);
    }
    termBox.setAttribute('aria-label', ctx.t('play.terminalLabel'));
    renderStatus();
  }

  function button(key: MessageKey, onClick: () => void): HTMLButtonElement {
    return h('button', { class: 'btn', text: ctx.t(key), attrs: { type: 'button' }, on: { click: onClick } });
  }

  relabel();

  return {
    element,
    onMount: mount,
    focusTarget: () => terminal?.focus(),
    relabel,
    dispose: () => terminal?.dispose(),
  };
}
