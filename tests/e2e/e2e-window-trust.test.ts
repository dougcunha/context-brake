import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UNTRUSTED_CRITICAL_ACTION } from '../../src/core/services/window-trust.js';
import { installedHookPath, runInstalledHookWithEnvironment } from '../helpers/built-hook.js';
import { removeProject } from '../helpers/delegated-world.js';
import { createLightProject } from '../helpers/light-world.js';
import { runBuiltCli } from './cli-runner.js';

const E2E_TIMEOUT_MS = 120000;
const SMALL_WINDOW = 16000;
let root: string;
beforeEach(async () => { root = await createLightProject('cb-e2e-window-'); });
afterEach(async () => { await removeProject(root); });

async function setTelemetry(fields: Record<string, number>): Promise<void> {
  const path = join(root, 'context-brake.config.json');
  const config = JSON.parse(await readFile(path, 'utf8')) as { telemetry: Record<string, unknown> };
  await writeFile(path, `${JSON.stringify({ ...config, telemetry: { ...config.telemetry, ...fields } }, null, 2)}\n`, 'utf8');
}
async function hook(harness: 'claude-code' | 'codex-cli', event: string, payload: Record<string, unknown>): Promise<string> {
  const environment = { ...process.env, CLAUDE_PROJECT_DIR: root };
  return (await runInstalledHookWithEnvironment({ hookPath: installedHookPath(harness, root), event, payload, environment })).stdout;
}
const codexPreTool = { session_id: 'codex-window', turn_id: 't1', cwd: '', hook_event_name: 'PreToolUse', model: 'gpt-5.6-sol', permission_mode: 'default', tool_name: 'apply_patch' };

describe('window trust in the built Codex hook (prd-09 FR-02, FR-05, TC-12)', () => {
  it('denies at CRITICAL only when the window is declared', async () => {
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(join(root, '.codex/hooks.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    expect((await runBuiltCli(['init', '--yes', '--json'], root)).code).toBe(0);
    await setTelemetry({ contextWindowCeiling: SMALL_WINDOW });
    expect(await hook('codex-cli', 'PreToolUse', { ...codexPreTool, cwd: root })).not.toContain('deny');
    await setTelemetry({ declaredContextWindow: SMALL_WINDOW });
    expect(await hook('codex-cli', 'PreToolUse', { ...codexPreTool, cwd: root })).toContain('deny');
  }, E2E_TIMEOUT_MS);
});

describe('window trust in the built Claude Code hook (prd-09 FR-02, FR-04, FR-06, TC-12)', () => {
  it('only warns without a bridge record and labels the block window=config', async () => {
    expect((await runBuiltCli(['init', '--yes', '--json'], root)).code).toBe(0);
    await setTelemetry({ contextWindowCeiling: SMALL_WINDOW, declaredContextWindow: SMALL_WINDOW });
    const bash = { session_id: 'claude-window', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_use_id: 'toolu_pre' };
    expect(await hook('claude-code', 'PreToolUse', bash)).not.toContain('deny');
    const post = await hook('claude-code', 'PostToolUse', { ...bash, hook_event_name: 'PostToolUse', tool_response: 'ok', tool_use_id: 'toolu_post' });
    expect(post).toContain('window=config zone=CRITICAL');
    expect(post).toContain(UNTRUSTED_CRITICAL_ACTION);
  }, E2E_TIMEOUT_MS);
});
