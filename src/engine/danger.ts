/**
 * Global safety net: destructive commands that are blocked in every scenario,
 * even when the scenario author did not model them.
 */

/** Penalty applied when a global danger pattern blocks a command. */
export const GLOBAL_DANGER_PENALTY = 20;

interface DangerPattern {
  readonly id: string;
  readonly pattern: RegExp;
}

// Patterns are anchored on word boundaries and kept simple (no nested quantifiers) to avoid ReDoS.
const PATTERNS: readonly DangerPattern[] = [
  { id: 'rm-rf-root', pattern: /(^|[;&|] ?)(sudo )?rm (-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*|-r -f|-f -r)( --no-preserve-root)? (\/|\/\*|~|\/(etc|var|usr|home|boot|lib|bin))\/?( |$)/ },
  { id: 'mkfs', pattern: /(^|[;&|] ?)(sudo )?mkfs(\.[a-z0-9]+)? / },
  { id: 'dd-device', pattern: /(^|[;&|] ?)(sudo )?dd .*of=\/dev\// },
  { id: 'fork-bomb', pattern: /:\(\)\{ ?:\|:& ?\};:/ },
  { id: 'chmod-root', pattern: /(^|[;&|] ?)(sudo )?chmod -R [0-7]{3,4} \/( |$)/ },
  { id: 'kill-init', pattern: /(^|[;&|] ?)(sudo )?kill -9 1( |$)/ },
  { id: 'iptables-flush', pattern: /(^|[;&|] ?)(sudo )?iptables -F( |$)/ },
  { id: 'drop-database', pattern: /\bdrop (database|table)\b/i },
  { id: 'aws-terminate', pattern: /^aws ec2 terminate-instances( |$)/ },
  { id: 'aws-rds-delete', pattern: /^aws rds delete-db-(instance|cluster)( |$)/ },
  { id: 'aws-s3-rb-force', pattern: /^aws s3 rb .*--force/ },
];

/**
 * Check a normalized input against the global danger patterns.
 * @param input - normalized input
 * @returns the id of the first matching pattern, or null when the input is not dangerous
 */
export function matchGlobalDanger(input: string): string | null {
  const hit = PATTERNS.find((p) => p.pattern.test(input));
  return hit ? hit.id : null;
}
