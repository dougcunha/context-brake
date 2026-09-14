import { describe, expect, it } from 'vitest';
import { cliErrorSchema, installReportSchema } from '../../src/core/contracts/diagnostics.js';

describe('closed install report contract (RF23)', () => {
  it('rejects arbitrary nested plan and outcome values', () => {
    const invalid = { schemaVersion: 1, command: 'init', mode: 'dry_run', status: 'success', exitCode: 0, detections: [], plan: { schemaVersion: 1, projectRoot: '.', changes: [42], conflicts: ['x'], harnesses: [null], requiresConfirmation: false }, outcomes: [{ anything: true }], findings: [] };
    expect(installReportSchema.safeParse(invalid).success).toBe(false);
  });
  it('accepts only the stable code-to-exit mappings', () => {
    expect(cliErrorSchema.safeParse({ schemaVersion: 1, command: 'init', status: 'error', exitCode: 64, error: { code: 'INVALID_ARGUMENTS', message: 'bad input' } }).success).toBe(true);
    expect(cliErrorSchema.safeParse({ schemaVersion: 1, command: 'init', status: 'error', exitCode: 999, error: { code: 'INVALID_ARGUMENTS', message: 'bad input' } }).success).toBe(false);
    expect(cliErrorSchema.safeParse({ schemaVersion: 1, command: 'init', status: 'error', exitCode: 64, error: { code: 'UNEXPECTED_ERROR', message: 'failed' } }).success).toBe(false);
  });
});
