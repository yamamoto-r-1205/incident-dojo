import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import type { OutputLine } from '../engine/types.ts';
import { applyEvent, createEditor, type LineEditorState, parseTerminalData } from './lineEditor.ts';

// ---- ANSI styling ----

const STYLE: Record<OutputLine['kind'], [string, string]> = {
  stdout: ['', ''],
  info: ['\x1b[36m', '\x1b[0m'],
  warn: ['\x1b[1;33m', '\x1b[0m'],
  success: ['\x1b[1;32m', '\x1b[0m'],
  error: ['\x1b[31m', '\x1b[0m'],
};

/** Options for the dojo terminal. */
export interface DojoTerminalOptions {
  readonly host: string;
  readonly ariaLabel: string;
  /** Called for every submitted line. Return the output lines to print. */
  readonly onSubmit: (line: string) => { output: readonly OutputLine[]; clear: boolean };
  /** Tab completion candidates. */
  readonly completions: () => readonly string[];
}

/** Handle returned by `mountTerminal`. */
export interface DojoTerminal {
  print(lines: readonly OutputLine[]): void;
  focus(): void;
  /** Stop accepting input (after the session ends). */
  lock(): void;
  dispose(): void;
}

/**
 * Mount an xterm.js terminal wired to the pure line editor.
 * Screen reader mode is always on so output is mirrored into an accessible live region.
 * @param container - element to render into
 * @param options - host name, aria label, submit handler and completions
 * @returns terminal handle
 */
export function mountTerminal(container: HTMLElement, options: DojoTerminalOptions): DojoTerminal {
  const term = new Terminal({
    screenReaderMode: true,
    convertEol: true,
    cursorBlink: true,
    // CJK fallbacks so Japanese messages render as proper double-width glyphs.
    fontFamily:
      '"JetBrains Mono", "Cascadia Mono", Menlo, Consolas, "Noto Sans Mono CJK JP", "Hiragino Kaku Gothic ProN", "MS Gothic", monospace',
    fontSize: 15,
    scrollback: 2000,
    theme: { background: '#0b1020', foreground: '#e6e9f2', cursor: '#7cf29a' },
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(container);
  container.setAttribute('aria-label', options.ariaLabel);
  fit.fit();

  const prompt = `\x1b[1;32moncall@${options.host}\x1b[0m:\x1b[1;34m~\x1b[0m$ `;
  let editor: LineEditorState = createEditor();
  let locked = false;

  const redraw = (): void => term.write(`\r\x1b[2K${prompt}${editor.buffer}`);
  const print = (lines: readonly OutputLine[]): void => {
    for (const line of lines) {
      const [open, close] = STYLE[line.kind];
      term.writeln(`${open}${line.text}${close}`);
    }
  };

  // ---- Input handling ----

  const handleData = (data: string): void => {
    if (locked) return;
    for (const event of parseTerminalData(data)) {
      const result = applyEvent(editor, event, options.completions());
      editor = result.state;
      if (result.submitted !== undefined) {
        term.write('\r\n');
        const { output, clear } = options.onSubmit(result.submitted);
        if (clear) term.clear();
        print(output);
        if (locked) return;
      } else if (result.cancelled) {
        term.write('^C\r\n');
      } else if (result.clearScreen) {
        term.clear();
      } else if (result.suggestions) {
        term.write('\r\n');
        term.writeln(result.suggestions.join('   '));
      }
      redraw();
    }
  };

  const dataSub = term.onData(handleData);
  const onResize = (): void => fit.fit();
  window.addEventListener('resize', onResize);
  redraw();

  return {
    print: (lines) => {
      term.write('\r\x1b[2K');
      print(lines);
      if (!locked) redraw();
    },
    focus: () => term.focus(),
    lock: () => {
      locked = true;
      term.options.cursorBlink = false;
    },
    dispose: () => {
      window.removeEventListener('resize', onResize);
      dataSub.dispose();
      term.dispose();
    },
  };
}
