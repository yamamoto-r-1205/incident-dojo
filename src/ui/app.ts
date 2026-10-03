import type { Locale, Scenario } from '../engine/schema.ts';
import type { GameState } from '../engine/types.ts';
import type { MessageKey } from '../i18n/index.ts';
import type { ScenarioCatalog } from '../scenarios.ts';
import type { KeyValueStore } from './storage.ts';

/** Navigation targets. */
export interface Navigator {
  title(): void;
  select(): void;
  briefing(scenario: Scenario): void;
  play(scenario: Scenario): void;
  result(scenario: Scenario, state: GameState): void;
}

/** Shared services passed to every screen. */
export interface AppContext {
  readonly catalog: ScenarioCatalog;
  readonly store: KeyValueStore;
  readonly go: Navigator;
  locale(): Locale;
  t(key: MessageKey, params?: Record<string, string | number>): string;
}

/** A rendered screen. */
export interface Screen {
  readonly element: HTMLElement;
  /** Called once the element is attached to the document (layout-dependent setup). */
  readonly onMount?: () => void;
  /** Element to focus after navigation (defaults to the screen heading). */
  readonly focusTarget?: () => void;
  /** Update texts in place after a language switch. If absent, the screen is rebuilt. */
  readonly relabel?: () => void;
  readonly dispose?: () => void;
}

/** Best result persisted per scenario. */
export interface BestResult {
  readonly score: number;
  readonly rank: string;
}

const bestKey = (id: string): string => `incident-dojo:best:${id}`;

/**
 * Read the stored best result for a scenario.
 * @param store - key-value store
 * @param id - scenario id
 * @returns best result or null when none / unreadable
 */
export function readBest(store: KeyValueStore, id: string): BestResult | null {
  const raw = store.get(bestKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BestResult>;
    return typeof parsed.score === 'number' && typeof parsed.rank === 'string'
      ? { score: parsed.score, rank: parsed.rank }
      : null;
  } catch (err) {
    console.warn(`Incident Dojo: ignoring corrupt best score for ${id}`, err);
    return null;
  }
}

/**
 * Store a result if it beats the previous best.
 * @param store - key-value store
 * @param id - scenario id
 * @param result - new result
 */
export function saveBest(store: KeyValueStore, id: string, result: BestResult): void {
  const previous = readBest(store, id);
  if (!previous || result.score > previous.score) store.set(bestKey(id), JSON.stringify(result));
}
