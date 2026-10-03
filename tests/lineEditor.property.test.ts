import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyEvent, createEditor, type LineEditorState, parseTerminalData } from '../src/ui/lineEditor.ts';

const printable = fc.string({
  unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 -_./|&;:=~*\'"`$あ日本語'.split('')),
  minLength: 1,
  maxLength: 60,
});

function feed(state: LineEditorState, data: string, completions: string[] = []) {
  let s = state;
  let submitted: string | undefined;
  let suggestions: readonly string[] | undefined;
  for (const ev of parseTerminalData(data)) {
    const r = applyEvent(s, ev, completions);
    s = r.state;
    submitted = r.submitted ?? submitted;
    suggestions = r.suggestions ?? suggestions;
  }
  return { state: s, submitted, suggestions };
}

describe('line editor', () => {
  it('Property 9: typing a printable line + Enter submits exactly that line and records it last in history (Validates: Requirements 11.1)', () => {
    fc.assert(
      fc.property(fc.array(printable, { maxLength: 5 }), printable, (previous, line) => {
        let state = createEditor();
        for (const p of previous) state = feed(state, `${p}\r`).state;
        const r = feed(state, `${line}\r`);
        expect(r.submitted).toBe(line);
        expect(r.state.buffer).toBe('');
        if (line.trim() !== '') expect(r.state.history.at(-1)).toBe(line);
      }),
      { numRuns: 300 },
    );
  });

  it('backspace removes one character (including multi-byte)', () => {
    expect(feed(createEditor(), 'df -h日\x7f').state.buffer).toBe('df -h');
  });

  it('up / down walk history and restore the draft', () => {
    let { state } = feed(createEditor(), 'one\rtwo\r');
    state = feed(state, 'dra').state;
    state = feed(state, '\x1b[A').state;
    expect(state.buffer).toBe('two');
    state = feed(state, '\x1b[A\x1b[A').state;
    expect(state.buffer).toBe('one');
    state = feed(state, '\x1b[B\x1b[B').state;
    expect(state.buffer).toBe('dra');
  });

  it('tab completes a unique candidate and lists ambiguous ones', () => {
    const cands = ['systemctl status app', 'systemctl status nginx', 'df -h'];
    expect(feed(createEditor(), 'df\t', cands).state.buffer).toBe('df -h ');
    const r = feed(createEditor(), 'sys\t', cands);
    expect(r.state.buffer).toBe('systemctl status ');
    expect(r.suggestions).toEqual(['systemctl status app', 'systemctl status nginx']);
  });

  it('pasted CRLF counts as a single Enter', () => {
    const events = parseTerminalData('ls\r\n');
    expect(events.filter((e) => e.type === 'enter')).toHaveLength(1);
  });

  it('Ctrl+C cancels the line, unknown escapes are ignored', () => {
    expect(feed(createEditor(), 'abc\x03').state.buffer).toBe('');
    expect(feed(createEditor(), 'a\x1b[3~b').state.buffer).toBe('ab');
  });
});
