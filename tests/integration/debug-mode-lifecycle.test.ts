import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema, type DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { runHookInProcess } from '../helpers/in-process-hook.js';
import { removeProject } from '../helpers/delegated-world.js';
import { createLightProject, snapshotTree } from '../helpers/light-world.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const SESSION = 'debug-e2e';
const E2E_TIMEOUT_MS = 120000;
const DEBUG_LINE = 'Debug mode:';
const TELEMETRY_HEADER = '[ContextBrake v3]';
let root: string;
beforeEach(async () => { root = await createLightProject('cb-e2e-debug-'); });
afterEach(async () => { await removeProject(root); });

async function postToolContext(toolUseId: string): Promise<string> {
  const environment = { CLAUDE_PROJECT_DIR: root };
  const payload = { session_id: SESSION, hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: join(root, 'CLAUDE.md') }, tool_response: 'short', tool_use_id: toolUseId };
  const result = await runHookInProcess({ harness: 'claude-code', projectRoot: root, event: 'PostToolUse', payload, environment });
  if (result.stdout.trim() === '') return '';
  return (JSON.parse(result.stdout) as { hookSpecificOutput?: { additionalContext?: string } }).hookSpecificOutput?.additionalContext ?? '';
}
async function doctorJson(): Promise<{ code: number | null; report: DoctorReport }> {
  const run = await runInProcessCli(['doctor', '--json'], root);
  return { code: run.code, report: doctorReportSchema.parse(JSON.parse(run.stdout)) };
}
function health(run: { code: number | null; report: DoctorReport }): unknown {
  return { code: run.code, status: run.report.status, exitCode: run.report.exitCode, findings: run.report.findings.map((f) => f.code).sort() };
}

describe('debug mode with the built CLI and Claude Code hook (TC-11, TC-12, FR-03, FR-06, NFR-02)', () => {
  it('reports the mode in doctor, injects telemetry at low usage, and leaves no debug line after remove', async () => {
    expect((await runInProcessCli(['init', '--yes', '--json'], root)).code).toBe(0);
    expect(await postToolContext('toolu_off')).toBe('');
    const baseline = await doctorJson();
    expect(baseline.report.debugMode).toBeUndefined();
    expect((await runInProcessCli(['init', '--debug', '--yes', '--json'], root)).code).toBe(0);
    const debug = await doctorJson();
    expect(debug.report.debugMode).toBe(true);
    expect(health(debug)).toEqual(health(baseline));
    const text = await runInProcessCli(['doctor'], root);
    expect(`${text.stdout}${text.stderr}`).toContain('  - debug mode: on\n');
    expect(text.code).toBe(baseline.code);
    expect(await postToolContext('toolu_on')).toContain(TELEMETRY_HEADER);
    expect((await runInProcessCli(['remove', '--yes'], root)).code).toBe(0);
    const leftovers = Object.entries(await snapshotTree(root)).filter(([, content]) => content.includes(DEBUG_LINE)).map(([path]) => path);
    expect(leftovers).toEqual([]);
  }, E2E_TIMEOUT_MS);
});
