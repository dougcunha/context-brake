import { relative } from 'node:path';
import { z } from 'zod';

export const TEST_BUDGET_SECONDS = 120;
export const SLOWEST_FILE_COUNT = 10;
const FAILED_STATUS = 'failed';
const MILLISECONDS_PER_SECOND = 1000;

const reportSchema = z.object({
  success: z.boolean(),
  testResults: z.array(z.object({
    name: z.string(),
    startTime: z.number(),
    endTime: z.number(),
    assertionResults: z.array(z.object({ fullName: z.string(), status: z.string() })).default([]),
  })),
});
export type VitestJsonReport = z.infer<typeof reportSchema>;
export type BudgetInput = { readonly report: VitestJsonReport; readonly wallSeconds: number; readonly root: string; readonly vitestExitCode: number | null };
export type BudgetResult = { readonly exitCode: 0 | 1; readonly stdout: readonly string[]; readonly stderr: readonly string[] };
type FileTime = { readonly path: string; readonly seconds: number };

export function parseVitestReport(value: unknown): VitestJsonReport {
  return reportSchema.parse(value);
}

export function evaluateBudget(input: BudgetInput): BudgetResult {
  const stdout = [`Test run: ${formatSeconds(input.wallSeconds)}s wall (budget ${TEST_BUDGET_SECONDS}s)`, 'Slowest files:', ...slowestFiles(input).map((file) => `  ${formatSeconds(file.seconds)}s ${file.path}`)];
  if (!input.report.success || input.vitestExitCode !== 0) {
    return { exitCode: 1, stdout, stderr: [`[ERROR] TEST_RUN_FAILED: the test run failed (Vitest exit code ${String(input.vitestExitCode)}); fix it before checking the budget.`, ...failedTests(input)] };
  }
  if (input.wallSeconds > TEST_BUDGET_SECONDS) {
    return { exitCode: 1, stdout, stderr: [`[ERROR] TEST_BUDGET_EXCEEDED: the run took ${formatSeconds(input.wallSeconds)}s, above the ${TEST_BUDGET_SECONDS}s budget; speed up the slowest files listed above.`] };
  }
  return { exitCode: 0, stdout, stderr: [] };
}

function slowestFiles(input: BudgetInput): FileTime[] {
  const files = input.report.testResults.map((result) => ({
    path: relativePath(input.root, result.name),
    seconds: (result.endTime - result.startTime) / MILLISECONDS_PER_SECOND,
  }));
  return [...files].sort((left, right) => right.seconds - left.seconds).slice(0, SLOWEST_FILE_COUNT);
}

function failedTests(input: BudgetInput): string[] {
  return input.report.testResults.flatMap((result) => result.assertionResults
    .filter((assertion) => assertion.status === FAILED_STATUS)
    .map((assertion) => `  failed: ${relativePath(input.root, result.name)} > ${assertion.fullName}`));
}

function relativePath(root: string, path: string): string {
  return relative(root, path).replaceAll('\\', '/');
}

function formatSeconds(seconds: number): string {
  return seconds.toFixed(1);
}
