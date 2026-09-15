import { describe, expect, it, vi } from 'vitest';
import { emitLegacyPreview } from '../../src/cli/commands/init.js';
import { findingPrintKey, renderInstallText } from '../../src/cli/output/text.js';
import type { DiagnosticFinding, InstallReport } from '../../src/core/contracts/diagnostics.js';

function legacyFinding(path: string): DiagnosticFinding {
  return { code: 'LEGACY_BLOCK_DETECTED', severity: 'warning', scope: 'file', harness: null, path, message: `Legacy block in ${path}`, impact: null, remediation: null };
}

function baseReport(findings: readonly DiagnosticFinding[]): InstallReport {
  return {
    schemaVersion: 1, command: 'init', mode: 'applied', status: 'warnings', exitCode: 1,
    detections: [], plan: { schemaVersion: 1, projectRoot: '/repo', changes: [], conflicts: [], harnesses: [], requiresConfirmation: false },
    outcomes: [], findings: [...findings],
  };
}

describe('emitLegacyPreview gating (FR-10, TC-06)', () => {
  it('prints and returns the printed pairs when about to request confirmation', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const findings = [legacyFinding('AGENTS.md')];
    const printed = emitLegacyPreview(findings, { json: false, yes: false, dryRun: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(printed.has(findingPrintKey('LEGACY_BLOCK_DETECTED', 'AGENTS.md'))).toBe(true);
    spy.mockRestore();
  });

  it('prints nothing with --yes, --dry-run, or --json', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const findings = [legacyFinding('AGENTS.md')];
    expect(emitLegacyPreview(findings, { json: false, yes: true, dryRun: false }).size).toBe(0);
    expect(emitLegacyPreview(findings, { json: false, yes: false, dryRun: true }).size).toBe(0);
    expect(emitLegacyPreview(findings, { json: true, yes: false, dryRun: false }).size).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('renderInstallText skips already-printed findings (FR-10, TC-06)', () => {
  it('prints a finding exactly once when it was not already printed', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    renderInstallText(baseReport([legacyFinding('AGENTS.md')]));
    const printedCount = spy.mock.calls.filter((call) => String(call[0]).includes('LEGACY_BLOCK_DETECTED')).length;
    expect(printedCount).toBe(1);
    spy.mockRestore();
  });

  it('skips a finding whose (code, path) pair was already printed by the preview', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const alreadyPrinted = new Set([findingPrintKey('LEGACY_BLOCK_DETECTED', 'AGENTS.md')]);
    renderInstallText(baseReport([legacyFinding('AGENTS.md')]), alreadyPrinted);
    const printedCount = spy.mock.calls.filter((call) => String(call[0]).includes('LEGACY_BLOCK_DETECTED')).length;
    expect(printedCount).toBe(0);
    spy.mockRestore();
  });
});
