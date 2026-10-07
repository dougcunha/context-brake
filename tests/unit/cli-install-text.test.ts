import { describe, expect, it, vi } from 'vitest';
import { renderInstallText } from '../../src/cli/output/text.js';
import type { InstallReport } from '../../src/core/contracts/diagnostics.js';

type PlannedFileChange = InstallReport['plan']['changes'][number];

function successReport(command: InstallReport['command'], change: PlannedFileChange): InstallReport {
  return {
    schemaVersion: 1, command, mode: 'applied', status: 'success', exitCode: 0, detections: [],
    plan: { schemaVersion: 1, projectRoot: '/test', requiresConfirmation: false, changes: [change], conflicts: [], harnesses: [] },
    outcomes: [], findings: [],
  };
}

function renderedStdout(report: InstallReport): string {
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  renderInstallText(report);
  const text = stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
  stdoutSpy.mockRestore();
  return text;
}

describe('CLI install text config summary', () => {
  it('prints the config summary under the config change for init (codereview_01 CR-02)', () => {
    const change: PlannedFileChange = { path: 'file.txt', realPath: '/test/file.txt', kind: 'create', owner: 'config', beforeSha256: null, afterSha256: 'abc', preview: { summary: 'create file' } };
    expect(renderedStdout(successReport('init', change))).toContain('    [create] file.txt (config)\n      create file\n');
  });
  it('prints no config summary line for remove (codereview_03 OI-04)', () => {
    const change: PlannedFileChange = { path: 'context-brake.config.json', realPath: '/test/context-brake.config.json', kind: 'delete', owner: 'config', beforeSha256: 'abc', afterSha256: null, preview: { summary: 'Delete configuration file' } };
    const text = renderedStdout(successReport('remove', change));
    expect(text).toContain('    [delete] context-brake.config.json (config)\n');
    expect(text).not.toContain('Delete configuration file');
  });
});
