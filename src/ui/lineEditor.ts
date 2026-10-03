/**
 * Pure line editor for the pseudo terminal: input buffer, history and Tab completion.
 * No xterm / DOM dependency so it can be property-tested.
 */

// ---- Types ----

/** Editor state. */
export interface LineEditorState {
  readonly buffer: string;
  readonly history: readonly string[];
  /** Index into history while browsing with Up/Down; null when editing a fresh line. */
  readonly historyIndex: number | null;
  /** Line being typed before history browsing started. */
  readonly draft: string;
}

/** Abstract key events produced from raw terminal data. */
export type EditorEvent =
  | { readonly type: 'insert'; readonly text: string }
  | { readonly type: 'backspace' | 'enter' | 'up' | 'down' | 'tab' | 'cancel' | 'clear' };

/** Result of applying one event. */
export interface EditorResult {
  readonly state: LineEditorState;
  /** Line submitted with Enter (may be blank). */
  readonly submitted?: string;
  /** Candidates to print when Tab is ambiguous. */
  readonly suggestions?: readonly string[];
  /** True when Ctrl+L was pressed. */
  readonly clearScreen?: boolean;
  /** True when Ctrl+C cancelled the line. */
  readonly cancelled?: boolean;
}

const MAX_HISTORY = 200;

// ---- State ----

/**
 * Create an empty editor.
 * @returns initial state
 */
export function createEditor(): LineEditorState {
  return { buffer: '', history: [], historyIndex: null, draft: '' };
}

/**
 * Apply one event.
 * @param state - current editor state
 * @param event - key event
 * @param completions - candidate commands for Tab completion
 * @returns next state plus side information for the terminal
 */
export function applyEvent(state: LineEditorState, event: EditorEvent, completions: readonly string[] = []): EditorResult {
  switch (event.type) {
    case 'insert':
      return { state: { ...state, buffer: state.buffer + event.text, historyIndex: null } };
    case 'backspace':
      return { state: { ...state, buffer: dropLastChar(state.buffer) } };
    case 'enter':
      return submit(state);
    case 'up':
      return { state: historyUp(state) };
    case 'down':
      return { state: historyDown(state) };
    case 'tab':
      return complete(state, completions);
    case 'cancel':
      return { state: { ...state, buffer: '', historyIndex: null, draft: '' }, cancelled: true };
    case 'clear':
      return { state, clearScreen: true };
  }
}

// ---- Raw input parsing ----

/**
 * Convert raw xterm `onData` text (keystrokes or pastes) into editor events.
 * Unknown escape sequences and control characters are ignored.
 * @param data - raw data
 * @returns events in order
 */
export function parseTerminalData(data: string): EditorEvent[] {
  const events: EditorEvent[] = [];
  let text = '';
  const flush = (): void => {
    if (text) events.push({ type: 'insert', text });
    text = '';
  };
  for (let i = 0; i < data.length; i += 1) {
    const ch = data[i] as string;
    const control = CONTROL_KEYS[ch];
    if (ch === '\x1b') {
      flush();
      i += consumeEscape(data, i, events);
    } else if (control) {
      flush();
      // Treat CRLF in pastes as a single Enter.
      if (!(ch === '\n' && data[i - 1] === '\r')) events.push(control);
    } else if (ch >= ' ' && ch !== '\x7f') {
      text += ch;
    }
  }
  flush();
  return events;
}

const CONTROL_KEYS: Record<string, EditorEvent> = {
  '\r': { type: 'enter' },
  '\n': { type: 'enter' },
  '\x7f': { type: 'backspace' },
  '\b': { type: 'backspace' },
  '\t': { type: 'tab' },
  '\x03': { type: 'cancel' },
  '\x0c': { type: 'clear' },
};

// Returns how many extra characters were consumed after ESC.
function consumeEscape(data: string, i: number, events: EditorEvent[]): number {
  if (data[i + 1] !== '[' && data[i + 1] !== 'O') return 0;
  const code = data[i + 2];
  if (code === 'A') events.push({ type: 'up' });
  if (code === 'B') events.push({ type: 'down' });
  // Skip parameters of longer CSI sequences such as ESC [ 3 ~
  let j = i + 2;
  while (j < data.length && /[0-9;]/.test(data[j] as string)) j += 1;
  return j - i;
}

// ---- Helpers ----

function dropLastChar(s: string): string {
  const chars = Array.from(s);
  chars.pop();
  return chars.join('');
}

function submit(state: LineEditorState): EditorResult {
  const line = state.buffer;
  const keep = line.trim() !== '' && state.history[state.history.length - 1] !== line;
  const history = keep ? [...state.history, line].slice(-MAX_HISTORY) : state.history;
  return { state: { buffer: '', history, historyIndex: null, draft: '' }, submitted: line };
}

function historyUp(state: LineEditorState): LineEditorState {
  if (state.history.length === 0) return state;
  const index = state.historyIndex === null ? state.history.length - 1 : Math.max(0, state.historyIndex - 1);
  const draft = state.historyIndex === null ? state.buffer : state.draft;
  return { ...state, historyIndex: index, draft, buffer: state.history[index] ?? '' };
}

function historyDown(state: LineEditorState): LineEditorState {
  if (state.historyIndex === null) return state;
  const index = state.historyIndex + 1;
  if (index >= state.history.length) return { ...state, historyIndex: null, buffer: state.draft };
  return { ...state, historyIndex: index, buffer: state.history[index] ?? '' };
}

function complete(state: LineEditorState, completions: readonly string[]): EditorResult {
  const prefix = state.buffer.replace(/^\s+/, '');
  if (prefix === '') return { state };
  const matches = [...new Set(completions.filter((c) => c.startsWith(prefix)))].sort();
  if (matches.length === 0) return { state };
  const common = longestCommonPrefix(matches);
  const buffer = matches.length === 1 ? `${common} ` : common;
  return {
    state: { ...state, buffer: buffer.length > prefix.length ? buffer : state.buffer },
    suggestions: matches.length > 1 ? matches : undefined,
  };
}

/**
 * Longest common prefix of a non-empty list.
 * @param items - strings
 * @returns shared prefix
 */
export function longestCommonPrefix(items: readonly string[]): string {
  let prefix = items[0] ?? '';
  for (const item of items) {
    while (!item.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}
