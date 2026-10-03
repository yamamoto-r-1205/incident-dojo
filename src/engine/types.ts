/** Game phase. Only moves forward: investigating -> recovered -> reported. */
export type Phase = 'investigating' | 'recovered' | 'reported';

/** How an input was handled. */
export type HistoryKind = 'rule' | 'builtin' | 'danger' | 'unknown';

/** One submitted (non-empty) input. */
export interface HistoryEntry {
  /** Normalized input. */
  readonly input: string;
  readonly kind: HistoryKind;
  /** Scenario rule id, when a rule handled the input. */
  readonly ruleId?: string;
  /** Global danger pattern id, when the safety net blocked the input. */
  readonly dangerId?: string;
  /** Penalty recorded for danger entries. */
  readonly penalty?: number;
}

/** Complete, serializable game state. */
export interface GameState {
  readonly scenarioId: string;
  readonly phase: Phase;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly history: readonly HistoryEntry[];
  /** Commands that count against par (rules, danger, unknown). Builtins are free. */
  readonly commandCount: number;
  readonly dangerPenalty: number;
  readonly hintsUsed: number;
  readonly reportedCause: string | null;
  /** History index of the command that recovered the service. */
  readonly recoveredAt: number | null;
}

/** Visual category of an output line. */
export type OutputKind = 'stdout' | 'info' | 'warn' | 'success' | 'error';

/** A line printed to the terminal. */
export interface OutputLine {
  readonly kind: OutputKind;
  readonly text: string;
}

/** Result of one engine step. */
export interface StepResult {
  readonly state: GameState;
  readonly output: readonly OutputLine[];
  /** True when the UI should clear the terminal (builtin `clear`). */
  readonly clear: boolean;
}
