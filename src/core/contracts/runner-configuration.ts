import { z } from 'zod/mini';

const INTEGER_RULE = 'must be an integer';
const POSITIVE_RULE = 'must be greater than 0';
const SESSION_WITHIN_TOTAL_RULE = 'must be less than or equal to maxTotalMinutes';

export const RUNNER_DEFAULTS = {
  maxSessions: 20,
  maxTotalMinutes: 240,
  maxSessionMinutes: 30,
  maxTotalTokens: 5_000_000,
  validationTimeoutSeconds: 600,
  maxConsecutiveFailures: 2,
  criticalGraceSeconds: 120,
} as const;

type CustomIssue = { code: 'custom'; path: PropertyKey[]; input: unknown; message: string };

function positiveInteger(fallback: number): z.ZodMiniDefault<z.ZodMiniNumber<number>> {
  return z._default(z.int({ error: INTEGER_RULE }).check(z.positive(POSITIVE_RULE)), fallback);
}
function addIssue(ctx: z.core.ParsePayload, issue: CustomIssue): void {
  ctx.issues.push(issue);
}

export const runnerConfigurationSchema = z.strictObject({
  maxSessions: positiveInteger(RUNNER_DEFAULTS.maxSessions),
  maxTotalMinutes: positiveInteger(RUNNER_DEFAULTS.maxTotalMinutes),
  maxSessionMinutes: positiveInteger(RUNNER_DEFAULTS.maxSessionMinutes),
  maxTotalTokens: positiveInteger(RUNNER_DEFAULTS.maxTotalTokens),
  validationTimeoutSeconds: positiveInteger(RUNNER_DEFAULTS.validationTimeoutSeconds),
  maxConsecutiveFailures: positiveInteger(RUNNER_DEFAULTS.maxConsecutiveFailures),
  criticalGraceSeconds: positiveInteger(RUNNER_DEFAULTS.criticalGraceSeconds),
}).check((ctx) => {
  const runner = ctx.value;
  if (runner.maxSessionMinutes > runner.maxTotalMinutes) addIssue(ctx, { code: 'custom', path: ['maxSessionMinutes'], input: runner.maxSessionMinutes, message: SESSION_WITHIN_TOTAL_RULE });
});

export type RunnerConfiguration = z.infer<typeof runnerConfigurationSchema>;
