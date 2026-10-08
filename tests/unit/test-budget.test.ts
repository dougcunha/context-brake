import { describe, expect, it } from 'vitest';
import { evaluateBudget, parseVitestReport, SLOWEST_FILE_COUNT, TEST_BUDGET_SECONDS, type VitestJsonReport } from '../../scripts/test-budget.js';

const ROOT = '/repo';

function report(success: boolean, seconds: readonly number[]): VitestJsonReport {
  return { success, testResults: seconds.map((duration, index) => ({ name: `${ROOT}/tests/unit/file-${index}.test.ts`, startTime: 0, endTime: duration * 1000, assertionResults: [] })) };
}

describe('test budget evaluator (prd-13 FR-06, DEC-07, TC-07)', () => {
  it('passes a successful run within the budget and prints the wall time first', () => {
    const result = evaluateBudget({ report: report(true, [1, 2]), wallSeconds: 59.94, root: ROOT, vitestExitCode: 0 });
    expect(result.exitCode).toBe(0);
    expect(result.stdout[0]).toBe(`Test run: 59.9s wall (budget ${TEST_BUDGET_SECONDS}s)`);
    expect(result.stderr).toEqual([]);
  });
  it('fails a successful run above the budget with TEST_BUDGET_EXCEEDED', () => {
    const result = evaluateBudget({ report: report(true, [1]), wallSeconds: TEST_BUDGET_SECONDS + 0.5, root: ROOT, vitestExitCode: 0 });
    expect(result.exitCode).toBe(1);
    expect(result.stderr[0]).toMatch(/^\[ERROR\] TEST_BUDGET_EXCEEDED: /);
    expect(result.stderr[0]).toContain(`the run took ${TEST_BUDGET_SECONDS}.5s`);
  });
  it('accepts a run at exactly the budget', () => {
    expect(evaluateBudget({ report: report(true, [1]), wallSeconds: TEST_BUDGET_SECONDS, root: ROOT, vitestExitCode: 0 }).exitCode).toBe(0);
  });
});

describe('test budget report and failures (prd-13 FR-06, DEC-07, TC-07)', () => {
  it('fails a run with test failures with TEST_RUN_FAILED even within the budget', () => {
    const result = evaluateBudget({ report: report(false, [1]), wallSeconds: 10, root: ROOT, vitestExitCode: 1 });
    expect(result.exitCode).toBe(1);
    expect(result.stderr[0]).toMatch(/^\[ERROR\] TEST_RUN_FAILED:/);
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
  it.each([[1], [null]])('fails a successful report when Vitest exits with %s', (vitestExitCode) => {
    const result = evaluateBudget({ report: report(true, [1]), wallSeconds: 10, root: ROOT, vitestExitCode });
    expect([result.exitCode, result.stderr[0]?.startsWith('[ERROR] TEST_RUN_FAILED:')]).toEqual([1, true]);
  });
  it('rejects a report without test results', () => {
    expect(() => parseVitestReport({ success: true })).toThrow();
  });
});
