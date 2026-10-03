import type { Locale, LocalizedText } from './schema.ts';

/**
 * Engine-level messages. Kept here (not in src/i18n) so the engine stays self-contained
 * and usable from Node (MCP server, validator).
 */
export const MESSAGES = {
  help: {
    ja: [
      'Dojo コマンド:',
      '  help            このヘルプを表示（手数に数えません）',
      '  hint            ヒントを1つ表示（-5点）',
      '  causes          原因候補の一覧を表示',
      '  report <id>     原因を報告してセッションを終了（復旧後のみ）',
      '  clear           画面をクリア',
      '',
      'そのほか systemctl / journalctl / df / free / ss / tail / aws などのコマンドが',
      'シナリオに応じて使えます。Tab で補完、↑↓ で履歴を呼び出せます。',
    ].join('\n'),
    en: [
      'Dojo commands:',
      '  help            Show this help (not counted)',
      '  hint            Show one hint (-5 pts)',
      '  causes          List root cause candidates',
      '  report <id>     Report the root cause and finish (after recovery only)',
      '  clear           Clear the screen',
      '',
      'Shell commands such as systemctl / journalctl / df / free / ss / tail / aws',
      'are available depending on the scenario. Tab completes, Up/Down recalls history.',
    ].join('\n'),
  },
  noMoreHints: { ja: 'これ以上のヒントはありません。', en: 'No more hints.' },
  hintPrefix: { ja: '💡 ヒント', en: '💡 Hint' },
  causesHeader: {
    ja: '原因候補（report <id> で報告）:',
    en: 'Root cause candidates (use report <id>):',
  },
  reportUsage: { ja: '使い方: report <id>   （候補は causes で確認）', en: 'Usage: report <id>   (see causes)' },
  reportUnknown: { ja: '不明な原因IDです: ', en: 'Unknown root cause id: ' },
  reportTooEarly: {
    ja: 'まだサービスが復旧していません。先に復旧させてから原因を報告してください。',
    en: 'The service is not recovered yet. Recover it first, then report the root cause.',
  },
  reportCorrect: { ja: '✅ 正解です。原因の特定に成功しました。', en: '✅ Correct. You identified the root cause.' },
  reportWrong: { ja: '❌ 不正解です。正しい原因: ', en: '❌ Incorrect. The actual root cause: ' },
  sessionClosed: {
    ja: 'セッションは終了しています。結果画面を確認してください。',
    en: 'The session has ended. Check the result screen.',
  },
  recovered: {
    ja: '✅ サービスが復旧しました。causes で原因候補を確認し、report <id> で報告してください。',
    en: '✅ Service recovered. Run causes to see candidates, then report <id>.',
  },
  dangerBlocked: {
    ja: '⛔ 危険な操作をブロックしました（-20点）。本番環境では重大事故につながります。',
    en: '⛔ Dangerous operation blocked (-20 pts). On a production system this could be catastrophic.',
  },
  dangerPrefix: { ja: '⚠ 危険な操作', en: '⚠ Dangerous operation' },
  commandNotFound: { ja: 'command not found', en: 'command not found' },
} as const satisfies Record<string, LocalizedText>;

/**
 * Pick the text for a locale.
 * @param text - bilingual text
 * @param locale - target locale
 * @returns the localized string
 */
export function t(text: LocalizedText, locale: Locale): string {
  return text[locale];
}
