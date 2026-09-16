import { appendFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { RuntimeStateReading } from '../../src/core/services/brake-session-checks.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';
import { renderIgnoreBlock } from '../../src/core/services/gitignore-markers.js';
import { renderProtocol } from '../../src/core/services/protocol-service.js';
import { renderJsonOutput } from '../../src/cli/output/json.js';
import { renderDoctorText } from '../../src/cli/output/text.js';
import { NodeBlockLog, NodeRuntimeErrorLog } from '../../src/infrastructure/runtime/node-runtime-logs.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { NodeRuntimeStateReader } from '../../src/infrastructure/runtime/runtime-state-reader.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

const NOW = '2026-09-15T12:00:00.000Z';
const CODEX_REASON = 'Hosted tools such as web search bypass Codex CLI hooks.';
const ANTIGRAVITY_REASON = 'Hook coverage in the Antigravity CLI is not confirmed by its documentation.';
const RUNTIME_CODES: readonly string[] = ['BRAKE_COOPERATIVE', 'BRAKE_BLOCKS_RECORDED', 'RUNTIME_ERRORS_RECORDED'];
const protocolSnapshot: FileSnapshot = { path: 'docs/context-brake-protocol.md', realPath: '/repo/docs/context-brake-protocol.md', exists: true, content: renderProtocol(DEFAULT_CONFIG), sha256: 'proto', isSymlink: false, fileIdentity: 'proto' };
const gitignoreSnapshot: FileSnapshot = { path: '.gitignore', realPath: '/repo/.gitignore', exists: true, content: `${renderIgnoreBlock('task_plan.json', 'state_checkpoint.json')}\n`, sha256: 'gitignore', isSymlink: false, fileIdentity: 'gitignore' };
async function seedRuntime(root: string, now: { value: string }) {
  const clock = { now: () => new Date(now.value) };
  const ledger = new NodeSessionLedger(root, clock);
  const sessions: readonly (readonly [SessionKey['harness'], string, string | null])[] = [
    ['codex-cli', 'codex-a', CODEX_REASON], ['codex-cli', 'codex-b', CODEX_REASON], ['codex-cli', 'codex-c', CODEX_REASON],
    ['antigravity-cli', 'antigravity-a', ANTIGRAVITY_REASON], ['claude-code', 'claude-a', null],
  ];
  for (const [harness, sessionId, brakeReason] of sessions) {
    await ledger.appendSessionLine({ harness, sessionId, agentId: null }, { brakeMode: brakeReason === null ? 'enforced' : 'cooperative', brakeReason });
  }
  const blocks = new NodeBlockLog(root, clock);
  for (const tool of ['Read', 'Bash']) await blocks.append({ harness: 'codex-cli', sessionId: 'codex-a', agentId: null }, { tool, zone: 'CRITICAL', turn: 12, percentage: 75, source: 'estimated', reason: 'critical_ceiling' });
  await appendFile(join(runtimeDirectory(root), 'blocks.jsonl'), 'not a json line\n', 'utf8');
  const errors = new NodeRuntimeErrorLog(root, clock);
  now.value = '2026-09-14T11:00:00.000Z';
  await errors.append('codex-cli', { event: 'PreToolUse', code: 'UNEXPECTED', detail: 'RuntimeFailure' });
  now.value = NOW;
  await errors.append('codex-cli', { event: 'PreToolUse', code: 'INVALID_CONFIG', detail: 'InvalidConfigurationError' });
  return clock;
}
function diagnoseAt(root: string, runtimeState?: RuntimeStateReading) {
  return diagnoseProject({
    projectRoot: root, config: DEFAULT_CONFIG, adapters: [], context: { projectRoot: root },
    sources: { 'claude-code': { project: [{ origin: 'project', kind: 'config', value: '.claude/settings.json' }] } },
    instructionSnapshots: [], protocolSnapshot, gitignoreSnapshot, manifest: null, allSnapshots: [], packageVersion: '1.0.0',
    ...(runtimeState ? { runtimeState } : {}),
  });
}
function captureStdout(render: () => void): string {
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  render();
  const output = spy.mock.calls.map((call) => String(call[0])).join('');
  spy.mockRestore();
  return output;
}
let tempDir: string;
beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t05-doctor-')); });
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('T05 doctor brake sessions (TC-19, CA-17, CA-18)', () => {
  it('reports cooperative brakes, recorded blocks, and recent errors with text and JSON parity', async () => {
    const runtimeState = await new NodeRuntimeStateReader(tempDir, await seedRuntime(tempDir, { value: NOW })).read();
    expect(runtimeState).not.toBeNull();
    const report = await diagnoseAt(tempDir, runtimeState ?? undefined);
    const codex = report.findings.find((f) => f.code === 'BRAKE_COOPERATIVE' && f.harness === 'codex-cli');
    expect(codex).toMatchObject({ severity: 'warning', scope: 'harness', impact: CODEX_REASON, path: null });
    for (const sessionId of ['codex-a', 'codex-b', 'codex-c']) expect(codex?.message).toContain(sessionId);
    const cooperative = report.findings.filter((f) => f.code === 'BRAKE_COOPERATIVE').map((f) => f.harness).sort();
    expect(cooperative).toEqual(['antigravity-cli', 'codex-cli']);
    const blocks = report.findings.find((f) => f.code === 'BRAKE_BLOCKS_RECORDED');
    expect(blocks).toMatchObject({ severity: 'ok', scope: 'project', path: '.context-brake/runtime/blocks.jsonl' });
    expect(blocks?.message).toContain('2');
    const errors = report.findings.find((f) => f.code === 'RUNTIME_ERRORS_RECORDED');
    expect(errors).toMatchObject({ severity: 'warning', scope: 'project', path: '.context-brake/runtime/errors.jsonl' });
    expect(errors?.message).toMatch(/1 runtime error .*INVALID_CONFIG/);
    expect(errors?.message).not.toContain('UNEXPECTED');
    expect(report.exitCode).toBe(1);
    const text = captureStdout(() => renderDoctorText(report));
    const parsed = doctorReportSchema.parse(JSON.parse(captureStdout(() => renderJsonOutput(report))));
    for (const finding of report.findings) expect(text).toContain(`${finding.code}: ${finding.message}`);
    expect(parsed.findings).toEqual(report.findings);
  });
});
describe('T05 doctor without runtime state (RF20, RF21)', () => {
  it('emits none of the runtime findings without a runtime directory', async () => {
    expect(await new NodeRuntimeStateReader(tempDir, { now: () => new Date(NOW) }).read()).toBeNull();
    const report = await diagnoseAt(tempDir);
    expect(report.findings.filter((f) => RUNTIME_CODES.includes(f.code))).toEqual([]);
    expect(report.status).toBe('healthy');
    expect(report.exitCode).toBe(0);
  });
});
