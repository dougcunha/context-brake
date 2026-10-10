import { describe, expect, it } from 'vitest';
import { evaluateBudget, parseVitestReport, SLOWEST_FILE_COUNT, TEST_BUDGET_SECONDS, type VitestJsonReport } from '../../scripts/test-budget.js';

const ROOT = '/repo';
const OVER_BUDGET_SECONDS = TEST_BUDGET_SECONDS + 0.5;

function report(success: boolean, seconds: readonly number[]): VitestJsonReport {
  return { success, testResults: seconds.map((duration, index) => ({ name: `${ROOT}/tests/unit/file-${index}.test.ts`, startTime: 0, endTime: duration * 1000, assertionResults: [] })) };
}

describe('test budget evaluator (prd-13 FR-06, DEC-07, TC-07)', () => {
  it.each([
    { wallSeconds: TEST_BUDGET_SECONDS, exitCode: 0, stderr: [] },
    { wallSeconds: OVER_BUDGET_SECONDS, exitCode: 1, stderr: [`[ERROR] TEST_BUDGET_EXCEEDED: the run took ${OVER_BUDGET_SECONDS.toFixed(1)}s, above the ${TEST_BUDGET_SECONDS}s budget; speed up the slowest files listed above.`] },
  ])('exits $exitCode for a successful run of $wallSeconds s and prints the wall time first', ({ wallSeconds, exitCode, stderr }) => {
    const result = evaluateBudget({ report: report(true, [1]), wallSeconds, root: ROOT, vitestExitCode: 0 });
    expect(result).toEqual({ exitCode, stdout: [`Test run: ${wallSeconds.toFixed(1)}s wall (budget ${TEST_BUDGET_SECONDS}s)`, 'Slowest files:', '  1.0s tests/unit/file-0.test.ts'], stderr });
  });
});

describe('test budget report and failures (prd-13 FR-06, DEC-07, TC-07)', () => {
  it.each([
    { success: false, vitestExitCode: 0 },
    { success: true, vitestExitCode: 1 },
    { success: true, vitestExitCode: null },
  ])('fails with TEST_RUN_FAILED within the budget for success $success and Vitest exit code $vitestExitCode', ({ success, vitestExitCode }) => {
    const result = evaluateBudget({ report: report(success, [1]), wallSeconds: 10, root: ROOT, vitestExitCode });
    expect([result.exitCode, result.stderr]).toEqual([1, [`[ERROR] TEST_RUN_FAILED: the test run failed (Vitest exit code ${String(vitestExitCode)}); fix it before checking the budget.`]]);
  });
  it('lists the ten slowest files, slowest first, with paths relative to the root', () => {
    const seconds = Array.from({ length: SLOWEST_FILE_COUNT + 2 }, (_, index) => index + 1);
    const lines = evaluateBudget({ report: report(true, seconds), wallSeconds: 30, root: ROOT, vitestExitCode: 0 }).stdout;
    expect(lines[1]).toBe('Slowest files:');
    expect(lines.slice(2)).toHaveLength(SLOWEST_FILE_COUNT);
    expect(lines[2]).toBe('  12.0s tests/unit/file-11.test.ts');
    expect(lines.at(-1)).toBe('  3.0s tests/unit/file-2.test.ts');
  });
  it('names each failed test after TEST_RUN_FAILED', () => {
    const failed: VitestJsonReport = { success: false, testResults: [{ name: `${ROOT}/tests/unit/a.test.ts`, startTime: 0, endTime: 1, assertionResults: [{ fullName: 'a > breaks', status: 'failed' }, { fullName: 'a > works', status: 'passed' }] }] };
    expect(evaluateBudget({ report: failed, wallSeconds: 10, root: ROOT, vitestExitCode: 1 }).stderr.slice(1)).toEqual(['  failed: tests/unit/a.test.ts > a > breaks']);
  });
  it('rejects a report without test results', () => {
    expect(() => parseVitestReport({ success: true })).toThrow();
  });
});
