export const EXIT_CODES = { healthy: 0, warning: 1, error: 2, limitReached: 3, decisionRequired: 4, invalidArguments: 64, interrupted: 130 } as const;
export type Severity = 'ok' | 'warning' | 'error';
export function exitCodeForSeverities(severities: readonly Severity[]): number {
  if (severities.includes('error')) return EXIT_CODES.error;
  if (severities.includes('warning')) return EXIT_CODES.warning;
  return EXIT_CODES.healthy;
}
